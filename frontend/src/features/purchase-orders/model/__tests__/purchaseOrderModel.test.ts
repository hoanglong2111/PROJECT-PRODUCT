import { describe, expect, it } from 'vitest';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { mapStatusFilterToApi } from '../poStageConfig';
import { resolvePoStage } from '../purchaseOrderModel';

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
