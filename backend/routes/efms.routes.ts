import { Router } from 'express';

import {
  getCharges,
  getCustomsDeclaration,
  getEfms,
  patchAdvanceSettlementStatus,
  patchCharge,
  patchCustomsDeclaration,
  patchShippingInstruction,
  postAdvanceSettlement,
  postCharge,
  postContainer,
  postDocumentCrossCheck,
  postDocumentReview,
  postDriveDossier,
  postFinalBl,
  postFinanceNote,
  postFinanceNoteToAccounting,
  postHouseBill,
  removeCharge,
} from '../controllers/efms.controller';
import { readAllRoles } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';

export function createEfmsRouter() {
  const router = Router();
  router.get('/delivery-orders/:orderNumber/efms-control', authenticateRequest, authorizeRole(readAllRoles), getEfms);
  router.post('/delivery-orders/:orderNumber/advance-settlements', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER']), postAdvanceSettlement);
  router.patch('/advance-settlements/:settlementId/status', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), patchAdvanceSettlementStatus);
  router.post('/delivery-orders/:orderNumber/drive-dossier', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER', 'PORT_OFFICER']), postDriveDossier);
  router.patch('/delivery-orders/:orderNumber/shipping-instruction', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER']), patchShippingInstruction);
  router.post('/delivery-orders/:orderNumber/hbls', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER']), postHouseBill);
  router.post('/delivery-orders/:orderNumber/containers', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), postContainer);
  router.post('/delivery-orders/:orderNumber/document-reviews', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), postDocumentReview);
  router.post('/document-reviews/:reviewId/cross-check', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), postDocumentCrossCheck);
  router.post('/document-reviews/:reviewId/final-bl', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER']), postFinalBl);
  router.get('/delivery-orders/:orderNumber/charges', authenticateRequest, authorizeRole(readAllRoles), getCharges);
  router.post('/delivery-orders/:orderNumber/charges', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), postCharge);
  router.patch('/charges/:chargeId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), patchCharge);
  router.delete('/charges/:chargeId', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), removeCharge);
  router.post('/delivery-orders/:orderNumber/finance-notes', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), postFinanceNote);
  router.post('/finance-notes/:noteId/send-to-accounting', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), postFinanceNoteToAccounting);
  router.get('/delivery-orders/:orderNumber/customs', authenticateRequest, authorizeRole(readAllRoles), getCustomsDeclaration);
  router.patch('/delivery-orders/:orderNumber/customs', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'CUSTOMS_OFFICER']), patchCustomsDeclaration);
  return router;
}
