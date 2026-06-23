import type { ShipmentCost, ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentModeV1 } from '@shared/api/shipments';
import type { DeliveryOrderV1 } from '@shared/api/deliveryOrders';
import type { CustomsDeclarationChannelV1 } from '@shared/api/customsDeclarations';

export type ShipmentTab = 'all' | 'in_transit' | 'customs' | 'delivered';
export type ShipmentWorkbench = 'list' | 'create' | 'detail';
export type ShipmentChannelFilter = 'all' | 'GREEN' | 'YELLOW' | 'RED';

export const inTransitStatuses = new Set<ShipmentRecord['status']>([
  'BOOKED',
  'BOOKING_PENDING',
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICKED_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'IN_TRANSIT',
  'ARRIVED',
  'ARRIVED_PORT',
]);

export const customsStatuses = new Set<ShipmentRecord['status']>([
  'CUSTOMS_DRAFT',
  'CUSTOMS_CLEARED',
  'CUSTOMS_PROCESSING',
]);

/** Total landed cost normalized to the base currency (VND) via each line's exchange_rate. */
export function landedCostTotal(costs: ShipmentCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.amount * cost.exchange_rate, 0);
}

export const shipmentModeOptions: Array<{ label: string; value: ShipmentModeV1 }> = [
  { label: 'Sea', value: 'SEA' },
  { label: 'Air', value: 'AIR' },
  { label: 'Road', value: 'ROAD' },
  { label: 'Rail', value: 'RAIL' },
  { label: 'Multimodal', value: 'MULTIMODAL' },
  { label: 'Trucking', value: 'TRUCKING' },
  { label: 'Other', value: 'OTHER' },
];

export function inferShipmentModeFromDeliveryOrder(deliveryOrder: DeliveryOrderV1): ShipmentModeV1 {
  const modeType = deliveryOrder.transport_mode?.mode_type?.toUpperCase();
  if (modeType === 'AIR') return 'AIR';
  if (modeType === 'ROAD' || modeType === 'TRUCKING') return 'ROAD';
  if (modeType === 'RAIL') return 'RAIL';
  if (modeType === 'MULTIMODAL') return 'MULTIMODAL';
  return 'SEA';
}

export function channelColor(channel: CustomsDeclarationChannelV1) {
  if (channel === 'GREEN') return 'teal';
  if (channel === 'YELLOW') return 'yellow';
  return 'red';
}
