import { Router } from 'express';

import {
  getPurchaseOrders,
  getPurchaseOrderTasks,
  patchPurchaseOrderStage,
  postPurchaseOrder,
  postPurchaseOrderSapSync,
} from '../controllers/purchase-orders.controller';
import { readAllRoles, roleGroups } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';

export function createPurchaseOrdersRouter() {
  const router = Router();
  router.get('/purchase-orders', authenticateRequest, authorizeRole(readAllRoles), getPurchaseOrders);
  router.post('/purchase-orders', authenticateRequest, authorizeRole(roleGroups.purchaseOrders), idempotencyMiddleware, postPurchaseOrder);
  router.post('/purchase-orders/:poNumber/sap-sync', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), postPurchaseOrderSapSync);
  router.patch('/purchase-orders/:poNumber/stage', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), patchPurchaseOrderStage);
  router.get('/purchase-orders/:poNumber/tasks', authenticateRequest, authorizeRole(readAllRoles), getPurchaseOrderTasks);
  return router;
}
