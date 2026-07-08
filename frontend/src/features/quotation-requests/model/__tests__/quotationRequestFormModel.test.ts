import { describe, expect, it } from 'vitest';

import {
  newRfqContainer,
  newRfqContainerLine,
  newRfqPackage,
  newRfqPackageLine,
} from '../quotationRequestModel';
import {
  buildCreateQuotationRequestPayload,
  containersToLines,
  packagesToLines,
  type BuildCreatePayloadState,
} from '../quotationRequestFormModel';

const baseState: BuildCreatePayloadState = {
  customerRef: '  KBI  ',
  customerPoRef: '',
  customerContractRef: '',
  supplierId: 'sup_001',
  incoterm: 'FOB',
  mode: 'SEA_LCL',
  currency: 'USD',
  originPort: '  Shanghai  ',
  destinationPort: '',
  readyDate: '2026-07-10',
  note: '  hello  ',
  fclMode: false,
  airMode: false,
  lclMode: true,
  totalWeight: 0,
  totalCbm: 0,
  dimWeight: 0,
  chargeableWeight: 0,
  chargeableRevenueTon: 0,
  effectiveLines: [],
  packages: [],
  containers: [],
};

describe('buildCreateQuotationRequestPayload', () => {
  it('trims text fields and maps empty strings to null', () => {
    const payload = buildCreateQuotationRequestPayload(baseState);
    expect(payload.customer_ref).toBe('KBI');
    expect(payload.origin_port).toBe('Shanghai');
    expect(payload.destination_port).toBeNull();
    expect(payload.customer_po_ref).toBeNull();
    expect(payload.note).toBe('hello');
  });

  it('builds an LCL payload: volume + revenue ton, no AIR/FCL fields', () => {
    const packages = [
      newRfqPackage(0, {
        length_cm: 120,
        width_cm: 80,
        height_cm: 60,
        qty: 2,
        gross_weight_per_package_kg: 100,
        lines: [newRfqPackageLine({ item_id: 'item_1', qty: 5, unit: 'PCS', unit_price: 3 })],
      }),
    ];
    const payload = buildCreateQuotationRequestPayload({
      ...baseState,
      totalWeight: 200,
      totalCbm: 1.152,
      chargeableRevenueTon: 1.152,
      effectiveLines: packagesToLines(packages),
      packages,
    });

    expect(payload.volume_cbm).toBe(1.152);
    expect(payload.chargeable_revenue_ton).toBe(1.152);
    expect(payload.dim_weight_kg).toBeNull();
    expect(payload.chargeable_weight_kg).toBeNull();
    expect(payload.container_type).toBeNull();
    expect(payload.containers).toEqual([]);
    expect(payload.packages).toHaveLength(1);
    expect(payload.packages?.[0].cbm).toBe(1.152);
    expect(payload.packages?.[0].lines).toHaveLength(1);
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines?.[0]).toMatchObject({ line_no: 1, item_id: 'item_1', qty: 5 });
  });

  it('builds an AIR payload: dim + chargeable weight, no revenue ton', () => {
    const packages = [
      newRfqPackage(0, {
        length_cm: 120,
        width_cm: 80,
        height_cm: 60,
        qty: 2,
        gross_weight_per_package_kg: 100,
        lines: [newRfqPackageLine({ item_id: 'item_1', qty: 1, unit: 'PCS', unit_price: 3 })],
      }),
    ];
    const payload = buildCreateQuotationRequestPayload({
      ...baseState,
      mode: 'AIR',
      airMode: true,
      lclMode: false,
      totalWeight: 200,
      totalCbm: 1.152,
      dimWeight: 192,
      chargeableWeight: 240,
      effectiveLines: packagesToLines(packages),
      packages,
    });

    expect(payload.dim_weight_kg).toBe(192);
    expect(payload.chargeable_weight_kg).toBe(240);
    expect(payload.chargeable_revenue_ton).toBeNull();
    expect(payload.container_type).toBeNull();
  });

  it('builds an FCL payload: container_type + containers, no packages/volume', () => {
    const containers = [
      newRfqContainer({
        container_type: '40HC',
        qty: 2,
        lines: [newRfqContainerLine({ item_id: 'item_2', qty: 3, unit: 'PCS', unit_price: 10, gross_weight_kg: 50 })],
      }),
    ];
    const payload = buildCreateQuotationRequestPayload({
      ...baseState,
      mode: 'SEA_FCL',
      fclMode: true,
      lclMode: false,
      totalWeight: 150,
      totalCbm: 0,
      effectiveLines: containersToLines(containers),
      containers,
    });

    expect(payload.container_type).toBe('40HC');
    expect(payload.volume_cbm).toBeNull();
    expect(payload.packages).toEqual([]);
    expect(payload.containers).toHaveLength(1);
    expect(payload.containers?.[0]).toMatchObject({ container_no: 1, container_type: '40HC', qty: 2 });
    expect(payload.containers?.[0].lines).toHaveLength(1);
  });
});
