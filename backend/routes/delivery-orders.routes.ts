import { Router } from 'express';

import {
  deleteDeliveryOrderCost,
  getDeliveryOrderAttachments,
  getDeliveryOrderCosts,
  getDeliveryOrderMilestones,
  getDeliveryOrders,
  patchDeliveryOrder,
  patchDeliveryOrderMilestone,
  postDeliveryOrder,
  postDeliveryOrderAttachment,
  postDeliveryOrderCost,
} from '../controllers/delivery-orders.controller';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeDynamicRoute } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';
import { parseMultipartUpload } from '../middlewares/upload';

export function createDeliveryOrdersRouter() {
  const router = Router();
  const authGuard = authorizeDynamicRoute('shipments');

  router.get('/delivery-orders', authenticateRequest, authGuard, getDeliveryOrders);
  router.post('/delivery-orders', authenticateRequest, authGuard, idempotencyMiddleware, postDeliveryOrder);
  router.patch('/delivery-orders/:orderNumber', authenticateRequest, authGuard, patchDeliveryOrder);
  router.get('/delivery-orders/:orderNumber/attachments', authenticateRequest, authGuard, getDeliveryOrderAttachments);
  router.post('/delivery-orders/:orderNumber/attachments', authenticateRequest, authGuard, parseMultipartUpload, postDeliveryOrderAttachment);
  router.get('/delivery-orders/:orderNumber/milestones', authenticateRequest, authGuard, getDeliveryOrderMilestones);
  router.patch('/delivery-orders/:orderNumber/milestones/:milestoneCode', authenticateRequest, authGuard, patchDeliveryOrderMilestone);
  router.get('/delivery-orders/:orderNumber/costs', authenticateRequest, authGuard, getDeliveryOrderCosts);
  router.post('/delivery-orders/:orderNumber/costs', authenticateRequest, authGuard, idempotencyMiddleware, postDeliveryOrderCost);
  router.delete('/delivery-orders/costs/:costId', authenticateRequest, authGuard, deleteDeliveryOrderCost);
  return router;
}
