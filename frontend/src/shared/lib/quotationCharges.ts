import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationChargeTypeV1 } from '@shared/api/quotations';
import type { ShippingMode } from '@shared/model/logistics';
import { convertMoney, roundToMinorUnits, sumMoney } from '@shared/utils/money';

export type QuotationChargeModeFlag = 'sea_fcl' | 'sea_lcl' | 'air';

export type QuotationLineVndInput = {
  quantity: number | string | null | undefined;
  unitPrice: number | string | null | undefined;
  currency: string | null | undefined;
  endpointCurrency?: string | null | undefined;
};

export type QuotationLineVndBreakdown = {
  localAmount: number;
  exchangeRate: number | null;
  endpointCurrency: string;
  endpointRate: number | null;
  conversionRate: number | null;
  amountVnd: number;
  vatVnd: number;
  totalVnd: number;
  totalEndpoint: number;
  hasAmount: boolean;
  missingRate: boolean;
  missingRateCurrency: string | null;
};

export type QuotationEndpointTotal = {
  currency: string;
  total: number;
};

export type QuotationVndTotals = {
  subtotalVnd: number;
  taxVnd: number;
  totalVnd: number;
  missingRateCount: number;
  totalsByEndpoint: QuotationEndpointTotal[];
};

export function computeQuotationLineVnd(
  line: QuotationLineVndInput,
  rateToVnd: (code: string | null | undefined) => number | null,
): QuotationLineVndBreakdown {
  const quantity = Number(line.quantity ?? 0);
  const unitPrice = Number(line.unitPrice ?? 0);
  const localAmount = quantity * unitPrice;
  const sourceCurrency = line.currency?.trim().toUpperCase() ?? null;
  const hasAmount = Boolean(sourceCurrency) && Number.isFinite(localAmount) && unitPrice > 0;
  const endpointCurrency = (line.endpointCurrency || 'VND').trim().toUpperCase();
  const exchangeRate = hasAmount ? rateToVnd(sourceCurrency) : null;
  const endpointRate = hasAmount ? rateToVnd(endpointCurrency) : null;
  const missingRateCurrency = hasAmount && exchangeRate == null
    ? sourceCurrency
    : hasAmount && endpointRate == null
      ? endpointCurrency
      : null;
  const missingRate = Boolean(missingRateCurrency);
  const rateLookup = (code: string | null | undefined) => {
    const normalized = (code ?? '').trim().toUpperCase();
    if (normalized === 'VND') return 1;
    if (normalized === sourceCurrency) return exchangeRate ?? 0;
    if (normalized === endpointCurrency) return endpointRate ?? 0;
    return rateToVnd(normalized) ?? 0;
  };
  const amountVnd = hasAmount && !missingRate ? convertMoney(localAmount, sourceCurrency, 'VND', rateLookup) : 0;
  const vatVnd = 0;
  const totalVnd = amountVnd;
  const conversionRate = hasAmount && !missingRate && exchangeRate != null && endpointRate != null
    ? sourceCurrency === endpointCurrency
      ? 1
      : exchangeRate / endpointRate
    : null;

  return {
    localAmount: Number.isFinite(localAmount) ? localAmount : 0,
    exchangeRate,
    endpointCurrency,
    endpointRate,
    conversionRate,
    amountVnd,
    vatVnd,
    totalVnd,
    totalEndpoint: hasAmount && !missingRate && endpointRate ? roundToMinorUnits(totalVnd / endpointRate, endpointCurrency) : 0,
    hasAmount,
    missingRate,
    missingRateCurrency,
  };
}

export function summarizeQuotationVndLines(lines: QuotationLineVndBreakdown[]): QuotationVndTotals {
  const computableLines = lines.filter((line) => line.hasAmount && !line.missingRate);
  const subtotalVnd = sumMoney(computableLines.map((line) => line.amountVnd), 'VND');
  const endpointBuckets = new Map<string, number[]>();

  for (const line of computableLines) {
    const bucket = endpointBuckets.get(line.endpointCurrency) ?? [];
    bucket.push(line.totalEndpoint);
    endpointBuckets.set(line.endpointCurrency, bucket);
  }

  return {
    subtotalVnd,
    taxVnd: 0,
    totalVnd: subtotalVnd,
    missingRateCount: lines.filter((line) => line.hasAmount && line.missingRate).length,
    totalsByEndpoint: Array.from(endpointBuckets, ([currency, totals]) => ({
      currency,
      total: sumMoney(totals, currency),
    })),
  };
}

export function modeToChargeFlag(mode?: ShippingMode | string | null): QuotationChargeModeFlag {
  const normalized = (mode ?? '').trim().toUpperCase();
  if (normalized.includes('AIR')) return 'air';
  if (normalized.includes('LCL')) return 'sea_lcl';
  return 'sea_fcl';
}

export function chargeCodeToChargeType(code: ChargeCode, mode?: ShippingMode | string | null): QuotationChargeTypeV1 {
  if (code.group === 'MAIN_FREIGHT') {
    return modeToChargeFlag(mode) === 'air' ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT';
  }
  if (code.group === 'ORIGIN_EXPORT') {
    return 'ORIGIN_CHARGE';
  }
  if (code.group === 'DOCUMENTATION_FILING') {
    return 'DOCUMENT_FEE';
  }
  if (code.group === 'DESTINATION_IMPORT') {
    return code.category === 'CUSTOMS' ? 'CUSTOMS_FEE' : 'LOCAL_CHARGE';
  }
  if (code.group === 'ANCILLARY_ACCESSORIAL') {
    if (code.charge_code === 'DEM') return 'DEMURRAGE';
    if (code.charge_code === 'DET') return 'DETENTION';
    if (code.charge_code === 'STO') return 'WAREHOUSE';
  }
  return 'OTHER';
}
