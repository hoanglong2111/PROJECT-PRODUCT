import { IconPlane, IconShip, IconTruckDelivery } from '@tabler/icons-react';

import type { DeliveryOrder, DeliveryOrderStatus } from '@shared/api/logistics';

export const shippingIcon = {
  SEA: IconShip,
  AIR: IconPlane,
  ROAD: IconTruckDelivery,
};

export type DeliveryOrderTab =
  | 'processing'
  | 'handover'
  | 'internationalTransit'
  | 'customsWaiting'
  | 'customsCleared'
  | 'delivering'
  | 'completed'
  | 'issues'
  | 'all';

export const deliveryOrderStatusTabs: Record<Exclude<DeliveryOrderTab, 'all'>, DeliveryOrderStatus[]> = {
  processing: ['DRAFT', 'CREATED', 'READY_FOR_QUOTATION', 'QUOTATION_CONFIRMED'],
  handover: ['ASSIGNED_TO_SHIPMENT', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_PROCESSING', 'WAREHOUSE_PENDING'],
  internationalTransit: ['IN_TRANSIT'],
  customsWaiting: ['ARRIVED_PORT'],
  customsCleared: ['CUSTOMS_CLEARED'],
  delivering: ['WAREHOUSE_PENDING'],
  completed: ['CLOSED', 'DELIVERED'],
  issues: ['DELAYED', 'CANCELLED'],
};

export const deliveryOrderTabItems: Array<{ label: string; value: DeliveryOrderTab }> = [
  { label: 'Chờ xử lý', value: 'processing' },
  { label: 'Chờ bàn giao', value: 'handover' },
  { label: 'Đang vận chuyển quốc tế', value: 'internationalTransit' },
  { label: 'Đang chờ thông quan', value: 'customsWaiting' },
  { label: 'Đã thông quan', value: 'customsCleared' },
  { label: 'Đang giao hàng', value: 'delivering' },
  { label: 'Hoàn tất', value: 'completed' },
  { label: 'Sự cố', value: 'issues' },
  { label: 'Tất cả', value: 'all' },
];

export function hasOperationalRisk(deliveryOrder: DeliveryOrder) {
  return (
    deliveryOrder.warehouse_tracking.delay_days > 0 ||
    deliveryOrder.task_summary.blocked_tasks > 0 ||
    deliveryOrder.logistics_shipping.missing_documents.length > 0
  );
}

export function getAllocationWeightKg(deliveryOrder: DeliveryOrder) {
  const weight = deliveryOrder.source_lines.reduce((total, line) => total + (line.weight_kg ?? 0), 0);
  return Math.round(weight * 10) / 10;
}

export function getContainerCount(deliveryOrder: DeliveryOrder) {
  return Math.max(0, ...deliveryOrder.source_lines.map((line) => line.container_count ?? 0));
}
