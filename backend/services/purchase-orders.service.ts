import type { DeliveryOrder, PurchaseOrder } from '../domain/logistics';
import { createPurchaseOrder, syncPurchaseOrderWithSap } from '../models/logisticsPurchaseOrders';
import { readSnapshot } from '../models/logisticsSnapshots';
import { classifyPurchaseOrders, normalizeDeliveryOrder, normalizePurchaseOrder } from '../models/logisticsTransforms';

export async function listPurchaseOrders() {
  const [purchaseOrdersRaw, deliveryOrdersRaw] = await Promise.all([
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
  ]);

  return classifyPurchaseOrders(
    purchaseOrdersRaw.map(normalizePurchaseOrder),
    deliveryOrdersRaw.map(normalizeDeliveryOrder),
  );
}

export { createPurchaseOrder, syncPurchaseOrderWithSap };
