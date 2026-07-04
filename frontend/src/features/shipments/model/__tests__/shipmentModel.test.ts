import { describe, expect, it } from 'vitest';

import { carrierTypeForMode } from '../shipmentModel';

describe('carrierTypeForMode', () => {
  it('maps AIR to AIRLINE', () => {
    expect(carrierTypeForMode('AIR')).toBe('AIRLINE');
  });

  it('maps SEA to SHIPPING_LINE', () => {
    expect(carrierTypeForMode('SEA')).toBe('SHIPPING_LINE');
  });

  it('returns null for other modes (no carrier-type filter)', () => {
    expect(carrierTypeForMode('ROAD')).toBeNull();
    expect(carrierTypeForMode(null)).toBeNull();
  });
});
