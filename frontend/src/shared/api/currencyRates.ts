import { apiClient } from './axiosConfig';
import { currencyRateListSchema, parseContract } from './contracts';
import type { V1ApiError, V1Response } from './purchaseOrders';

export type CurrencyRateV1 = {
  code: string;
  vnd_rate: number;
};

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

export async function fetchCurrencyRates() {
  const response = await apiClient.get<V1Response<CurrencyRateV1[]>>('/v1/currency-rates');
  return parseContract(currencyRateListSchema, unwrapV1Data(response), 'fetchCurrencyRates');
}
