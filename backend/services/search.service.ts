import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../domain/logistics';
import { buildGlobalSearchResults } from '../models/logisticsReporting';
import { readSnapshot } from '../models/logisticsSnapshots';
import { listSearchableUsers } from '../models/users';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from '../models/logisticsTransforms';
import type { TokenPayload } from '../domain/types';

export async function searchGlobal(query: string, auth: TokenPayload | undefined) {
  const [purchaseRequestsRaw, purchaseOrdersRaw, deliveryOrdersRaw, tasks, users] = await Promise.all([
    readSnapshot<PurchaseRequest[]>('purchase_requests'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
    listSearchableUsers(auth?.role === 'ADMIN', auth?.sub),
  ]);
  const purchaseRequests = purchaseRequestsRaw.map(normalizePurchaseRequest);
  const purchaseOrders = classifyPurchaseOrders(purchaseOrdersRaw.map(normalizePurchaseOrder), deliveryOrdersRaw.map(normalizeDeliveryOrder));
  const deliveryOrders = classifyDeliveryOrders(deliveryOrdersRaw.map(normalizeDeliveryOrder), purchaseOrders);

  return buildGlobalSearchResults({
    currentUserId: auth?.sub,
    currentUserRole: auth?.role,
    deliveryOrders,
    purchaseOrders,
    purchaseRequests,
    query,
    tasks,
    users,
  });
}
