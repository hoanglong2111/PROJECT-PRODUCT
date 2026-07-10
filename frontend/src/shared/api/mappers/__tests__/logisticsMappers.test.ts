import { describe, expect, it } from 'vitest';

import {
  dateOnly,
  gd1StatusToTaskScreen,
  inferLoadTypeFromMode,
  inferPoFlowTags,
  mapDeliveryOrderStatus,
  mapV1ShipmentCost,
  normalizeShipmentMode,
  quotationStatusToUi,
  sumNumbers,
  toNumber,
} from '../logisticsMappers';
import type { PurchaseOrderV1 } from '../../purchaseOrders';
import type { ShipmentCostV1 } from '../../shipments';

describe('shared helpers', () => {
  it('toNumber coerces and falls back on non-finite input', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber(null)).toBe(0);
    expect(toNumber('abc', 7)).toBe(7);
    expect(toNumber(Infinity, 3)).toBe(3);
  });

  it('sumNumbers ignores non-numeric entries', () => {
    expect(sumNumbers(['1', 2, 'x', null])).toBe(3);
    expect(sumNumbers([])).toBe(0);
  });

  it('dateOnly truncates ISO timestamps and handles empties', () => {
    expect(dateOnly('2026-07-10T08:30:00Z')).toBe('2026-07-10');
    expect(dateOnly(null)).toBe('');
    expect(dateOnly(undefined)).toBe('');
  });
});

describe('purchase order mappers', () => {
  const basePo = { lines: [] } as unknown as PurchaseOrderV1;

  it('inferPoFlowTags flags partially lotted lines', () => {
    const partial = {
      ...basePo,
      lines: [{ qty_ordered: 10, qty_lotted: 4 }],
    } as unknown as PurchaseOrderV1;
    expect(inferPoFlowTags(partial)).toEqual(['PARTIAL_DELIVERY']);
  });

  it('inferPoFlowTags defaults to LINEAR for fully lotted or empty lines', () => {
    const full = {
      ...basePo,
      lines: [{ qty_ordered: 10, qty_lotted: 10 }],
    } as unknown as PurchaseOrderV1;
    expect(inferPoFlowTags(full)).toEqual(['LINEAR']);
    expect(inferPoFlowTags(basePo)).toEqual(['LINEAR']);
  });
});

describe('task mappers', () => {
  it('gd1StatusToTaskScreen maps DONE and passes other statuses through', () => {
    expect(gd1StatusToTaskScreen('DONE')).toBe('COMPLETED');
    expect(gd1StatusToTaskScreen('PENDING')).toBe('PENDING');
    expect(gd1StatusToTaskScreen('IN_PROGRESS')).toBe('IN_PROGRESS');
  });
});

describe('quotation mappers', () => {
  it('quotationStatusToUi maps every V1 status onto the UI vocabulary', () => {
    expect(quotationStatusToUi('DRAFT')).toBe('DRAFT');
    expect(quotationStatusToUi('PENDING_APPROVAL')).toBe('OFFICIAL_SENT');
    expect(quotationStatusToUi('PENDING_ADJUSTMENT')).toBe('OFFICIAL_SENT');
    expect(quotationStatusToUi('CONFIRMED')).toBe('APPROVED');
    expect(quotationStatusToUi('REJECTED')).toBe('REJECTED');
  });
});

describe('delivery order mappers', () => {
  it('mapDeliveryOrderStatus renames SHIPPED to IN_TRANSIT and keeps the rest', () => {
    expect(mapDeliveryOrderStatus('SHIPPED')).toBe('IN_TRANSIT');
    expect(mapDeliveryOrderStatus('DRAFT')).toBe('DRAFT');
  });
});

describe('shipment mappers', () => {
  it('normalizeShipmentMode keeps known modes and defaults to SEA', () => {
    expect(normalizeShipmentMode('AIR')).toBe('AIR');
    expect(normalizeShipmentMode('ROAD')).toBe('ROAD');
    expect(normalizeShipmentMode('SEA')).toBe('SEA');
    expect(normalizeShipmentMode('FCL')).toBe('SEA');
    expect(normalizeShipmentMode(null)).toBe('SEA');
  });

  it('inferLoadTypeFromMode extracts the load type token', () => {
    expect(inferLoadTypeFromMode('SEA_FCL')).toBe('FCL');
    expect(inferLoadTypeFromMode('sea lcl')).toBe('LCL');
    expect(inferLoadTypeFromMode('ROAD_FTL')).toBe('FTL');
    expect(inferLoadTypeFromMode('AIR')).toBeNull();
    expect(inferLoadTypeFromMode(null)).toBeNull();
  });

  it('mapV1ShipmentCost normalizes numbers and nullable fields', () => {
    const cost = {
      id: 'cost_1',
      cost_type: 'FREIGHT',
      description: undefined,
      amount: '150.5',
      currency_code: 'USD',
      exchange_rate: undefined,
      alloc_method: 'BY_VALUE',
      invoice_ref: undefined,
      notes: 'note',
    } as unknown as ShipmentCostV1;

    expect(mapV1ShipmentCost(cost)).toEqual({
      id: 'cost_1',
      cost_type: 'FREIGHT',
      description: null,
      amount: 150.5,
      currency_code: 'USD',
      exchange_rate: 1,
      alloc_method: 'BY_VALUE',
      invoice_ref: null,
      notes: 'note',
    });
  });
});
