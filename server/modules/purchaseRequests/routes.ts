import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type {
  AuthenticatedRequest,
  CreatePurchaseRequestBody,
  UpdatePurchaseRequestBody,
  UpdatePurchaseRequestStatusBody,
} from '../../types';
import { createPurchaseRequest, listPurchaseRequests, updatePurchaseRequest, updatePurchaseRequestStatus } from './service';

export function createPurchaseRequestsRouter() {
  const router = Router();

  router.get('/purchase-requests', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listPurchaseRequests(), errors: [] });
  });

  router.post('/purchase-requests', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), async (request: AuthenticatedRequest, response) => {
    const purchaseRequest = await createPurchaseRequest(request.body as CreatePurchaseRequestBody, request.auth);
    response.status(201).json({ data: purchaseRequest, errors: [] });
  });

  router.patch('/purchase-requests/:requestedOrderId', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), async (request, response) => {
    const purchaseRequest = await updatePurchaseRequest(
      decodeURIComponent(String(request.params.requestedOrderId ?? '')),
      request.body as UpdatePurchaseRequestBody,
    );
    response.json({ data: purchaseRequest, errors: [] });
  });

  router.patch('/purchase-requests/:requestedOrderId/status', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), async (request: AuthenticatedRequest, response) => {
    const purchaseRequest = await updatePurchaseRequestStatus(
      decodeURIComponent(String(request.params.requestedOrderId ?? '')),
      request.body as UpdatePurchaseRequestStatusBody,
      request.auth,
    );
    response.json({ data: purchaseRequest, errors: [] });
  });

  return router;
}
