import { ActionIcon, Checkbox, NumberInput, Select, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';

export type ChargeLineState = {
  chargeCode: string | null;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string;
};

export type FeeRow = {
  key: string;
  label: ReactNode;
  subLabel?: ReactNode;
  state: ChargeLineState;
  enabled: boolean;
};

type Props = {
  rows: FeeRow[];
  uoms: Uom[];
  chargeCodeOptions: { label: string; value: string }[];
  currency: string | null;
  editableFee?: boolean;
  removable?: boolean;
  onToggle?: (key: string, enabled: boolean) => void;
  onChange: (key: string, patch: Partial<ChargeLineState>) => void;
  onRemove?: (key: string) => void;
};

export function QuotationFeeTable({
  chargeCodeOptions,
  currency,
  editableFee = false,
  onChange,
  onRemove,
  onToggle,
  removable = false,
  rows,
  uoms,
}: Props) {
  const { t } = useI18n();
  const uomOptions = uoms.map((u) => ({
    label: `${u.uom_code} - ${u.uom_name_en}`,
    value: u.uom_code,
  }));
  const showToggle = Boolean(onToggle) && !editableFee;
  const gridClassName = [
    'rfq-fee-grid',
    showToggle ? 'has-toggle' : '',
    removable ? 'has-remove' : '',
    editableFee ? 'is-editable-fee' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClassName}>
      <div className="rfq-fee-header" aria-hidden="true">
        {showToggle ? <span /> : null}
        <span>{t('quotations.feeColumn')}</span>
        <span>{t('quotations.quantity')}</span>
        <span>{t('quotations.uom')}</span>
        <span>{t('quotations.unitPrice')}</span>
        <span>{t('quotations.lineTotal')}</span>
        {removable ? <span /> : null}
      </div>

      {rows.map((row) => {
        const total = Number(row.state.quantity) * Number(row.state.unitPrice);
        const showTotal = row.enabled && Number.isFinite(total) && Number(row.state.unitPrice) > 0;
        const formattedTotal = showTotal
          ? `${new Intl.NumberFormat('en-US').format(Math.round(total))}${currency ? ` ${currency}` : ''}`
          : '-';

        return (
          <div className="rfq-fee-row" data-disabled={showToggle && !row.enabled ? 'true' : undefined} key={row.key}>
            {showToggle ? (
              <div className="rfq-fee-cell rfq-fee-toggle">
                <Checkbox
                  aria-label={`${t('quotations.includeFee')}: ${textLabel(row.label)}`}
                  checked={row.enabled}
                  onChange={(event) => onToggle?.(row.key, event.currentTarget.checked)}
                />
              </div>
            ) : null}

            <div className="rfq-fee-cell rfq-fee-name">
              <span className="rfq-fee-cell-label">{t('quotations.feeColumn')}</span>
              {editableFee ? (
                <Select
                  aria-label={t('quotations.feeColumn')}
                  placeholder={t('quotations.selectChargeToAdd')}
                  data={chargeCodeOptions}
                  value={row.state.chargeCode}
                  onChange={(value) => onChange(row.key, { chargeCode: value })}
                  searchable
                  size="xs"
                />
              ) : (
                <div className="rfq-fee-name-stack">
                  <Text size="sm" fw={700} className="rfq-fee-name-text" title={textLabel(row.label)}>
                    {row.label}
                  </Text>
                  {row.subLabel ? <span className="rfq-fee-code">{row.subLabel}</span> : null}
                </div>
              )}
            </div>

            <div className="rfq-fee-cell rfq-fee-quantity tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.quantity')}</span>
              <NumberInput
                aria-label={t('quotations.quantity')}
                value={row.state.quantity}
                onChange={(value) => onChange(row.key, { quantity: value })}
                min={0}
                disabled={!row.enabled}
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-uom">
              <span className="rfq-fee-cell-label">{t('quotations.uom')}</span>
              <Select
                aria-label={t('quotations.uom')}
                data={uomOptions}
                value={row.state.unit}
                onChange={(value) => onChange(row.key, { unit: value })}
                searchable
                disabled={!row.enabled}
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-price tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.unitPrice')}</span>
              <NumberInput
                aria-label={t('quotations.unitPrice')}
                value={row.state.unitPrice}
                onChange={(value) => onChange(row.key, { unitPrice: value })}
                min={0}
                thousandSeparator=","
                disabled={!row.enabled}
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-total tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.lineTotal')}</span>
              <Text size="sm" fw={700} c={showTotal ? undefined : 'dimmed'}>
                {formattedTotal}
              </Text>
            </div>

            {removable ? (
              <div className="rfq-fee-cell rfq-fee-remove">
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => onRemove?.(row.key)}
                  title={t('quotations.removeFee')}
                  aria-label={t('quotations.removeFee')}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Seed the initial state when a charge code is selected. */
export function seedLineState(chargeCode: ChargeCode | null | undefined): ChargeLineState {
  return {
    chargeCode: chargeCode?.charge_code ?? null,
    quantity: 1,
    unit: chargeCode?.default_uom ?? null,
    unitPrice: '',
  };
}

function textLabel(label: ReactNode) {
  return typeof label === 'string' || typeof label === 'number' ? String(label) : '';
}
