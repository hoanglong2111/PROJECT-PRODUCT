import type { DeliveryOrder, PurchaseOrder } from '../domain/logistics';
import { attachDeliveryOrderDocument, listDeliveryOrderAttachments } from '../models/logisticsAttachments';
import { readSnapshot } from '../models/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
} from '../models/logisticsTransforms';

export async function listDeliveryOrders() {
  const [deliveryOrdersRaw, purchaseOrdersRaw] = await Promise.all([
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
  ]);
  const purchaseOrders = classifyPurchaseOrders(
    purchaseOrdersRaw.map(normalizePurchaseOrder),
    deliveryOrdersRaw.map(normalizeDeliveryOrder),
  );
  return classifyDeliveryOrders(deliveryOrdersRaw.map(normalizeDeliveryOrder), purchaseOrders);
}

export { attachDeliveryOrderDocument, listDeliveryOrderAttachments };
