import { ActionIcon, NumberInput, Select, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { Currency } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { computeQuotationLineVnd } from '@shared/lib/quotationCharges';
import { formatMoney } from '@shared/utils/money';
import { formatNumber } from '@shared/utils/number';

import type { QuotationDraftChargeLineState as ChargeLineState } from '../model/quotationDraftLines';
import { CurrencySelect } from './CurrencySelect';

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
  currencies: Currency[];
  removable?: boolean;
  /** Quotation-level customer payment currency; every row's "Tổng" is converted into it. */
  paymentCurrency: string;
  rateToVndOrNull: (code: string | null | undefined) => number | null;
  onChange: (rowIndex: number, patch: Partial<ChargeLineState>) => void;
  onRemove?: (rowIndex: number) => void;
};

export function QuotationFeeTable({
  chargeCodeOptions,
  currencies,
  onChange,
  onRemove,
  paymentCurrency,
  rateToVndOrNull,
  removable = false,
  rows,
  uoms,
}: Props) {
  const { t } = useI18n();
  const uomOptions = uoms.map((uom) => ({
    label: `${uom.uom_code} - ${uom.uom_name_en}`,
    value: uom.uom_code,
  }));
  const gridClassName = 'rfq-fee-grid';
  const inputClassName = ['rfq-fee-inputs', removable ? 'has-remove' : ''].filter(Boolean).join(' ');
  const missingRateValue = (code: string | null) => (
    <Tooltip label={code ? t('quotations.missingRate', { code }) : t('quotations.missingRate', { code: '-' })}>
      <Text component="span" size="sm" c="yellow.7" fw={700} className="rfq-missing-rate">
        <IconAlertTriangle size={13} />
        —
      </Text>
    </Tooltip>
  );

  return (
    <div className={gridClassName}>
      <div className={['rfq-fee-header', removable ? 'has-remove' : ''].filter(Boolean).join(' ')} aria-hidden="true">
        <span>{t('quotations.feeColumn')}</span>
        <span>{t('quotations.quantity')}</span>
        <span>{t('quotations.uom')}</span>
        <span>{t('quotations.unitPrice')}</span>
        <span>{t('quotations.localCurrency')}</span>
        {removable ? <span /> : null}
      </div>

      {rows.map((row) => {
        const lineCurrency = row.state.currency;
        const total = Number(row.state.quantity) * Number(row.state.unitPrice);
        const showTotal = Number.isFinite(total) && Number(row.state.unitPrice) > 0;
        const formattedTotal = showTotal ? formatMoney(total, lineCurrency) : '-';
        const outputCurrency = row.state.endpointCurrency ?? paymentCurrency;
        const vndBreakdown = computeQuotationLineVnd(
          {
            quantity: row.state.quantity,
            unitPrice: row.state.unitPrice,
            currency: row.state.currency,
            endpointCurrency: outputCurrency,
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
            <div className={inputClassName}>
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
                <CurrencySelect
                  aria-label={t('quotations.localCurrency')}
                  currencies={currencies}
                  value={row.state.currency}
                  onChange={(value) => onChange(row.rowIndex, { currency: value })}
                  searchable
                  size="xs"
                />
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

            <div className="rfq-fee-derived">
              <div className="rfq-fee-derived-item rfq-fee-total tabular-nums">
                <span className="rfq-fee-cell-label">{t('quotations.localAmount')}</span>
                <Text size="sm" fw={700} c={showTotal ? undefined : 'dimmed'}>
                  {formattedTotal}
                </Text>
              </div>

              <div className="rfq-fee-derived-item rfq-fee-exchange tabular-nums">
                <span className="rfq-fee-cell-label">{t('quotations.exchangeRate')}</span>
                <Text size="sm" c={showVndBreakdown ? undefined : 'dimmed'}>
                  {showVndBreakdown && vndBreakdown.exchangeRate ? formatNumber(vndBreakdown.exchangeRate) : missingRate}
                </Text>
              </div>

              <div className="rfq-fee-derived-item rfq-fee-amount-vnd tabular-nums">
                <span className="rfq-fee-cell-label">{t('quotations.amountVnd')}</span>
                <Text size="sm" fw={700} c={showVndBreakdown ? undefined : 'dimmed'}>
                  {showVndBreakdown ? formatMoney(vndBreakdown.amountVnd, 'VND') : missingRate}
                </Text>
              </div>

              <div className="rfq-fee-derived-item rfq-fee-output-currency">
                <span className="rfq-fee-cell-label">{t('quotations.endpointCurrency')}</span>
                <CurrencySelect
                  aria-label={t('quotations.endpointCurrency')}
                  currencies={currencies}
                  value={outputCurrency}
                  onChange={(value) => onChange(row.rowIndex, { endpointCurrency: value ?? paymentCurrency })}
                  searchable
                  size="xs"
                />
              </div>

              <div className="rfq-fee-derived-item rfq-fee-total-endpoint tabular-nums">
                <span className="rfq-fee-cell-label">
                  {t('quotations.lineTotalEndpoint')} ({vndBreakdown.endpointCurrency})
                </span>
                <Text size="sm" fw={700} c={showVndBreakdown ? undefined : 'dimmed'}>
                  {showVndBreakdown ? formatMoney(vndBreakdown.totalEndpoint, vndBreakdown.endpointCurrency) : missingRate}
                </Text>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
