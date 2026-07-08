import type { ApiDecimal } from '@shared/api/purchaseOrders';
import type { QuotationChargeLineV1, QuotationV1 } from '@shared/api/quotations';
import { computeQuotationLineVnd, summarizeQuotationVndLines } from '@shared/lib/quotationCharges';

// Shared money path for the whole quotation feature: every screen (Create, List,
// Option rows, Detail hero, Charge Breakdown) must total charge lines the same way —
// source-currency amounts converted to internal VND, then to the quotation's customer
// payment currency (`quotation.currency_code`). Per-line `currency_code` stays the
// source/local fee currency; there is no persisted per-line settlement currency.
export type QuotationMoneyLine = {
  quantity: number | string | null | undefined;
  unitPrice: number | string | null | undefined;
  currency: string | null | undefined;
};

export type QuotationMoneySubtotal = {
  currency: string;
  amount: number;
};

export type QuotationMoneyTotals = {
  /** Internal VND-equivalent total, used for cross-currency comparisons. */
  totalVnd: number;
  /** Total in the customer payment currency, or null if its rate is unavailable. */
  customerPayTotal: number | null;
  /** Count of priced lines whose source or payment-currency rate is missing. */
  missingRateCount: number;
  /** Raw (unconverted) subtotal per source currency, for per-currency audit display. */
  subtotalsBySourceCurrency: QuotationMoneySubtotal[];
};

function numeric(value: ApiDecimal | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeQuotationMoneyTotals(
  lines: QuotationMoneyLine[],
  paymentCurrency: string | null | undefined,
  rateToVndOrNull: (code: string | null | undefined) => number | null,
): QuotationMoneyTotals {
  const normalizedPayment = (paymentCurrency || 'VND').trim().toUpperCase();
  const breakdowns = lines.map((line) =>
    computeQuotationLineVnd(
      {
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        currency: line.currency,
        endpointCurrency: normalizedPayment,
      },
      rateToVndOrNull,
    ),
  );
  const totals = summarizeQuotationVndLines(breakdowns);
  const paymentRate = normalizedPayment === 'VND' ? 1 : rateToVndOrNull(normalizedPayment);
  const customerPayTotal = paymentRate ? totals.totalVnd / paymentRate : null;

  const subtotalBuckets = new Map<string, number>();
  for (const line of lines) {
    const unitPrice = Number(line.unitPrice ?? 0);
    if (!line.currency || !(unitPrice > 0)) continue;
    const quantity = Number(line.quantity ?? 0);
    const currency = line.currency.trim().toUpperCase();
    subtotalBuckets.set(currency, (subtotalBuckets.get(currency) ?? 0) + quantity * unitPrice);
  }

  return {
    totalVnd: totals.totalVnd,
    customerPayTotal,
    missingRateCount: totals.missingRateCount,
    subtotalsBySourceCurrency: Array.from(subtotalBuckets, ([currency, amount]) => ({ currency, amount })),
  };
}

/** Shared + the given option's own charge lines (option_no === null lines are shared across options). */
export function selectOptionChargeLines(
  lines: QuotationChargeLineV1[],
  optionNo: number | null,
): QuotationChargeLineV1[] {
  return lines.filter((line) => line.option_no == null || line.option_no === optionNo);
}

export function computeOptionCustomerPayTotal(
  lines: QuotationChargeLineV1[],
  optionNo: number | null,
  paymentCurrency: string | null | undefined,
  rateToVndOrNull: (code: string | null | undefined) => number | null,
): number | null {
  const selected = selectOptionChargeLines(lines, optionNo);
  return computeQuotationMoneyTotals(
    selected.map((line) => ({ quantity: line.quantity, unitPrice: line.unit_price, currency: line.currency_code })),
    paymentCurrency,
    rateToVndOrNull,
  ).customerPayTotal;
}

export type QuotationChargeGroupKey = 'FREIGHT' | 'ORIGIN' | 'DESTINATION';

export type QuotationOptionCompareTotals = QuotationMoneyTotals & {
  /** Priced charge lines visible for this option (shared + own). */
  lineCount: number;
  /** VND-equivalent totals per charge group, so compare can diff Cước / Đầu Xuất / Đầu Nhập. */
  groupTotalsVnd: Record<QuotationChargeGroupKey, number>;
};

export function normalizeQuotationChargeGroup(group?: string | null): QuotationChargeGroupKey {
  if (group === 'ORIGIN') return 'ORIGIN';
  if (group === 'DESTINATION') return 'DESTINATION';
  return 'FREIGHT';
}

/**
 * Totals used by the compare popup for one option: overall money totals plus
 * per-charge-group VND totals, all through the same shared money path.
 */
export function computeOptionCompareTotals(
  lines: QuotationChargeLineV1[],
  optionNo: number | null,
  paymentCurrency: string | null | undefined,
  rateToVndOrNull: (code: string | null | undefined) => number | null,
): QuotationOptionCompareTotals {
  const selected = selectOptionChargeLines(lines, optionNo);
  const totals = computeQuotationMoneyTotals(
    selected.map((line) => ({ quantity: line.quantity, unitPrice: line.unit_price, currency: line.currency_code })),
    paymentCurrency,
    rateToVndOrNull,
  );

  const groupTotalsVnd: Record<QuotationChargeGroupKey, number> = { FREIGHT: 0, ORIGIN: 0, DESTINATION: 0 };
  for (const line of selected) {
    const group = normalizeQuotationChargeGroup(line.charge_group);
    const groupTotals = computeQuotationMoneyTotals(
      [{ quantity: line.quantity, unitPrice: line.unit_price, currency: line.currency_code }],
      paymentCurrency,
      rateToVndOrNull,
    );
    groupTotalsVnd[group] += groupTotals.totalVnd;
  }

  return { ...totals, lineCount: selected.length, groupTotalsVnd };
}

/** The option a quotation screen should default to: explicitly selected, else recommended, else the first. */
export function selectQuotationActiveOptionNo(
  quotation: Pick<QuotationV1, 'options' | 'selected_option_id'>,
): number | null {
  const options = quotation.options ?? [];
  const selected =
    options.find((option) => option.id === quotation.selected_option_id) ??
    options.find((option) => option.is_selected);
  const active = selected ?? options.find((option) => option.is_recommended) ?? options[0] ?? null;
  return active?.option_no ?? null;
}

export function computeQuotationCustomerPayTotal(
  quotation: Pick<QuotationV1, 'charge_lines' | 'currency_code' | 'options' | 'selected_option_id'> &
    Partial<Pick<QuotationV1, 'grand_total_amount' | 'total_amount'>>,
  rateToVndOrNull: (code: string | null | undefined) => number | null,
  optionNo: number | null = selectQuotationActiveOptionNo(quotation),
): QuotationMoneyTotals {
  const lines = selectOptionChargeLines(quotation.charge_lines ?? [], optionNo);
  if (lines.length === 0) {
    const apiTotal = numeric(quotation.grand_total_amount ?? quotation.total_amount);
    return computeQuotationMoneyTotals(
      apiTotal > 0 ? [{ quantity: 1, unitPrice: apiTotal, currency: quotation.currency_code }] : [],
      quotation.currency_code,
      rateToVndOrNull,
    );
  }

  return computeQuotationMoneyTotals(
    lines.map((line) => ({ quantity: line.quantity, unitPrice: line.unit_price, currency: line.currency_code })),
    quotation.currency_code,
    rateToVndOrNull,
  );
}
