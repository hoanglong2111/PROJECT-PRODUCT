import { describe, expect, it } from 'vitest';

import {
  isAirMode,
  quotationRequestStatusTabs,
  rfqChargeableWeightKg,
  rfqDimWeightKg,
  rfqLineCbm,
  rfqTotalCbm,
} from '../quotationRequestModel';

describe('quotationRequestStatusTabs', () => {
  it('maps the quoted tab to the QUOTED status', () => {
    expect(quotationRequestStatusTabs.quoted).toEqual(['QUOTED']);
  });
});

describe('RFQ cargo calculations', () => {
  it('calculates CBM from quantity and dimensions in centimeters', () => {
    expect(rfqLineCbm({ qty: 2, length_cm: 120, width_cm: 80, height_cm: 60 })).toBe(1.152);
    expect(rfqTotalCbm([
      { qty: 2, length_cm: 120, width_cm: 80, height_cm: 60 },
      { qty: 1, length_cm: 100, width_cm: 100, height_cm: 100 },
    ])).toBe(2.152);
  });

  it('returns 0 CBM when any dimension is missing', () => {
    expect(rfqLineCbm({ qty: 2, length_cm: 120, width_cm: null, height_cm: 60 })).toBe(0);
  });

  it('calculates AIR dimensional and chargeable weight with IATA divisor 6000', () => {
    const dim = rfqDimWeightKg(1.2);
    expect(dim).toBe(200);
    expect(rfqChargeableWeightKg(180, dim)).toBe(200);
    expect(rfqChargeableWeightKg(240, dim)).toBe(240);
    expect(isAirMode('AIR')).toBe(true);
    expect(isAirMode('SEA_FCL')).toBe(false);
  });
});
