import { beforeEach, describe, expect, it } from 'vitest';

import { setMoneyLocale } from '../money';
import { formatCompact, formatInteger, formatNumber } from '../number';

describe('number formatters', () => {
  beforeEach(() => setMoneyLocale('en-US'));

  it('formats grouped numbers using the active money locale', () => {
    expect(formatNumber(1234567.5)).toBe('1,234,567.5');
    setMoneyLocale('vi-VN');
    expect(formatNumber(1234567.5)).toBe('1.234.567,5');
  });

  it('formats integers and missing values', () => {
    expect(formatInteger(1234.8)).toBe('1,235');
    expect(formatNumber(null)).toBe('-');
    expect(formatNumber(undefined)).toBe('-');
  });

  it('keeps small compact values readable and compacts larger values', () => {
    expect(formatCompact(9999)).toBe('9,999');
    expect(formatCompact(12500)).toBe('12.5K');
  });
});
