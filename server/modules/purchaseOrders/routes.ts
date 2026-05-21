import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type { AuthenticatedRequest, CreatePurchaseOrderBody } from '../../types';
import { createPurchaseOrder, listPurchaseOrders, syncPurchaseOrderWithSap } from './service';

export function createPurchaseOrdersRouter() {
  const router = Router();

  router.get('/purchase-orders', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listPurchaseOrders(), errors: [] });
  });

  router.post('/purchase-orders', authenticateRequest, authorizeRole(roleGroups.purchaseOrders), async (request, response) => {
    const purchaseOrder = await createPurchaseOrder(request.body as CreatePurchaseOrderBody);
    response.status(201).json({ data: purchaseOrder, errors: [] });
  });

  router.post('/purchase-orders/:poNumber/sap-sync', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), async (request: AuthenticatedRequest, response) => {
    const purchaseOrder = await syncPurchaseOrderWithSap(decodeURIComponent(String(request.params.poNumber ?? '')), request.auth);
    response.json({ data: purchaseOrder, errors: [] });
  });

  return router;
}
