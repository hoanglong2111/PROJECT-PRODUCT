import { Router } from 'express';

import {
  getQuotations,
  getSlaAlerts,
  patchQuotationAction,
  postQuotation,
  postQuotationBooking,
} from '../controllers/quotations.controller';
import type { AppRole } from '../domain/auth';
import { readAllRoles } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';

const quotationRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];

export function createQuotationsRouter() {
  const router = Router();
  router.get('/quotations', authenticateRequest, authorizeRole(readAllRoles), getQuotations);
  router.post('/quotations', authenticateRequest, authorizeRole(quotationRoles), postQuotation);
  router.patch('/quotations/:quotationId/action', authenticateRequest, authorizeRole(quotationRoles), patchQuotationAction);
  router.post('/quotations/:quotationId/booking', authenticateRequest, authorizeRole(quotationRoles), postQuotationBooking);
  router.get('/sla/alerts', authenticateRequest, authorizeRole(readAllRoles), getSlaAlerts);
  return router;
}
