import { apiClient } from './axiosConfig';
import { currencyRateListSchema, parseContract } from './contracts';
import type { V1ApiError, V1Response } from './purchaseOrders';

export type CurrencyRateV1 = {
  code: string;
  vnd_rate: number;
};

export const STATIC_VND_RATE_FALLBACK_UPDATED_UTC = 'Tue, 07 Jul 2026 00:02:31 +0000';
export const STATIC_VND_RATE_FALLBACK_SOURCE = 'https://www.exchangerate-api.com';

// Temporary UI fallback for quote drafting while the mock/backend seed is being filled.
// Values are VND per 1 unit of the currency code.
export const STATIC_VND_RATE_FALLBACKS: CurrencyRateV1[] = [
  { code: 'VND', vnd_rate: 1 },
  { code: 'USD', vnd_rate: 26_221.78 },
  { code: 'EUR', vnd_rate: 29_980.18 },
  { code: 'CNY', vnd_rate: 3_855.13 },
  { code: 'JPY', vnd_rate: 161.734127 },
  { code: 'KRW', vnd_rate: 17.129429 },
  { code: 'GBP', vnd_rate: 35_057.35 },
  { code: 'SGD', vnd_rate: 20_288.46 },
  { code: 'AUD', vnd_rate: 18_215.54 },
  { code: 'CAD', vnd_rate: 18_450.67 },
  { code: 'THB', vnd_rate: 787.37 },
  { code: 'MYR', vnd_rate: 6_422.07 },
  { code: 'HKD', vnd_rate: 3_343.51 },
  { code: 'TWD', vnd_rate: 817.41 },
  { code: 'INR', vnd_rate: 274.7 },
  { code: 'IDR', vnd_rate: 1.455432 },
  { code: 'PHP', vnd_rate: 426.34 },
];

function unwrapV1Data<T, TMeta = Record<string, unknown>>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    throw new Error((apiResponse.errors[0] as V1ApiError).message || 'Request failed');
  }
  return apiResponse.data;
}

export function buildRateLookup(rates: CurrencyRateV1[]): (code: string | null | undefined) => number {
  const map = new Map(rates.map((rate) => [rate.code.toUpperCase(), Number(rate.vnd_rate) || 1]));
  return (code) => map.get((code ?? '').toUpperCase()) ?? 1;
}

export function buildRateLookupOrNull(
  rates: CurrencyRateV1[],
  fallbackRates: CurrencyRateV1[] = [],
): (code: string | null | undefined) => number | null {
  const map = new Map(
    [...fallbackRates, ...rates]
      .map((rate) => [rate.code.toUpperCase(), Number(rate.vnd_rate)] as const)
      .filter(([, rate]) => Number.isFinite(rate) && rate > 0),
  );

  return (code) => {
    const normalized = (code ?? '').trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'VND') return 1;
    return map.get(normalized) ?? null;
  };
}

export async function fetchCurrencyRates() {
  const response = await apiClient.get<V1Response<CurrencyRateV1[]>>('/v1/currency-rates');
  return parseContract(currencyRateListSchema, unwrapV1Data(response), 'fetchCurrencyRates');
}
