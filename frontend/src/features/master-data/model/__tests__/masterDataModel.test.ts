import { describe, expect, it } from 'vitest';

import {
  CARRIER_TYPE_VALUES,
  getCarrierTypeLabel,
  getDepartmentLabel,
  getItemCategoryLabel,
  getMilestoneLabel,
  getRevCostLabel,
  getSupplierTypeLabel,
} from '../masterDataModel';

const t = ((key: string) => `TRANSLATED:${key}`) as never;

describe('master-data enum labels are doc-grounded, not translated', () => {
  it('returns the raw code for type enums', () => {
    expect(getSupplierTypeLabel('OVERSEAS_SEA', t)).toBe('OVERSEAS_SEA');
    expect(getItemCategoryLabel('NVL', t)).toBe('NVL');
    expect(getCarrierTypeLabel('SHIPPING_LINE', t)).toBe('SHIPPING_LINE');
  });

  it('maps milestone/department codes to doc text', () => {
    expect(getMilestoneLabel('MS1_BOOKING_CONFIRMED', t)).toBe('MS-1 Booking confirmed');
    expect(getDepartmentLabel('FDS_ACCOUNTING', t)).toBe('FDS Kế toán');
    expect(getDepartmentLabel('KBI_PURCHASING', t)).toBe('KBI – Mua hàng');
  });

  it('maps rev_cost to the doc English word', () => {
    expect(getRevCostLabel('REVENUE')).toBe('Revenue');
    expect(getRevCostLabel('BOTH')).toBe('Both');
  });

  it('exposes raw-code value lists for filters', () => {
    expect(CARRIER_TYPE_VALUES).toEqual(['SHIPPING_LINE', 'AIRLINE']);
  });
});
