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
import { readAllRoles, roleGroups } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';
import { parseMultipartUpload } from '../middlewares/upload';

export function createDeliveryOrdersRouter() {
  const router = Router();
  router.get('/delivery-orders', authenticateRequest, authorizeRole(readAllRoles), getDeliveryOrders);
  router.post('/delivery-orders', authenticateRequest, authorizeRole(roleGroups.deliveryOrders), idempotencyMiddleware, postDeliveryOrder);
  router.patch('/delivery-orders/:orderNumber', authenticateRequest, authorizeRole(roleGroups.deliveryOrders), patchDeliveryOrder);
  router.get('/delivery-orders/:orderNumber/attachments', authenticateRequest, authorizeRole(readAllRoles), getDeliveryOrderAttachments);
  router.post('/delivery-orders/:orderNumber/attachments', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF']), parseMultipartUpload, postDeliveryOrderAttachment);
  router.get('/delivery-orders/:orderNumber/milestones', authenticateRequest, authorizeRole(readAllRoles), getDeliveryOrderMilestones);
  router.patch('/delivery-orders/:orderNumber/milestones/:milestoneCode', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER']), patchDeliveryOrderMilestone);
  router.get('/delivery-orders/:orderNumber/costs', authenticateRequest, authorizeRole(readAllRoles), getDeliveryOrderCosts);
  router.post('/delivery-orders/:orderNumber/costs', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), idempotencyMiddleware, postDeliveryOrderCost);
  router.delete('/delivery-orders/costs/:costId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), deleteDeliveryOrderCost);
  return router;
}
