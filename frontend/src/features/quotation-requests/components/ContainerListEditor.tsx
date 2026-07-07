import { ActionIcon, Button, Group, NumberInput, Select, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { Item } from '@shared/api/items';
import { useI18n } from '@shared/i18n';

import { newRfqContainerLine, rfqContainerLineAmount, type RfqContainerDraft, type RfqContainerLineDraft } from '../model/quotationRequestModel';

type Props = {
  containers: RfqContainerDraft[];
  containerTypeOptions: { value: string; label: string }[];
  items: Item[];
  itemOptions: { value: string; label: string }[];
  unitOptions: { value: string; label: string }[];
  onChange: (clientId: string, patch: Partial<RfqContainerDraft>) => void;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
};

const num = (value: unknown, fallback: number | '' = '') => {
  if (value === '' || value == null) return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export function ContainerListEditor({
  containers,
  containerTypeOptions,
  itemOptions,
  items,
  onAdd,
  onChange,
  onRemove,
  unitOptions,
}: Props) {
  const { t } = useI18n();

  const updateLine = (container: RfqContainerDraft, lineClientId: string, patch: Partial<RfqContainerLineDraft>) => {
    onChange(container.clientId, {
      lines: container.lines.map((line) => (line.clientId === lineClientId ? { ...line, ...patch } : line)),
    });
  };

  const addLine = (container: RfqContainerDraft) => {
    onChange(container.clientId, { lines: [...container.lines, newRfqContainerLine()] });
  };

  const removeLine = (container: RfqContainerDraft, lineClientId: string) => {
    if (container.lines.length === 1) return;
    onChange(container.clientId, { lines: container.lines.filter((line) => line.clientId !== lineClientId) });
  };

  return (
    <div className="rfq-container-list">
      {containers.map((container, index) => (
        <div className="rfq-container-card" key={container.clientId}>
          <div className="rfq-container-card-head">
            <Text size="xs" fw={800} c="dimmed" className="rfq-container-card-index">
              #{index + 1}
            </Text>
            <Select
              aria-label={t('quotationRequests.field.containerType')}
              placeholder={t('quotationRequests.field.containerType')}
              data={containerTypeOptions}
              value={container.container_type || null}
              searchable
              size="xs"
              onChange={(value) => onChange(container.clientId, { container_type: value ?? '' })}
            />
            <NumberInput
              aria-label={t('quotationRequests.field.containerQty')}
              placeholder={t('quotationRequests.field.containerQty')}
              value={container.qty}
              min={0}
              decimalScale={0}
              size="xs"
              styles={{ input: { textAlign: 'right' } }}
              onChange={(value) => onChange(container.clientId, { qty: num(value, 1) })}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label={t('quotationRequests.removeContainer')}
              disabled={containers.length === 1}
              onClick={() => onRemove(container.clientId)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </div>

          <div className="rfq-container-lines">
            <div className="rfq-container-line-header" role="row" aria-hidden="true">
              <span>{t('quotationRequests.field.containerItems')}</span>
              <span>{t('quotations.quantity')}</span>
              <span>{t('forms.unit')}</span>
              <span>{t('quotations.unitPrice')}</span>
              <span>{t('quotationRequests.field.lineWeight')}</span>
              <span />
            </div>
            {container.lines.map((line) => (
              <div className="rfq-container-line-row" role="row" key={line.clientId}>
                <div className="rfq-container-line-cell rfq-container-line-cell-item">
                  <span className="rfq-package-cell-label">{t('quotationRequests.field.containerItems')}</span>
                  <Select
                    aria-label={t('quotationRequests.field.containerItems')}
                    placeholder={t('quotationRequests.itemNotLinked')}
                    data={itemOptions}
                    value={line.item_id || null}
                    searchable
                    clearable
                    size="xs"
                    onChange={(value) => {
                      const item = items.find((candidate) => candidate.id === value);
                      updateLine(container, line.clientId, {
                        item_id: value ?? '',
                        item_description: item?.item_name_en ?? item?.item_name ?? line.item_description,
                        unit: line.unit || item?.base_uom || '',
                        unit_price: line.unit_price === '' && item?.unit_price_usd != null ? Number(item.unit_price_usd) : line.unit_price,
                      });
                    }}
                  />
                </div>
                <div className="rfq-container-line-cell rfq-container-line-cell-qty">
                  <span className="rfq-package-cell-label">{t('quotations.quantity')}</span>
                  <NumberInput
                    aria-label={t('quotations.quantity')}
                    value={line.qty}
                    min={0}
                    decimalScale={2}
                    size="xs"
                    styles={{ input: { textAlign: 'right' } }}
                    onChange={(value) => updateLine(container, line.clientId, { qty: num(value, 1) })}
                  />
                </div>
                <div className="rfq-container-line-cell rfq-container-line-cell-unit">
                  <span className="rfq-package-cell-label">{t('forms.unit')}</span>
                  <Select
                    aria-label={t('forms.unit')}
                    data={unitOptions}
                    value={line.unit || null}
                    searchable
                    size="xs"
                    onChange={(value) => updateLine(container, line.clientId, { unit: value ?? '' })}
                  />
                </div>
                <div className="rfq-container-line-cell rfq-container-line-cell-price">
                  <span className="rfq-package-cell-label">{t('quotations.unitPrice')}</span>
                  <NumberInput
                    aria-label={t('quotations.unitPrice')}
                    value={line.unit_price}
                    min={0}
                    thousandSeparator=","
                    decimalScale={2}
                    size="xs"
                    styles={{ input: { textAlign: 'right' } }}
                    onChange={(value) => updateLine(container, line.clientId, { unit_price: num(value) })}
                  />
                </div>
                <div className="rfq-container-line-cell rfq-container-line-cell-weight">
                  <span className="rfq-package-cell-label">{t('quotationRequests.field.lineWeight')}</span>
                  <NumberInput
                    aria-label={t('quotationRequests.field.lineWeight')}
                    value={line.gross_weight_kg}
                    min={0}
                    thousandSeparator=","
                    decimalScale={3}
                    size="xs"
                    styles={{ input: { textAlign: 'right' } }}
                    onChange={(value) => updateLine(container, line.clientId, { gross_weight_kg: num(value) })}
                  />
                </div>
                <div className="rfq-container-line-cell rfq-container-line-remove">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    aria-label={t('quotationRequests.removeContainerLine')}
                    disabled={container.lines.length === 1}
                    onClick={() => removeLine(container, line.clientId)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </div>
              </div>
            ))}
            <Group justify="space-between" align="center" mt={4}>
              <Button
                type="button"
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => addLine(container)}
              >
                {t('quotationRequests.addContainerLine')}
              </Button>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {container.lines.reduce((total, line) => total + rfqContainerLineAmount(line), 0).toLocaleString()}
              </Text>
            </Group>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="light"
        size="xs"
        className="rfq-add-package-button"
        leftSection={<IconPlus size={14} />}
        onClick={onAdd}
      >
        {t('quotationRequests.addContainer')}
      </Button>
    </div>
  );
}
