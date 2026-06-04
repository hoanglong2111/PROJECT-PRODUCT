import { ApiError } from './errors';

export function normalizeCurrencyCode(value: unknown, fieldName: string) {
  const code = String(value ?? '').trim().toUpperCase();

  if (!code || !/^[A-Z]{3}$/.test(code)) {
    throw new ApiError(400, `${fieldName} phải là mã tiền tệ 3 ký tự, ví dụ USD.`);
  }

  return code;
}
