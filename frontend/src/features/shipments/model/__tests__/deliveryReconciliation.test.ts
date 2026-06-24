import { describe, expect, it } from 'vitest';

import type { ShipmentContainerV1 } from '@shared/api/shipmentContainers';
import type { DomesticTransportOrderV1, DomesticTransportOrderStatusV1 } from '@shared/api/domesticTransportOrders';
import { resolveShipmentDelivery } from '../deliveryReconciliation';

function container(partial: Partial<ShipmentContainerV1>): ShipmentContainerV1 {
  return { id: 'c', shipment_id: 's', dto_id: null, container_no: 'CONT', container_type: null, seal_no: null, tare_weight_kg: null, gross_weight_kg: null, volume_cbm: null, status: 'PLANNED', note: null, ...partial };
}
function dto(id: string, status: DomesticTransportOrderStatusV1, actual_delivery_at: string | null = null): DomesticTransportOrderV1 {
  return { id, dto_no: id, shipment_id: 's', carrier_delivery_order_id: null, truck_vendor_id: null, origin: null, destination: null, warehouse: null, vehicle_type: null, vehicle_plate: null, driver_name: null, driver_phone: null, scheduled_pickup_at: null, actual_pickup_at: null, scheduled_delivery_at: null, actual_delivery_at, pod_document_ref: null, quote_amount: null, quote_currency: null, status, note: null, create_at: '', update_at: '' };
}

describe('resolveShipmentDelivery', () => {
  it('reports NO_CONTAINERS and falls back to DTO counts for LCL', () => {
    const result = resolveShipmentDelivery([], [dto('dto_1', 'POD_RECEIVED', '2026-06-10'), dto('dto_2', 'IN_TRANSIT')]);
    expect(result.state).toBe('NO_CONTAINERS');
    expect(result.totalContainers).toBe(0);
    expect(result.deliveredDtoCount).toBe(1);
    expect(result.totalDtoCount).toBe(2);
    expect(result.latestPodAt).toBe('2026-06-10');
  });
  it('reports UNALLOCATED when some containers have no DTO', () => {
    const result = resolveShipmentDelivery(
      [container({ id: 'a', dto_id: 'dto_1' }), container({ id: 'b', dto_id: null })],
      [dto('dto_1', 'DELIVERED')],
    );
    expect(result.state).toBe('UNALLOCATED');
    expect(result.allocated).toBe(1);
    expect(result.unallocated).toBe(1);
  });
  it('reports IN_PROGRESS when all allocated but not all delivered', () => {
    const result = resolveShipmentDelivery(
      [container({ id: 'a', dto_id: 'dto_1' }), container({ id: 'b', dto_id: 'dto_2' })],
      [dto('dto_1', 'POD_RECEIVED'), dto('dto_2', 'IN_TRANSIT')],
    );
    expect(result.state).toBe('IN_PROGRESS');
    expect(result.delivered).toBe(1);
  });
  it('reports COMPLETE when every container is on a delivered DTO', () => {
    const result = resolveShipmentDelivery(
      [container({ id: 'a', dto_id: 'dto_1' }), container({ id: 'b', dto_id: 'dto_1' })],
      [dto('dto_1', 'CLOSED', '2026-06-12')],
    );
    expect(result.state).toBe('COMPLETE');
    expect(result.delivered).toBe(2);
    expect(result.latestPodAt).toBe('2026-06-12');
  });
});
