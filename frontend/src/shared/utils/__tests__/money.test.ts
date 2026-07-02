import { describe, expect, it } from 'vitest';

import {
  convertToBase,
  currencyFractionDigits,
  formatMoney,
  sumMoney,
} from '../money';

describe('money utilities', () => {
  it('uses ISO 4217 minor units from Intl', () => {
    expect(currencyFractionDigits('VND', 'en-US')).toBe(0);
    expect(currencyFractionDigits('KRW', 'en-US')).toBe(0);
    expect(currencyFractionDigits('USD', 'en-US')).toBe(2);
    expect(currencyFractionDigits('EUR', 'en-US')).toBe(2);
    expect(currencyFractionDigits('CNY', 'en-US')).toBe(2);
  });

  it('formats with grouping and ISO code suffix', () => {
    expect(formatMoney(1234.56, 'USD', { locale: 'en-US' })).toBe('1,234.56 USD');
    expect(formatMoney(1234.56, 'VND', { locale: 'en-US' })).toBe('1,235 VND');
    expect(formatMoney(1234, 'KRW', { locale: 'en-US' })).toBe('1,234 KRW');
  });

  it('sums in integer minor units', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2], 'USD', 'en-US')).toBe(0.3);
  });

  it('rounds exact half-cent values decimal-correctly (no IEEE-754 truncation)', () => {
    expect(1.005 * 100).toBe(100.49999999999999);
    expect(formatMoney(1.005, 'USD', { locale: 'en-US' })).toBe('1.01 USD');
    expect(formatMoney(1.015, 'USD', { locale: 'en-US' })).toBe('1.02 USD');
    expect(formatMoney(0.615, 'USD', { locale: 'en-US' })).toBe('0.62 USD');
  });

  it('rounds converted base currency once to VND minor units', () => {
    expect(convertToBase(12.345, 25000, 'VND', 'en-US')).toBe(308625);
    expect(convertToBase(12.3456, 25000.12, 'VND', 'en-US')).toBe(308641);
  });
});
