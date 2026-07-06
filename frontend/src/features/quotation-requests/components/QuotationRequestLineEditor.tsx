import { ActionIcon, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import type { Item } from '@shared/api/items';
import type { CreateQuotationRequestLinePayload } from '@shared/api/quotationRequests';
import { useI18n } from '@shared/i18n';

type QuotationRequestLineEditorProps = {
  lines: CreateQuotationRequestLinePayload[];
  items: Item[];
  onChange: (lines: CreateQuotationRequestLinePayload[]) => void;
};

export function QuotationRequestLineEditor({ items, lines, onChange }: QuotationRequestLineEditorProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const itemOptions = useMemo(
    () => items.map((item) => ({
      value: item.id,
      label: `${item.item_code} - ${item.item_name_en ?? item.item_name}`,
    })),
    [items],
  );
  const activeLine = lines[activeIndex] ?? lines[0] ?? createEmptyLine(0);
  const activeItem = items.find((item) => item.id === activeLine.item_id);

  const updateLine = (index: number, patch: Partial<CreateQuotationRequestLinePayload>) => {
    onChange(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    const next = [...lines, createEmptyLine(lines.length)];
    onChange(next);
    setActiveIndex(next.length - 1);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    const next = lines
      .filter((_, lineIndex) => lineIndex !== index)
      .map((line, lineIndex) => ({ ...line, line_no: lineIndex + 1 }));
    onChange(next);
    setActiveIndex(Math.max(0, Math.min(index, next.length - 1)));
  };

  return (
    <Paper withBorder p="md" className="purchase-order-lines-panel">
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <Text fw={800}>{t('quotationRequests.field.lines')}</Text>
          <Text size="xs" c="dimmed">{t('quotationRequests.linesHint')}</Text>
        </div>
        <Tooltip label={t('quotationRequests.addLine')}>
          <ActionIcon variant="light" onClick={addLine} aria-label={t('quotationRequests.addLine')}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <div className="purchase-order-line-workspace">
        <div className="purchase-order-line-rail">
          <Group justify="space-between" className="purchase-order-line-rail-header">
            <Text size="xs" fw={800} c="dimmed">{t('quotationRequests.lines')}</Text>
            <Text size="xs" c="dimmed" className="tabular-nums">
              {activeIndex + 1}/{lines.length}
            </Text>
          </Group>
          <div className="purchase-order-line-rail-list">
            {lines.map((line, index) => {
              const item = items.find((candidate) => candidate.id === line.item_id);
              const isActive = index === activeIndex;
              const isComplete = Boolean(line.item_id) && Number(line.qty ?? 0) > 0;

              return (
                <button
                  className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${isComplete ? '' : ' is-incomplete'}`}
                  key={`${line.line_no}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="purchase-order-line-rail-item-main">
                    <div className="purchase-order-line-rail-index">
                      #{index + 1}
                      {isComplete ? null : <span className="purchase-order-line-rail-dot" />}
                    </div>
                    <div>
                      <Text size="sm" fw={700} lineClamp={1}>
                        {item?.item_code ?? t('quotationRequests.itemRequired')}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {line.item_description || item?.item_name_en || item?.item_name || '-'}
                      </Text>
                    </div>
                  </div>
                  <Text size="xs" className="tabular-nums" c="dimmed">
                    {line.qty ?? 0} {line.unit ?? ''}
                  </Text>
                </button>
              );
            })}
          </div>
        </div>

        <div className="purchase-order-line-editor">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={800}>{t('quotationRequests.lineDetail')}</Text>
              <Tooltip label={t('quotationRequests.removeLine')}>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(activeIndex)}
                  aria-label={t('quotationRequests.removeLine')}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <Select
              label={t('quotationRequests.field.item')}
              data={itemOptions}
              value={activeLine.item_id ?? null}
              onChange={(value) => {
                const item = items.find((candidate) => candidate.id === value);
                updateLine(activeIndex, {
                  item_id: value,
                  item_description: item?.item_name_en ?? item?.item_name ?? activeLine.item_description,
                  unit: item?.base_uom ?? activeLine.unit ?? 'PCS',
                  unit_price: numberOrNull(item?.unit_price_usd) ?? activeLine.unit_price ?? null,
                });
              }}
              searchable
              required
            />
            <TextInput
              label={t('quotationRequests.field.itemDescription')}
              value={activeLine.item_description ?? ''}
              onChange={(event) => updateLine(activeIndex, { item_description: event.currentTarget.value })}
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <NumberInput
                label={t('quotations.quantity')}
                value={activeLine.qty ?? 0}
                min={0}
                onChange={(value) => updateLine(activeIndex, { qty: numberOrZero(value) })}
              />
              <TextInput
                label={t('forms.unit')}
                value={activeLine.unit ?? activeItem?.base_uom ?? ''}
                onChange={(event) => updateLine(activeIndex, { unit: event.currentTarget.value })}
              />
              <NumberInput
                label={t('quotationRequests.field.unitPrice')}
                value={activeLine.unit_price ?? ''}
                min={0}
                decimalScale={4}
                onChange={(value) => updateLine(activeIndex, { unit_price: numberOrNull(value) })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label={t('quotationRequests.field.lineWeight')}
                value={activeLine.gross_weight_kg ?? ''}
                min={0}
                thousandSeparator=","
                onChange={(value) => updateLine(activeIndex, { gross_weight_kg: numberOrNull(value) })}
              />
              <Textarea
                label={t('quotationRequests.field.lineNote')}
                value={activeLine.note ?? ''}
                minRows={1}
                autosize
                onChange={(event) => updateLine(activeIndex, { note: event.currentTarget.value })}
              />
            </SimpleGrid>
          </Stack>
        </div>
      </div>
    </Paper>
  );
}

export function createEmptyLine(index: number): CreateQuotationRequestLinePayload {
  return {
    line_no: index + 1,
    item_id: null,
    item_description: null,
    qty: 1,
    unit: 'PCS',
    unit_price: null,
    gross_weight_kg: null,
    note: null,
  };
}

function numberOrNull(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}
