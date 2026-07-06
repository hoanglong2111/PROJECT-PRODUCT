import { ActionIcon, NumberInput, Select, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { formatMoney } from '@shared/utils/money';

export type ChargeLineState = {
  chargeCode: string | null;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string;
  currency: string | null;
};

export type FeeRow = {
  key: string;
  label?: ReactNode;
  subLabel?: ReactNode;
  state: ChargeLineState;
  enabled?: boolean;
};

type Props = {
  rows: FeeRow[];
  uoms: Uom[];
  chargeCodeOptions: { label: string; value: string }[];
  currencyOptions: { label: string; value: string }[];
  removable?: boolean;
  onChange: (key: string, patch: Partial<ChargeLineState>) => void;
  onRemove?: (key: string) => void;
};

export function QuotationFeeTable({
  chargeCodeOptions,
  currencyOptions,
  onChange,
  onRemove,
  removable = false,
  rows,
  uoms,
}: Props) {
  const { t } = useI18n();
  const uomOptions = uoms.map((uom) => ({
    label: `${uom.uom_code} - ${uom.uom_name_en}`,
    value: uom.uom_code,
  }));
  const gridClassName = ['rfq-fee-grid', removable ? 'has-remove' : ''].filter(Boolean).join(' ');

  return (
    <div className={gridClassName}>
      <div className="rfq-fee-header" aria-hidden="true">
        <span>{t('quotations.feeColumn')}</span>
        <span>{t('quotations.quantity')}</span>
        <span>{t('quotations.uom')}</span>
        <span>{t('quotations.unitPrice')}</span>
        <span>{t('quotations.lineCurrency')}</span>
        <span>{t('quotations.lineTotal')}</span>
        {removable ? <span /> : null}
      </div>

      {rows.map((row) => {
        const lineCurrency = row.state.currency;
        const total = Number(row.state.quantity) * Number(row.state.unitPrice);
        const showTotal = Number.isFinite(total) && Number(row.state.unitPrice) > 0;
        const formattedTotal = showTotal ? formatMoney(total, lineCurrency) : '-';

        return (
          <div
            className="rfq-fee-row"
            data-enabled="true"
            data-has-total={showTotal ? 'true' : undefined}
            key={row.key}
          >
            <div className="rfq-fee-cell rfq-fee-name">
              <span className="rfq-fee-cell-label">{t('quotations.feeColumn')}</span>
              <Select
                aria-label={t('quotations.feeColumn')}
                placeholder={t('quotations.selectChargeToAdd')}
                data={chargeCodeOptions}
                value={row.state.chargeCode}
                onChange={(value) => onChange(row.key, { chargeCode: value })}
                searchable
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-quantity tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.quantity')}</span>
              <NumberInput
                aria-label={t('quotations.quantity')}
                value={row.state.quantity}
                onChange={(value) => onChange(row.key, { quantity: value })}
                min={0}
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
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-currency">
              <span className="rfq-fee-cell-label">{t('quotations.lineCurrency')}</span>
              <Select
                aria-label={t('quotations.lineCurrency')}
                data={currencyOptions}
                value={row.state.currency}
                onChange={(value) => onChange(row.key, { currency: value })}
                searchable
                size="xs"
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

export function seedLineState(
  chargeCode: ChargeCode | null | undefined,
  defaultCurrency: string | null = null,
): ChargeLineState {
  return {
    chargeCode: chargeCode?.charge_code ?? null,
    quantity: 1,
    unit: chargeCode?.default_uom ?? null,
    unitPrice: '',
    currency: defaultCurrency,
  };
}
