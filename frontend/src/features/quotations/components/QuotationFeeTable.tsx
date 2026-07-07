import { ActionIcon, NumberInput, Select, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { computeQuotationLineVnd } from '@shared/lib/quotationCharges';
import { formatMoney } from '@shared/utils/money';

import type { QuotationDraftChargeLineState as ChargeLineState } from '../model/quotationDraftLines';

export type FeeRow = {
  key: string;
  rowIndex: number;
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
  rateToVndOrNull: (code: string | null | undefined) => number | null;
  isTaxable: (chargeCode: string | null | undefined) => boolean;
  onChange: (rowIndex: number, patch: Partial<ChargeLineState>) => void;
  onRemove?: (rowIndex: number) => void;
};

export function QuotationFeeTable({
  chargeCodeOptions,
  currencyOptions,
  isTaxable,
  onChange,
  onRemove,
  rateToVndOrNull,
  removable = false,
  rows,
  uoms,
}: Props) {
  const { language, t } = useI18n();
  const uomOptions = uoms.map((uom) => ({
    label: `${uom.uom_code} - ${uom.uom_name_en}`,
    value: uom.uom_code,
  }));
  const gridClassName = ['rfq-fee-grid', removable ? 'has-remove' : ''].filter(Boolean).join(' ');
  const numberFormatter = new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US');
  const missingRateValue = (code: string | null) => (
    <Tooltip label={code ? t('quotations.missingRate', { code }) : t('quotations.missingRate', { code: '-' })}>
      <Text component="span" size="sm" c="yellow.7" fw={800} className="rfq-missing-rate">
        <IconAlertTriangle size={13} />
        —
      </Text>
    </Tooltip>
  );

  return (
    <div className={gridClassName}>
      <div className="rfq-fee-header" aria-hidden="true">
        <span>{t('quotations.feeColumn')}</span>
        <span>{t('quotations.quantity')}</span>
        <span>{t('quotations.uom')}</span>
        <span>{t('quotations.unitPrice')}</span>
        <span>{t('quotations.localCurrency')}</span>
        <span>{t('quotations.localAmount')}</span>
        <span>{t('quotations.exchangeRate')}</span>
        <span>{t('quotations.amountVnd')}</span>
        <span>{t('quotations.vatVnd')}</span>
        <span>{t('quotations.endpointCurrency')}</span>
        <span>{t('quotations.lineTotalEndpoint')}</span>
        {removable ? <span /> : null}
      </div>

      {rows.map((row) => {
        const lineCurrency = row.state.currency;
        const total = Number(row.state.quantity) * Number(row.state.unitPrice);
        const showTotal = Number.isFinite(total) && Number(row.state.unitPrice) > 0;
        const formattedTotal = showTotal ? formatMoney(total, lineCurrency) : '-';
        const vndBreakdown = computeQuotationLineVnd(
          {
            quantity: row.state.quantity,
            unitPrice: row.state.unitPrice,
            currency: row.state.currency,
            endpointCurrency: row.state.endpointCurrency,
            taxable: isTaxable(row.state.chargeCode),
          },
          rateToVndOrNull,
        );
        const showVndBreakdown = vndBreakdown.hasAmount && !vndBreakdown.missingRate;
        const missingRate = vndBreakdown.hasAmount && vndBreakdown.missingRate
          ? missingRateValue(vndBreakdown.missingRateCurrency)
          : '-';

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
                onChange={(value) => onChange(row.rowIndex, { chargeCode: value })}
                searchable
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-quantity tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.quantity')}</span>
              <NumberInput
                aria-label={t('quotations.quantity')}
                value={row.state.quantity}
                onChange={(value) => onChange(row.rowIndex, { quantity: value })}
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
                onChange={(value) => onChange(row.rowIndex, { unit: value })}
                searchable
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-price tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.unitPrice')}</span>
              <NumberInput
                aria-label={t('quotations.unitPrice')}
                value={row.state.unitPrice}
                onChange={(value) => onChange(row.rowIndex, { unitPrice: value })}
                min={0}
                thousandSeparator=","
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-currency">
              <span className="rfq-fee-cell-label">{t('quotations.localCurrency')}</span>
              <Select
                aria-label={t('quotations.localCurrency')}
                data={currencyOptions}
                value={row.state.currency}
                onChange={(value) => onChange(row.rowIndex, { currency: value })}
                searchable
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-total tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.localAmount')}</span>
              <Text size="sm" fw={700} c={showTotal ? undefined : 'dimmed'}>
                {formattedTotal}
              </Text>
            </div>

            <div className="rfq-fee-cell rfq-fee-exchange tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.exchangeRate')}</span>
              <Text size="sm" c={showVndBreakdown ? undefined : 'dimmed'}>
                {showVndBreakdown && vndBreakdown.exchangeRate ? numberFormatter.format(vndBreakdown.exchangeRate) : missingRate}
              </Text>
            </div>

            <div className="rfq-fee-cell rfq-fee-amount-vnd tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.amountVnd')}</span>
              <Text size="sm" fw={700} c={showVndBreakdown ? undefined : 'dimmed'}>
                {showVndBreakdown ? formatMoney(vndBreakdown.amountVnd, 'VND') : missingRate}
              </Text>
            </div>

            <div className="rfq-fee-cell rfq-fee-vat-vnd tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.vatVnd')}</span>
              <Text size="sm" c={showVndBreakdown ? undefined : 'dimmed'}>
                {showVndBreakdown ? formatMoney(vndBreakdown.vatVnd, 'VND') : missingRate}
              </Text>
            </div>

            <div className="rfq-fee-cell rfq-fee-endpoint-currency">
              <span className="rfq-fee-cell-label">{t('quotations.endpointCurrency')}</span>
              <Select
                aria-label={t('quotations.endpointCurrency')}
                data={currencyOptions}
                value={row.state.endpointCurrency ?? 'VND'}
                onChange={(value) => onChange(row.rowIndex, { endpointCurrency: value ?? 'VND' })}
                searchable
                size="xs"
              />
            </div>

            <div className="rfq-fee-cell rfq-fee-total-endpoint tabular-nums">
              <span className="rfq-fee-cell-label">{t('quotations.lineTotalEndpoint')}</span>
              <Text size="sm" fw={800} c={showVndBreakdown ? undefined : 'dimmed'}>
                {showVndBreakdown ? formatMoney(vndBreakdown.totalEndpoint, vndBreakdown.endpointCurrency) : missingRate}
              </Text>
            </div>

            {removable ? (
              <div className="rfq-fee-cell rfq-fee-remove">
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => onRemove?.(row.rowIndex)}
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
