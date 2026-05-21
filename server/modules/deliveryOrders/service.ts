import type { DeliveryOrder, PurchaseOrder } from '../../../src/models/logistics';
import { createDeliveryOrder, updateDeliveryOrder } from '../../services/logistics';
import { attachDeliveryOrderDocument, listDeliveryOrderAttachments } from '../../services/logisticsAttachments';
import { readSnapshot } from '../../services/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
} from '../../services/logisticsTransforms';

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

export { attachDeliveryOrderDocument, createDeliveryOrder, listDeliveryOrderAttachments, updateDeliveryOrder };
