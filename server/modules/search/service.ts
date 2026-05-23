import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../../../src/models/logistics';
import { pool } from '../../db';
import { buildGlobalSearchResults } from '../../services/logisticsReporting';
import { readSnapshot } from '../../services/logisticsSnapshots';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from '../../services/logisticsTransforms';
import type { AppUserRow, TokenPayload } from '../../types';

export async function searchGlobal(query: string, auth: TokenPayload | undefined) {
  const [purchaseRequestsRaw, purchaseOrdersRaw, deliveryOrdersRaw, tasks, usersResult] = await Promise.all([
    readSnapshot<PurchaseRequest[]>('purchase_requests'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
    auth?.role === 'ADMIN'
      ? pool.query<AppUserRow>('SELECT * FROM app_users ORDER BY full_name ASC')
      : pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1', [auth?.sub]),
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
    users: usersResult.rows,
  });
}
