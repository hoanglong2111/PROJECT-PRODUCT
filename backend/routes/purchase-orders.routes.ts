import { Router } from 'express';

import {
  getPurchaseOrders,
  getPurchaseOrderTasks,
  patchPurchaseOrderStage,
  postPurchaseOrder,
  postPurchaseOrderSapSync,
} from '../controllers/purchase-orders.controller';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeDynamicRoute } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';

export function createPurchaseOrdersRouter() {
  const router = Router();
  const authGuard = authorizeDynamicRoute('purchase_orders');

  router.get('/purchase-orders', authenticateRequest, authGuard, getPurchaseOrders);
  router.post('/purchase-orders', authenticateRequest, authGuard, idempotencyMiddleware, postPurchaseOrder);
  router.post('/purchase-orders/:poNumber/sap-sync', authenticateRequest, authGuard, postPurchaseOrderSapSync);
  router.patch('/purchase-orders/:poNumber/stage', authenticateRequest, authGuard, patchPurchaseOrderStage);
  router.get('/purchase-orders/:poNumber/tasks', authenticateRequest, authGuard, getPurchaseOrderTasks);
  return router;
}
