import { describe, expect, it } from 'vitest';

import { buildRateLookup, buildRateLookupOrNull, STATIC_VND_RATE_FALLBACKS } from '../currencyRates';

describe('buildRateLookup', () => {
  it('maps code to vnd_rate and defaults unknown to 1', () => {
    const lookup = buildRateLookup([{ code: 'USD', vnd_rate: 26301 }]);

    expect(lookup('USD')).toBe(26301);
    expect(lookup('ZZZ')).toBe(1);
    expect(lookup(null)).toBe(1);
  });
});

describe('buildRateLookupOrNull', () => {
  it('maps known codes, treats VND as base, and returns null for missing rates', () => {
    const lookup = buildRateLookupOrNull([{ code: 'USD', vnd_rate: 26301 }]);

    expect(lookup('USD')).toBe(26301);
    expect(lookup('VND')).toBe(1);
    expect(lookup('ZZZ')).toBeNull();
    expect(lookup(null)).toBeNull();
  });

  it('can use static VND rate fallbacks without treating unknown currencies as 1', () => {
    const lookup = buildRateLookupOrNull([], STATIC_VND_RATE_FALLBACKS);

    expect(lookup('VND')).toBe(1);
    expect(lookup('USD')).toBe(26_221.78);
    expect(lookup('CNY')).toBe(3_855.13);
    expect(lookup('JPY')).toBe(161.734127);
    expect(lookup('ZZZ')).toBeNull();
  });

  it('lets API rates override the static fallback table', () => {
    const lookup = buildRateLookupOrNull([{ code: 'USD', vnd_rate: 25_000 }], STATIC_VND_RATE_FALLBACKS);

    expect(lookup('USD')).toBe(25_000);
    expect(lookup('EUR')).toBe(29_980.18);
  });
});
