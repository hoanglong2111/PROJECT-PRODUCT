import type { Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
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
} from '../services/efms.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getEfms(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await getEfmsControl(decodeParam(request.params.orderNumber)), errors: [] });
}

export async function postAdvanceSettlement(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({
    data: await createAdvanceSettlement(decodeParam(request.params.orderNumber), request.body, request.auth),
    errors: [],
  });
}

export async function patchAdvanceSettlementStatus(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updateAdvanceSettlementStatus(decodeParam(request.params.settlementId), request.body, request.auth),
    errors: [],
  });
}

export async function postDriveDossier(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await syncDriveDossier(decodeParam(request.params.orderNumber), request.auth), errors: [] });
}

export async function patchShippingInstruction(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updateShippingInstruction(decodeParam(request.params.orderNumber), request.body, request.auth),
    errors: [],
  });
}

export async function postHouseBill(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await createHouseBill(decodeParam(request.params.orderNumber), request.body), errors: [] });
}

export async function postContainer(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await createContainer(decodeParam(request.params.orderNumber), request.body), errors: [] });
}

export async function postDocumentReview(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({
    data: await createDocumentReview(decodeParam(request.params.orderNumber), request.body, request.auth),
    errors: [],
  });
}

export async function postDocumentCrossCheck(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await confirmDocumentCrossCheck(decodeParam(request.params.reviewId), request.body), errors: [] });
}

export async function postFinalBl(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await confirmFinalBl(decodeParam(request.params.reviewId), request.body, request.auth),
    errors: [],
  });
}

export async function getCharges(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listCharges(decodeParam(request.params.orderNumber)), errors: [] });
}

export async function postCharge(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await createCharge(decodeParam(request.params.orderNumber), request.body), errors: [] });
}

export async function patchCharge(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await updateCharge(decodeParam(request.params.chargeId), request.body), errors: [] });
}

export async function removeCharge(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await deleteCharge(decodeParam(request.params.chargeId)), errors: [] });
}

export async function postFinanceNote(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({
    data: await issueFinanceNote(decodeParam(request.params.orderNumber), request.body, request.auth),
    errors: [],
  });
}

export async function postFinanceNoteToAccounting(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await sendFinanceNoteToAccounting(decodeParam(request.params.noteId), request.auth), errors: [] });
}

export async function getCustomsDeclaration(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await getCustoms(decodeParam(request.params.orderNumber)), errors: [] });
}

export async function patchCustomsDeclaration(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await updateCustoms(decodeParam(request.params.orderNumber), request.body, request.auth), errors: [] });
}
