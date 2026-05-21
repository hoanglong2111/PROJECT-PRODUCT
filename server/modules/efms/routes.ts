import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles } from '../../constants';
import type { AuthenticatedRequest } from '../../types';
import {
  confirmDocumentCrossCheck,
  confirmFinalBl,
  createAdvanceSettlement,
  createCharge,
  createContainer,
  createDocumentReview,
  createHouseBill,
  deleteCharge,
  getCustoms,
  getEfmsControl,
  issueFinanceNote,
  listCharges,
  sendFinanceNoteToAccounting,
  syncDriveDossier,
  updateAdvanceSettlementStatus,
  updateCharge,
  updateCustoms,
  updateShippingInstruction,
} from './service';

export function createEfmsRouter() {
  const router = Router();

  router.get('/delivery-orders/:orderNumber/efms-control', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    response.json({ data: await getEfmsControl(decodeURIComponent(String(request.params.orderNumber ?? ''))), errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/advance-settlements', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await createAdvanceSettlement(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body, request.auth);
    response.status(201).json({ data: result, errors: [] });
  });

  router.patch('/advance-settlements/:settlementId/status', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await updateAdvanceSettlementStatus(decodeURIComponent(String(request.params.settlementId ?? '')), request.body, request.auth);
    response.json({ data: result, errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/drive-dossier', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER', 'PORT_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await syncDriveDossier(decodeURIComponent(String(request.params.orderNumber ?? '')), request.auth);
    response.status(201).json({ data: result, errors: [] });
  });

  router.patch('/delivery-orders/:orderNumber/shipping-instruction', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await updateShippingInstruction(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body, request.auth);
    response.json({ data: result, errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/hbls', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER']), async (request, response) => {
    const result = await createHouseBill(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body);
    response.status(201).json({ data: result, errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/containers', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), async (request, response) => {
    const result = await createContainer(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body);
    response.status(201).json({ data: result, errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/document-reviews', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await createDocumentReview(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body, request.auth);
    response.status(201).json({ data: result, errors: [] });
  });

  router.post('/document-reviews/:reviewId/cross-check', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), async (request, response) => {
    const result = await confirmDocumentCrossCheck(decodeURIComponent(String(request.params.reviewId ?? '')), request.body);
    response.json({ data: result, errors: [] });
  });

  router.post('/document-reviews/:reviewId/final-bl', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await confirmFinalBl(decodeURIComponent(String(request.params.reviewId ?? '')), request.body, request.auth);
    response.json({ data: result, errors: [] });
  });

  router.get('/delivery-orders/:orderNumber/charges', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    response.json({ data: await listCharges(decodeURIComponent(String(request.params.orderNumber ?? ''))), errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/charges', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request, response) => {
    const result = await createCharge(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body);
    response.status(201).json({ data: result, errors: [] });
  });

  router.patch('/charges/:chargeId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request, response) => {
    const result = await updateCharge(decodeURIComponent(String(request.params.chargeId ?? '')), request.body);
    response.json({ data: result, errors: [] });
  });

  router.delete('/charges/:chargeId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request, response) => {
    const result = await deleteCharge(decodeURIComponent(String(request.params.chargeId ?? '')));
    response.json({ data: result, errors: [] });
  });

  router.post('/delivery-orders/:orderNumber/finance-notes', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await issueFinanceNote(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body, request.auth);
    response.status(201).json({ data: result, errors: [] });
  });

  router.post('/finance-notes/:noteId/send-to-accounting', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await sendFinanceNoteToAccounting(decodeURIComponent(String(request.params.noteId ?? '')), request.auth);
    response.json({ data: result, errors: [] });
  });

  router.get('/delivery-orders/:orderNumber/customs', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    response.json({ data: await getCustoms(decodeURIComponent(String(request.params.orderNumber ?? ''))), errors: [] });
  });

  router.patch('/delivery-orders/:orderNumber/customs', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'CUSTOMS_OFFICER']), async (request: AuthenticatedRequest, response) => {
    const result = await updateCustoms(decodeURIComponent(String(request.params.orderNumber ?? '')), request.body, request.auth);
    response.json({ data: result, errors: [] });
  });

  return router;
}
