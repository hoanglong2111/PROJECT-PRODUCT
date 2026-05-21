import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../../../src/models/logistics';
import { buildDashboardStats } from '../../services/logisticsReporting';
import { readSnapshot } from '../../services/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from '../../services/logisticsTransforms';

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
