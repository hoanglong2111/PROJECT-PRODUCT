import { describe, expect, it } from 'vitest';

import type { PoLot, PurchaseOrderLineV1, PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { mapStatusFilterToApi } from '../poStageConfig';
import {
  buildPoPayload,
  createInitialPoDraft,
  deriveContractNo,
  resolveCreateDoFromLotsDefaults,
  getPoFulfillment,
  getPoLineReceiptState,
  resolvePoOriginCountry,
  resolvePoStage,
} from '../purchaseOrderModel';

describe('resolvePoStage', () => {
  it('keeps cancelled purchase orders in the cancelled stage first', () => {
    const order = makePurchaseOrder({
      status: 'CANCELLED',
      logistics_timeline: {
        loading_port: { etd: null, atd: '2026-06-01' },
        unloading_port: { eta: null, ata: '2026-06-05' },
        warehouse: { eta: null, ata: '2026-06-06' },
      },
    });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'CANCELLED', statusCode: 'CANCELLED' });
  });

  it('derives delivered from warehouse ATA', () => {
    const order = makePurchaseOrder({
      logistics_timeline: {
        loading_port: { etd: null, atd: '2026-06-01' },
        unloading_port: { eta: null, ata: '2026-06-05' },
        warehouse: { eta: null, ata: '2026-06-06' },
      },
    });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'DELIVERED', statusCode: 'DELIVERED' });
  });

  it('derives arrived from unloading port ATA', () => {
    const order = makePurchaseOrder({
      logistics_timeline: {
        loading_port: { etd: null, atd: '2026-06-01' },
        unloading_port: { eta: null, ata: '2026-06-05' },
        warehouse: { eta: null, ata: null },
      },
    });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'IN_TRANSIT', statusCode: 'ARRIVED' });
  });

  it('derives in transit from loading port ATD', () => {
    const order = makePurchaseOrder({
      logistics_timeline: {
        loading_port: { etd: null, atd: '2026-06-01' },
        unloading_port: { eta: null, ata: null },
        warehouse: { eta: null, ata: null },
      },
    });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'IN_TRANSIT', statusCode: 'IN_TRANSIT' });
  });

  it('falls back to the PO status when no timeline actuals exist', () => {
    const order = makePurchaseOrder({ status: 'READY_TO_SHIP' });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'PRODUCTION', statusCode: 'READY_TO_SHIP' });
  });

  it('prefers an explicit lifecycle status over the timeline derivation', () => {
    const order = makePurchaseOrder({
      status: 'READY_TO_SHIP',
      lifecycle_status: 'CUSTOMS_CLEARED',
      logistics_timeline: {
        loading_port: { etd: null, atd: '2026-06-01' },
        unloading_port: { eta: null, ata: '2026-06-05' },
        warehouse: { eta: null, ata: '2026-06-06' },
      },
    });

    expect(resolvePoStage(order)).toEqual({ stageKey: 'CUSTOMS', statusCode: 'CUSTOMS_CLEARED' });
  });
});

describe('mapStatusFilterToApi', () => {
  it('keeps stage filters client-side for the mock page data', () => {
    expect(mapStatusFilterToApi('stage:IN_TRANSIT')).toEqual({
      clientStageFilter: { kind: 'stage', stageKey: 'IN_TRANSIT' },
    });
  });

  it('keeps sub-status chips client-side so they match the lifecycle-driven badge', () => {
    expect(mapStatusFilterToApi('READY_TO_SHIP')).toEqual({
      clientStageFilter: { kind: 'status', statusCode: 'READY_TO_SHIP' },
    });
    expect(mapStatusFilterToApi('ARRIVED')).toEqual({
      clientStageFilter: { kind: 'status', statusCode: 'ARRIVED' },
    });
  });
});

describe('deriveContractNo', () => {
  it('swaps the PO prefix for CT', () => {
    expect(deriveContractNo('PO-2026-123456')).toBe('CT-2026-123456');
    expect(deriveContractNo('PO-abc')).toBe('CT-abc');
  });

  it('is case-insensitive and tolerates a missing separator', () => {
    expect(deriveContractNo('poabc')).toBe('CT-abc');
  });

  it('prepends CT when there is no PO prefix', () => {
    expect(deriveContractNo('XYZ-1')).toBe('CT-XYZ-1');
  });

  it('returns an empty string for blank input', () => {
    expect(deriveContractNo('')).toBe('');
    expect(deriveContractNo('   ')).toBe('');
  });
});

describe('PO route fields', () => {
  it('round-trips POL and POD through the PO draft payload', () => {
    const draft = createInitialPoDraft(makePurchaseOrder({
      origin_port: 'Shanghai Port',
      destination_port: 'Cat Lai Port',
    }));

    expect(draft.origin_port).toBe('Shanghai Port');
    expect(draft.destination_port).toBe('Cat Lai Port');

    const payload = buildPoPayload({
      ...draft,
      quotation_id: 'qt_001',
      supplier_id: 'sup_001',
      incoterm_id: 'inc_fob',
      lines: [],
    });

    expect(payload.origin_port).toBe('Shanghai Port');
    expect(payload.destination_port).toBe('Cat Lai Port');
  });

  it('derives the display origin country from the supplier and tolerates missing supplier data', () => {
    expect(resolvePoOriginCountry(makePurchaseOrder({
      supplier: { country: 'CN' } as PurchaseOrderV1['supplier'],
    }))).toBe('CN');
    expect(resolvePoOriginCountry(makePurchaseOrder({ supplier: null }))).toBeNull();
  });

  it('prefills the DO-from-LOT route from the selected LOT before falling back to the PO header', () => {
    const order = makePurchaseOrder({
      origin_port: 'Ningbo Port',
      destination_port: 'Cat Lai Port',
      expected_etd: '2026-07-20',
      expected_eta: '2026-07-28',
    });

    expect(resolveCreateDoFromLotsDefaults([poLot({
      origin_port: 'Shanghai Port',
      destination_port: 'Hai Phong Port',
      planned_cargo_ready_date: '2026-07-18',
      planned_etd: '2026-07-21',
      planned_eta: '2026-07-29',
    })], order)).toEqual({
      origin_port: 'Shanghai Port',
      destination_port: 'Hai Phong Port',
      requested_pickup_date: '2026-07-18',
      planned_etd: '2026-07-21',
      planned_eta: '2026-07-29',
    });

    expect(resolveCreateDoFromLotsDefaults([poLot()], order)).toMatchObject({
      origin_port: 'Ningbo Port',
      destination_port: 'Cat Lai Port',
      planned_etd: '2026-07-20',
      planned_eta: '2026-07-28',
    });
  });
});

describe('getPoLineReceiptState', () => {
  it('returns none when nothing has shipped', () => {
    expect(getPoLineReceiptState(poLine({ qty_shipped: 0, qty_received: 0 }))).toEqual({ state: 'none', shortfall: 0 });
  });
  it('returns pending when shipped but nothing received', () => {
    expect(getPoLineReceiptState(poLine({ qty_shipped: 100, qty_received: 0 }))).toEqual({ state: 'pending', shortfall: 100 });
  });
  it('returns short with the missing quantity', () => {
    expect(getPoLineReceiptState(poLine({ qty_shipped: 100, qty_received: 60 }))).toEqual({ state: 'short', shortfall: 40 });
  });
  it('returns full when received meets shipped', () => {
    expect(getPoLineReceiptState(poLine({ qty_shipped: 100, qty_received: 100 }))).toEqual({ state: 'full', shortfall: 0 });
  });
  it('returns full (no negative shortfall) when received exceeds shipped', () => {
    expect(getPoLineReceiptState(poLine({ qty_shipped: 100, qty_received: 120 }))).toEqual({ state: 'full', shortfall: 0 });
  });
});

describe('getPoFulfillment', () => {
  it('returns all zeros for no lines', () => {
    expect(getPoFulfillment([])).toEqual({
      ordered: 0, confirmed: 0, lotted: 0, shipped: 0, received: 0, lottedLines: 0, totalLines: 0,
    });
  });

  it('sums quantities across lines and counts fully-lotted lines', () => {
    const lines = [
      poLine({ qty_ordered: 100, qty_confirmed: 100, qty_lotted: 100, qty_shipped: 0, qty_received: 0 }),
      poLine({ qty_ordered: 240, qty_confirmed: 240, qty_lotted: 240, qty_shipped: 0, qty_received: 0 }),
    ];
    expect(getPoFulfillment(lines)).toEqual({
      ordered: 340, confirmed: 340, lotted: 340, shipped: 0, received: 0, lottedLines: 2, totalLines: 2,
    });
  });

  it('does not count a partially-lotted line as fully lotted', () => {
    const lines = [
      poLine({ qty_ordered: 100, qty_confirmed: 100, qty_lotted: 60 }),
      poLine({ qty_ordered: 50, qty_confirmed: 50, qty_lotted: 50 }),
    ];
    const result = getPoFulfillment(lines);
    expect(result.lottedLines).toBe(1);
    expect(result.totalLines).toBe(2);
    expect(result.lotted).toBe(110);
  });
});

function poLine(partial: Partial<PurchaseOrderLineV1>): PurchaseOrderLineV1 {
  return {
    id: 'l', line_no: 1, item_id: 'i',
    qty_ordered: 0, qty_confirmed: 0, qty_lotted: 0, qty_shipped: 0, qty_received: 0,
    unit: 'PCS', unit_price: 0,
    ...partial,
  } as PurchaseOrderLineV1;
}

function makePurchaseOrder(patch: Partial<PurchaseOrderV1> = {}): PurchaseOrderV1 {
  return {
    id: 'po_001',
    po_no: 'PO-2026-000001',
    contract_no: null,
    supplier_id: 'sup_001',
    currency_id: null,
    incoterm_id: null,
    transport_mode_id: null,
    po_type: 'SEA',
    payment_term: null,
    exchange_rate: null,
    expected_etd: null,
    expected_eta: null,
    status: 'CONFIRMED',
    sent_at: null,
    confirmed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    notes: null,
    create_at: '2026-06-01T00:00:00.000Z',
    update_at: '2026-06-01T00:00:00.000Z',
    ...patch,
  };
}

function poLot(patch: Partial<PoLot> = {}): PoLot {
  return {
    id: 'lot_001',
    purchase_order_id: 'po_001',
    lot_no: 'LOT-001',
    lot_name: null,
    status: 'PLANNED',
    planned_cargo_ready_date: null,
    planned_etd: null,
    planned_eta: null,
    sort_order: 1,
    notes: null,
    ...patch,
  };
}
