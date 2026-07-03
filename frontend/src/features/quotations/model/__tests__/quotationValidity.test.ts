import { describe, expect, it } from 'vitest';

import { quotationValidityState } from '../quotationValidity';

const now = new Date(2026, 6, 3);

describe('quotationValidityState', () => {
  it('returns none when validUntil is null or unparseable', () => {
    expect(quotationValidityState(null, now)).toEqual({ level: 'none', days: 0 });
    expect(quotationValidityState('not-a-date', now)).toEqual({ level: 'none', days: 0 });
  });

  it('flags expired quotes with a negative day count', () => {
    expect(quotationValidityState('2026-06-30', now)).toEqual({ level: 'expired', days: -3 });
  });

  it('flags the expiry day itself as today', () => {
    expect(quotationValidityState('2026-07-03', now)).toEqual({ level: 'today', days: 0 });
  });

  it('flags soon when within the 7-day window', () => {
    expect(quotationValidityState('2026-07-10', now)).toEqual({ level: 'soon', days: 7 });
    expect(quotationValidityState('2026-07-04', now)).toEqual({ level: 'soon', days: 1 });
  });

  it('flags valid when beyond the soon window', () => {
    expect(quotationValidityState('2026-07-11', now)).toEqual({ level: 'valid', days: 8 });
  });
});
