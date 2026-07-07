import { describe, expect, it } from 'vitest';

import {
  isAirMode,
  newRfqPackage,
  quotationRequestStatusTabs,
  rfqChargeableWeightKg,
  rfqContainersTotalWeight,
  rfqDimWeightKg,
  rfqLclChargeableRevenueTon,
  rfqLineCbm,
  rfqPackageCbm,
  rfqPackageSizePreset,
  rfqPackagesTotals,
  rfqPackageDescendantIds,
  rfqTopLevelPackages,
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

describe('RFQ package calculations', () => {
  it('calculates CBM per package from qty and dimensions', () => {
    expect(rfqPackageCbm({ qty: 5, length_cm: 60, width_cm: 40, height_cm: 40 })).toBe(0.48);
  });

  it('returns 0 CBM when any package dimension is missing or invalid', () => {
    expect(rfqPackageCbm({ qty: 5, length_cm: 60, width_cm: 0, height_cm: 40 })).toBe(0);
    expect(rfqPackageCbm({ qty: 0, length_cm: 60, width_cm: 40, height_cm: 40 })).toBe(0);
  });

  it('creates a new package draft with sane defaults', () => {
    const pkg = newRfqPackage(0);
    expect(pkg.package_no).toBe(1);
    expect(pkg.package_type).toBe('CARTON');
    expect(pkg.qty).toBe(1);
  });

  it('resolves size presets to their L/W/H dimensions', () => {
    const preset = rfqPackageSizePreset('PALLET_STD');
    expect(preset).toMatchObject({ length_cm: 120, width_cm: 100, height_cm: 150 });
  });

  it('sums CBM and gross weight across packages', () => {
    const totals = rfqPackagesTotals([
      { qty: 2, length_cm: 120, width_cm: 100, height_cm: 150, gross_weight_per_package_kg: 300 },
      { qty: 1, length_cm: 60, width_cm: 40, height_cm: 40, gross_weight_per_package_kg: 20 },
    ]);
    expect(totals.totalCbm).toBeCloseTo(3.696, 5);
    expect(totals.grossKg).toBe(620);
  });
});

describe('RFQ LCL revenue ton (W/M rule)', () => {
  it('picks CBM as chargeable RT when it exceeds the weight ton', () => {
    // 5 m3 vs 620kg = 0.62 ton -> CBM wins
    expect(rfqLclChargeableRevenueTon(5, 620)).toBe(5);
  });

  it('picks weight-in-tons as chargeable RT when it exceeds CBM', () => {
    // 0.5 m3 vs 2000kg = 2 ton -> weight wins
    expect(rfqLclChargeableRevenueTon(0.5, 2000)).toBe(2);
  });

  it('does not apply the AIR /6000 divisor', () => {
    // A naive AIR-style calc would give dimKg = 3.696e6/6000 = 616; RT must stay in CBM/ton units, not kg
    expect(rfqLclChargeableRevenueTon(3.696, 620)).toBeCloseTo(3.696, 5);
  });
});

describe('RFQ nested packages (packed-inside)', () => {
  it('excludes nested (non-top-level) packages from top-level totals', () => {
    const pallet = { clientId: 'pallet-1', parent_client_id: '' };
    const carton = { clientId: 'carton-1', parent_client_id: 'pallet-1' };
    expect(rfqTopLevelPackages([pallet, carton])).toEqual([pallet]);
  });

  it('resolves all descendants (children and grandchildren) of a package', () => {
    const packages = [
      { clientId: 'pallet-1', parent_client_id: '' },
      { clientId: 'carton-1', parent_client_id: 'pallet-1' },
      { clientId: 'box-1', parent_client_id: 'carton-1' },
      { clientId: 'carton-2', parent_client_id: 'pallet-1' },
    ];
    const descendants = rfqPackageDescendantIds(packages, 'pallet-1');
    expect(descendants).toEqual(new Set(['carton-1', 'box-1', 'carton-2']));
  });

  it('returns an empty set for a leaf package with no children', () => {
    const packages = [
      { clientId: 'pallet-1', parent_client_id: '' },
      { clientId: 'carton-1', parent_client_id: 'pallet-1' },
    ];
    expect(rfqPackageDescendantIds(packages, 'carton-1').size).toBe(0);
  });
});

describe('RFQ container calculations', () => {
  it('sums gross weight across all item lines in all containers', () => {
    const total = rfqContainersTotalWeight([
      { lines: [{ gross_weight_kg: 500 }, { gross_weight_kg: 250 }] },
      { lines: [{ gross_weight_kg: 100 }] },
    ]);
    expect(total).toBe(850);
  });

  it('ignores missing or invalid line weights', () => {
    const total = rfqContainersTotalWeight([
      { lines: [{ gross_weight_kg: null }, { gross_weight_kg: '' }, { gross_weight_kg: 50 }] },
    ]);
    expect(total).toBe(50);
  });
});
