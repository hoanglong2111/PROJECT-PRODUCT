import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles } from '../../constants';
import type { AppRole } from '../../../src/shared/auth/types';
import type { AuthenticatedRequest } from '../../types';
import { confirmQuotationBooking, createQuotation, listQuotations, listSlaAlerts, updateQuotationAction } from './service';

const quotationRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];

export function createQuotationsRouter() {
  const router = Router();

  router.get('/quotations', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listQuotations(), errors: [] });
  });

  router.post('/quotations', authenticateRequest, authorizeRole(quotationRoles), async (request: AuthenticatedRequest, response) => {
    const quotation = await createQuotation(request.body, request.auth);
    response.status(201).json({ data: quotation, errors: [] });
  });

  router.patch('/quotations/:quotationId/action', authenticateRequest, authorizeRole(quotationRoles), async (request: AuthenticatedRequest, response) => {
    const quotation = await updateQuotationAction(decodeURIComponent(String(request.params.quotationId ?? '')), request.body, request.auth);
    response.json({ data: quotation, errors: [] });
  });

  router.post('/quotations/:quotationId/booking', authenticateRequest, authorizeRole(quotationRoles), async (request: AuthenticatedRequest, response) => {
    const quotation = await confirmQuotationBooking(decodeURIComponent(String(request.params.quotationId ?? '')), request.body, request.auth);
    response.json({ data: quotation, errors: [] });
  });

  router.get('/sla/alerts', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listSlaAlerts(), errors: [] });
  });

  return router;
}
