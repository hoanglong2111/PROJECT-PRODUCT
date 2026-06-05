import type { DeliveryOrder, LogisticsTask, PurchaseOrder } from '../domain/logistics';
import { buildDashboardStats } from '../models/logisticsReporting';
import { readSnapshot } from '../models/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
} from '../models/logisticsTransforms';

export async function readDashboardStats() {
  const [purchaseOrdersRaw, deliveryOrdersRaw, tasks] = await Promise.all([
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
  ]);
  const deliveryOrdersBase = deliveryOrdersRaw.map(normalizeDeliveryOrder);
  const purchaseOrders = classifyPurchaseOrders(purchaseOrdersRaw.map(normalizePurchaseOrder), deliveryOrdersBase);
  const deliveryOrders = classifyDeliveryOrders(deliveryOrdersBase, purchaseOrders);

  return buildDashboardStats({ purchaseOrders, deliveryOrders, tasks });
}
