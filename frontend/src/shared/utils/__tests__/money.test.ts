import { describe, expect, it } from 'vitest';

import {
  convertMoney,
  convertToBase,
  currencyDecimalScale,
  currencyFractionDigits,
  formatMoney,
  formatUnitPrice,
  setMoneyLocale,
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

  it('exposes ISO minor units for input decimalScale', () => {
    expect(currencyDecimalScale('VND', 'en-US')).toBe(0);
    expect(currencyDecimalScale('USD', 'en-US')).toBe(2);
  });

  it('never throws on a non-ISO-4217 currency code (bad master data)', () => {
    expect(currencyFractionDigits('XYZ', 'en-US')).toBe(2);
    expect(formatMoney(100, 'XYZ', { locale: 'en-US' })).toBe('100.00 XYZ');
  });

  it('formats unit prices with extra precision, not rounded to settlement minor units', () => {
    // Keeps up to 6 digits (unit price / rate), min = currency minor unit.
    expect(formatUnitPrice(1.2345, 'USD', { locale: 'en-US' })).toBe('1.2345 USD');
    expect(formatUnitPrice(1.2, 'USD', { locale: 'en-US' })).toBe('1.20 USD');
    expect(formatUnitPrice(1.23456789, 'USD', { locale: 'en-US' })).toBe('1.234568 USD');
    // VND has 0 minor units but a unit price may still carry decimals.
    expect(formatUnitPrice(1234.5, 'VND', { locale: 'en-US' })).toBe('1,234.5 VND');
  });

  it('binds the display locale via setMoneyLocale (vi-VN grouping/decimal separators)', () => {
    try {
      setMoneyLocale('vi-VN');
      expect(formatMoney(1234.56, 'USD')).toBe('1.234,56 USD');
      setMoneyLocale('en-US');
      expect(formatMoney(1234.56, 'USD')).toBe('1,234.56 USD');
    } finally {
      setMoneyLocale('en-US');
    }
  });

  it('converts between currencies through VND rates and rounds to target minor units', () => {
    const rates = (code: string | null | undefined) => {
      const map: Record<string, number> = { VND: 1, USD: 25_000, EUR: 27_000 };
      return map[(code ?? '').toUpperCase()] ?? 1;
    };

    expect(convertMoney(10, 'USD', 'VND', rates, 'en-US')).toBe(250000);
    expect(convertMoney(250000, 'VND', 'USD', rates, 'en-US')).toBe(10);
    expect(convertMoney(10, 'USD', 'EUR', rates, 'en-US')).toBe(9.26);
    expect(convertMoney(10.005, 'USD', 'USD', rates, 'en-US')).toBe(10.01);
  });
});
