import {
  ActionIcon,
  NumberFormatter,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { Item } from '@shared/api/items';
import { DateTimeField } from '@shared/components/DateField';
import { useI18n } from '@shared/i18n';

import { SummaryTile } from './SummaryTile';
import type { OrderLineDraft, OrderLineFields } from './types';

export type OrderLineItemsEditorProps = {
  lines: OrderLineDraft[];
  activeId: string | null;
  onActiveChange: (clientId: string | null) => void;
  onChange: (clientId: string, patch: Partial<OrderLineDraft>) => void;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
  items: Item[];
  itemOptions: { value: string; label: string }[];
  fields?: OrderLineFields;
  currencyCode?: string | null;
  onItemSelected?: (clientId: string, item: Item | undefined) => void;
  customsOptionsFor?: (item: Item | undefined) => { value: string; label: string }[];
  unitOptions?: { value: string; label: string }[];
};

const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const lineCbm = (line: Pick<OrderLineDraft, 'height_cm' | 'length_cm' | 'qty' | 'width_cm'>) => {
  const qty = num(line.qty);
  const length = num(line.length_cm);
  const width = num(line.width_cm);
  const height = num(line.height_cm);
  if ([qty, length, width, height].some((value) => value <= 0)) return 0;
  return (qty * length * width * height) / 1_000_000;
};

export function OrderLineItemsEditor({
  activeId,
  currencyCode,
  customsOptionsFor,
  fields = {},
  itemOptions,
  items,
  lines,
  onActiveChange,
  onAdd,
  onChange,
  onItemSelected,
  onRemove,
  unitOptions,
}: OrderLineItemsEditorProps) {
  const { t } = useI18n();
  const active = lines.find((line) => line.clientId === activeId) ?? lines[0] ?? null;
  const activeIndex = active ? lines.findIndex((line) => line.clientId === active.clientId) : -1;
  const activeItem = items.find((candidate) => candidate.id === active?.item_id);
  const activeAmount = active ? num(active.qty) * num(active.unit_price) : 0;
  const customsOptions = customsOptionsFor?.(activeItem) ?? [];
  const lineComplete = (line: OrderLineDraft) => Boolean(line.item_id) && num(line.qty) > 0;

  return (
    <div className="purchase-order-line-workspace">
      <div className="purchase-order-line-rail">
        <div className="purchase-order-line-rail-list">
          {lines.map((line, index) => {
            const item = items.find((candidate) => candidate.id === line.item_id);
            const amount = num(line.qty) * num(line.unit_price);
            const isActive = active?.clientId === line.clientId;

            return (
              <div
                key={line.clientId}
                role="button"
                tabIndex={0}
                data-line-id={line.clientId}
                onClick={() => onActiveChange(line.clientId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onActiveChange(line.clientId);
                  }
                }}
                className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${lineComplete(line) ? '' : ' is-incomplete'}`}
              >
                <div className="purchase-order-line-rail-item-main">
                  <div className="purchase-order-line-rail-index">
                    #{index + 1}
                    {lineComplete(line) ? null : <span className="purchase-order-line-rail-dot" />}
                  </div>
                  <div className="purchase-order-line-rail-copy">
                    <Text fw={700} size="sm" lineClamp={1}>
                      {item?.item_code ?? line.item_description ?? t('orderIntake.chooseItem')}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {item?.item_name ?? line.item_description ?? t('orderIntake.itemNotSelected')}
                    </Text>
                  </div>
                </div>
                <div className="purchase-order-line-rail-side">
                  <Text fw={800} size="sm" className="tabular-nums">
                    <NumberFormatter value={amount} thousandSeparator decimalScale={2} />
                  </Text>
                  {fields.dimensions ? (
                    <Text size="xs" c="dimmed" className="tabular-nums">
                      <NumberFormatter value={lineCbm(line)} thousandSeparator decimalScale={4} /> CBM
                    </Text>
                  ) : null}
                </div>
                <ActionIcon
                  className="purchase-order-line-rail-delete"
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={t('orderIntake.deleteLine')}
                  disabled={lines.length === 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(line.clientId);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </div>
            );
          })}
          <UnstyledButton type="button" className="purchase-order-line-rail-add" onClick={onAdd}>
            <IconPlus size={14} />
            <span>{t('orderIntake.addLine')}</span>
          </UnstyledButton>
        </div>
      </div>

      <div className="purchase-order-line-detail">
        {active ? (
          <Stack gap="sm">
            <Text fw={700}>{t('orderIntake.editingLine', { index: activeIndex + 1 })}</Text>
            <SummaryTile
              label={t('orderIntake.lineAmount')}
              tone="accent"
              value={
                <>
                  <NumberFormatter value={activeAmount} thousandSeparator decimalScale={2} />
                  {currencyCode ? ` ${currencyCode}` : ''}
                </>
              }
            />
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
              <Select
                label={t('orderIntake.item')}
                data={itemOptions}
                value={active.item_id || null}
                placeholder={t('orderIntake.chooseItem')}
                onChange={(value) => {
                  const item = items.find((candidate) => candidate.id === value);
                  onChange(active.clientId, {
                    item_id: value ?? '',
                    item_description: item?.item_name_en ?? item?.item_name ?? active.item_description,
                    unit: item?.base_uom ?? active.unit,
                  });
                  onItemSelected?.(active.clientId, item);
                }}
                searchable
                required
              />
              {fields.customsProfile ? (
                <Select
                  label={t('orderIntake.hsCode')}
                  data={customsOptions}
                  value={active.item_customs_profile_id || null}
                  onChange={(value) => onChange(active.clientId, { item_customs_profile_id: value ?? '' })}
                  searchable
                  clearable
                />
              ) : (
                <TextInput
                  label={t('orderIntake.itemDescription')}
                  value={active.item_description}
                  onChange={(event) => onChange(active.clientId, { item_description: event.currentTarget.value })}
                />
              )}
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
              <NumberInput
                label={t('quotations.quantity')}
                min={0}
                value={active.qty}
                thousandSeparator=","
                decimalScale={4}
                onChange={(value) => onChange(active.clientId, { qty: num(value, 1) })}
              />
              {unitOptions ? (
                <Select
                  label={t('forms.unit')}
                  data={unitOptions}
                  value={active.unit || null}
                  searchable
                  onChange={(value) => onChange(active.clientId, { unit: value ?? '' })}
                />
              ) : (
                <TextInput
                  label={t('forms.unit')}
                  value={active.unit}
                  onChange={(event) => onChange(active.clientId, { unit: event.currentTarget.value })}
                />
              )}
              <NumberInput
                label={t('orderIntake.grossKg')}
                min={0}
                value={active.gross_weight_kg}
                thousandSeparator=","
                decimalScale={3}
                onChange={(value) => onChange(active.clientId, { gross_weight_kg: num(value) })}
              />
              {fields.lineEta ? (
                <DateTimeField
                  label={t('orderIntake.lineEta')}
                  value={active.expected_eta_line ?? ''}
                  onChange={(value) => onChange(active.clientId, { expected_eta_line: value ?? '' })}
                />
              ) : null}
            </SimpleGrid>
            {fields.dimensions ? (
              <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
                <NumberInput
                  label={t('quotationRequests.field.length')}
                  min={0}
                  value={active.length_cm ?? ''}
                  thousandSeparator=","
                  decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { length_cm: num(value) })}
                />
                <NumberInput
                  label={t('quotationRequests.field.width')}
                  min={0}
                  value={active.width_cm ?? ''}
                  thousandSeparator=","
                  decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { width_cm: num(value) })}
                />
                <NumberInput
                  label={t('quotationRequests.field.height')}
                  min={0}
                  value={active.height_cm ?? ''}
                  thousandSeparator=","
                  decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { height_cm: num(value) })}
                />
                <NumberInput
                  label={t('quotationRequests.field.lineCbm')}
                  value={Number(lineCbm(active).toFixed(4))}
                  thousandSeparator=","
                  decimalScale={4}
                  readOnly
                />
              </SimpleGrid>
            ) : null}
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="sm">
              <NumberInput
                label={t('quotations.unitPrice')}
                min={0}
                value={active.unit_price}
                thousandSeparator=","
                decimalScale={2}
                onChange={(value) => onChange(active.clientId, { unit_price: num(value) })}
              />
              {fields.taxRate ? (
                <NumberInput
                  label={t('orderIntake.taxPct')}
                  min={0}
                  max={100}
                  suffix="%"
                  value={active.tax_rate ?? 0}
                  decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { tax_rate: num(value) })}
                />
              ) : null}
              {fields.discountPct ? (
                <NumberInput
                  label={t('orderIntake.discPct')}
                  min={0}
                  max={100}
                  suffix="%"
                  value={active.discount_pct ?? 0}
                  decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { discount_pct: num(value) })}
                />
              ) : null}
            </SimpleGrid>
            <Textarea
              label={t('orderIntake.lineNote')}
              value={active.note}
              autosize
              minRows={2}
              onChange={(event) => onChange(active.clientId, { note: event.currentTarget.value })}
            />
          </Stack>
        ) : null}
      </div>
    </div>
  );
}
