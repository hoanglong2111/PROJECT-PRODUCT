import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../domain/logistics';
import { buildDashboardStats } from '../models/logisticsReporting';
import { readSnapshot } from '../models/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from '../models/logisticsTransforms';

export async function readDashboardStats() {
  const [purchaseRequestsRaw, purchaseOrdersRaw, deliveryOrdersRaw, tasks] = await Promise.all([
    readSnapshot<PurchaseRequest[]>('purchase_requests'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
  ]);
  const purchaseRequests = purchaseRequestsRaw.map(normalizePurchaseRequest);
  const deliveryOrdersBase = deliveryOrdersRaw.map(normalizeDeliveryOrder);
  const purchaseOrders = classifyPurchaseOrders(purchaseOrdersRaw.map(normalizePurchaseOrder), deliveryOrdersBase);
  const deliveryOrders = classifyDeliveryOrders(deliveryOrdersBase, purchaseOrders);

  return buildDashboardStats({ purchaseRequests, purchaseOrders, deliveryOrders, tasks });
}
