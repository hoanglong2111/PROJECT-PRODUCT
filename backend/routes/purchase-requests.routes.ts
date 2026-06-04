import { Router } from 'express';

import {
  getApprovalConfigs,
  getPurchaseRequestApprovalSteps,
  getPurchaseRequests,
  patchPurchaseRequest,
  patchPurchaseRequestStatus,
  postApprovalConfig,
  postPurchaseRequest,
  postPurchaseRequestStepApprove,
  postPurchaseRequestStepReject,
  postPurchaseRequestSubmit,
} from '../controllers/purchase-requests.controller';
import { readAllRoles, roleGroups } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';
import { idempotencyMiddleware } from '../middlewares/idempotency';

export function createPurchaseRequestsRouter() {
  const router = Router();
  router.get('/purchase-requests', authenticateRequest, authorizeRole(readAllRoles), getPurchaseRequests);
  router.post('/purchase-requests', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), idempotencyMiddleware, postPurchaseRequest);
  router.patch('/purchase-requests/:requestedOrderId', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), patchPurchaseRequest);
  router.patch('/purchase-requests/:requestedOrderId/status', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), patchPurchaseRequestStatus);
  router.post('/purchase-requests/:requestedOrderId/submit', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), postPurchaseRequestSubmit);
  router.get('/purchase-requests/:requestedOrderId/approval-steps', authenticateRequest, authorizeRole(readAllRoles), getPurchaseRequestApprovalSteps);
  router.post('/purchase-requests/steps/:stepId/approve', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), postPurchaseRequestStepApprove);
  router.post('/purchase-requests/steps/:stepId/reject', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), postPurchaseRequestStepReject);
  router.get('/purchase-requests/approval-configs', authenticateRequest, authorizeRole(readAllRoles), getApprovalConfigs);
  router.post('/purchase-requests/approval-configs', authenticateRequest, authorizeRole(['ADMIN']), idempotencyMiddleware, postApprovalConfig);
  return router;
}
