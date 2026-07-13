import { IconPlane, IconShip, IconTruckDelivery } from '@tabler/icons-react';

import type { DeliveryOrder, DeliveryOrderStatus } from '@shared/api/logistics';
import type { MessageKey } from '@shared/i18n';

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

export const deliveryOrderTabItems: Array<{ labelKey: MessageKey; value: DeliveryOrderTab }> = [
  { labelKey: 'deliveryOrders.tabProcessing', value: 'processing' },
  { labelKey: 'deliveryOrders.tabHandover', value: 'handover' },
  { labelKey: 'deliveryOrders.tabInternationalTransit', value: 'internationalTransit' },
  { labelKey: 'deliveryOrders.tabCustomsWaiting', value: 'customsWaiting' },
  { labelKey: 'deliveryOrders.tabCustomsCleared', value: 'customsCleared' },
  { labelKey: 'deliveryOrders.tabDelivering', value: 'delivering' },
  { labelKey: 'deliveryOrders.tabCompleted', value: 'completed' },
  { labelKey: 'deliveryOrders.tabIssues', value: 'issues' },
  { labelKey: 'deliveryOrders.tabAll', value: 'all' },
];

export function hasOperationalRisk(deliveryOrder: DeliveryOrder) {
  return (
    deliveryOrder.warehouse_tracking.delay_days > 0 ||
    deliveryOrder.task_summary.blocked_tasks > 0 ||
    (deliveryOrder.logistics_shipping.documents_outstanding ?? deliveryOrder.logistics_shipping.missing_documents).length > 0
  );
}

export function getAllocationWeightKg(deliveryOrder: DeliveryOrder) {
  const weight = deliveryOrder.source_lines.reduce((total, line) => total + (line.weight_kg ?? 0), 0);
  return Math.round(weight * 10) / 10;
}

export function getContainerCount(deliveryOrder: DeliveryOrder) {
  return Math.max(0, ...deliveryOrder.source_lines.map((line) => line.container_count ?? 0));
}
