import { ApiError } from '../errors';
import type { ExchangeRatesPayload, OpenExchangeRatesResponse } from '../types';

export function normalizeCurrencyCode(value: unknown, fieldName: string) {
  const code = String(value ?? '').trim().toUpperCase();

  if (!code || !/^[A-Z]{3}$/.test(code)) {
    throw new ApiError(400, `${fieldName} phải là mã tiền tệ 3 ký tự, ví dụ USD.`);
  }

  return code;
}

export async function fetchExchangeRates(base: string): Promise<ExchangeRatesPayload> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);

  if (!response.ok) {
    throw new ApiError(502, 'Không lấy được dữ liệu tỷ giá từ nhà cung cấp.');
  }

  const payload = (await response.json()) as OpenExchangeRatesResponse;

  if (payload.result !== 'success' || !payload.rates || !payload.base_code) {
    throw new ApiError(502, 'Nhà cung cấp tỷ giá trả dữ liệu không hợp lệ.');
  }

  const rates = Object.entries(payload.rates)
    .map(([currency, rate]) => ({ currency, rate: Number(rate) }))
    .filter((item) => Number.isFinite(item.rate))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return {
    base: payload.base_code,
    nextUpdateAt: payload.time_next_update_utc ?? null,
    provider: 'open.er-api.com',
    rates,
    updatedAt: payload.time_last_update_utc ?? new Date().toISOString(),
  };
}
