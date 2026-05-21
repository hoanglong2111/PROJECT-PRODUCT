import type { DeliveryOrder, PurchaseOrder } from '../../../src/models/logistics';
import { createPurchaseOrder, syncPurchaseOrderWithSap } from '../../services/logistics';
import { readSnapshot } from '../../services/logisticsSnapshots';
import { classifyPurchaseOrders, normalizeDeliveryOrder, normalizePurchaseOrder } from '../../services/logisticsTransforms';

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
