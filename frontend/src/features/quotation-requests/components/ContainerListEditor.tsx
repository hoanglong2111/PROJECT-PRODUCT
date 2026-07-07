import { ActionIcon, Button, Group, NumberFormatter, NumberInput, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { Item } from '@shared/api/items';
import { useI18n } from '@shared/i18n';

import { newRfqContainerLine, rfqContainerLineAmount, type RfqContainerDraft, type RfqContainerLineDraft } from '../model/quotationRequestModel';

type Props = {
  containers: RfqContainerDraft[];
  activeId: string | null;
  onActiveChange: (clientId: string | null) => void;
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

const containerAmount = (container: RfqContainerDraft) =>
  container.lines.reduce((total, line) => total + rfqContainerLineAmount(line), 0);

const containerComplete = (container: RfqContainerDraft) =>
  Boolean(container.container_type) && container.lines.some((line) => line.item_id && Number(line.qty) > 0);

export function ContainerListEditor({
  activeId,
  containerTypeOptions,
  containers,
  itemOptions,
  items,
  onActiveChange,
  onAdd,
  onChange,
  onRemove,
  unitOptions,
}: Props) {
  const { t } = useI18n();
  const active = containers.find((container) => container.clientId === activeId) ?? containers[0] ?? null;
  const activeIndex = active ? containers.findIndex((container) => container.clientId === active.clientId) : -1;

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
    <div className="purchase-order-line-workspace">
      <div className="purchase-order-line-rail">
        <div className="purchase-order-line-rail-list">
          {containers.map((container, index) => {
            const amount = containerAmount(container);
            const isActive = active?.clientId === container.clientId;

            return (
              <div
                key={container.clientId}
                role="button"
                tabIndex={0}
                onClick={() => onActiveChange(container.clientId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onActiveChange(container.clientId);
                  }
                }}
                className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${containerComplete(container) ? '' : ' is-incomplete'}`}
              >
                <div className="purchase-order-line-rail-item-main">
                  <div className="purchase-order-line-rail-index">
                    #{index + 1}
                    {containerComplete(container) ? null : <span className="purchase-order-line-rail-dot" />}
                  </div>
                  <div className="purchase-order-line-rail-copy">
                    <Text fw={700} size="sm" lineClamp={1}>
                      {container.container_type || t('quotationRequests.field.containerType')}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {t('quotationRequests.field.containerQty')}: {container.qty || '-'} · {container.lines.length}{' '}
                      {t('quotationRequests.section.containerLines')}
                    </Text>
                  </div>
                </div>
                <div className="purchase-order-line-rail-side">
                  <Text fw={800} size="sm" className="tabular-nums">
                    <NumberFormatter value={amount} thousandSeparator decimalScale={2} />
                  </Text>
                </div>
                <ActionIcon
                  className="purchase-order-line-rail-delete"
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={t('quotationRequests.removeContainer')}
                  disabled={containers.length === 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(container.clientId);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </div>
            );
          })}
          <UnstyledButton type="button" className="purchase-order-line-rail-add" onClick={onAdd}>
            <IconPlus size={14} />
            <span>{t('quotationRequests.addContainer')}</span>
          </UnstyledButton>
        </div>
      </div>

      <div className="purchase-order-line-detail">
        {active ? (
          <Stack gap="sm">
            <Text fw={700}>{t('quotationRequests.editingContainer', { index: activeIndex + 1 })}</Text>
            <Group grow align="flex-end">
              <Select
                label={t('quotationRequests.field.containerType')}
                data={containerTypeOptions}
                value={active.container_type || null}
                searchable
                required
                onChange={(value) => onChange(active.clientId, { container_type: value ?? '' })}
              />
              <NumberInput
                label={t('quotationRequests.field.containerQty')}
                value={active.qty}
                min={0}
                decimalScale={0}
                onChange={(value) => onChange(active.clientId, { qty: num(value, 1) })}
              />
            </Group>

            <div className="rfq-container-lines">
              <div className="rfq-container-line-header" role="row" aria-hidden="true">
                <span>{t('quotationRequests.field.containerItems')}</span>
                <span>{t('quotations.quantity')}</span>
                <span>{t('forms.unit')}</span>
                <span>{t('quotations.unitPrice')}</span>
                <span>{t('quotationRequests.field.lineWeight')}</span>
                <span />
              </div>
              {active.lines.map((line) => (
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
                        updateLine(active, line.clientId, {
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
                      onChange={(value) => updateLine(active, line.clientId, { qty: num(value, 1) })}
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
                      onChange={(value) => updateLine(active, line.clientId, { unit: value ?? '' })}
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
                      onChange={(value) => updateLine(active, line.clientId, { unit_price: num(value) })}
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
                      onChange={(value) => updateLine(active, line.clientId, { gross_weight_kg: num(value) })}
                    />
                  </div>
                  <div className="rfq-container-line-cell rfq-container-line-remove">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={t('quotationRequests.removeContainerLine')}
                      disabled={active.lines.length === 1}
                      onClick={() => removeLine(active, line.clientId)}
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
                  onClick={() => addLine(active)}
                >
                  {t('quotationRequests.addContainerLine')}
                </Button>
                <Text size="xs" c="dimmed" className="tabular-nums">
                  <NumberFormatter value={containerAmount(active)} thousandSeparator decimalScale={2} />
                </Text>
              </Group>
            </div>
          </Stack>
        ) : null}
      </div>
    </div>
  );
}
