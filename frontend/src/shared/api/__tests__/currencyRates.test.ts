import { describe, expect, it } from 'vitest';

import { buildRateLookup } from '../currencyRates';

describe('buildRateLookup', () => {
  it('maps code to vnd_rate and defaults unknown to 1', () => {
    const lookup = buildRateLookup([{ code: 'USD', vnd_rate: 26301 }]);

    expect(lookup('USD')).toBe(26301);
    expect(lookup('ZZZ')).toBe(1);
    expect(lookup(null)).toBe(1);
  });
});
