import type { Response } from 'express';

import type {
  AuthenticatedRequest,
  CreatePurchaseRequestBody,
  UpdatePurchaseRequestBody,
  UpdatePurchaseRequestStatusBody,
} from '../domain/types';
import {
  createPurchaseRequest,
  listPurchaseRequests,
  updatePurchaseRequest,
  updatePurchaseRequestStatus,
} from '../services/purchase-requests.service';
import {
  addApprovalConfig,
  approvePurchaseRequestStep,
  listApprovalConfigs,
  listPurchaseRequestApprovalSteps,
  rejectPurchaseRequestStep,
  submitPurchaseRequestForApproval,
} from '../services/purchase-request-workflow.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getPurchaseRequests(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPurchaseRequests(), errors: [] });
}

export async function postPurchaseRequest(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({
    data: await createPurchaseRequest(request.body as CreatePurchaseRequestBody, request.auth),
    errors: [],
  });
}

export async function patchPurchaseRequest(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updatePurchaseRequest(
      decodeParam(request.params.requestedOrderId),
      request.body as UpdatePurchaseRequestBody,
    ),
    errors: [],
  });
}

export async function patchPurchaseRequestStatus(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updatePurchaseRequestStatus(
      decodeParam(request.params.requestedOrderId),
      request.body as UpdatePurchaseRequestStatusBody,
      request.auth,
    ),
    errors: [],
  });
}

export async function postPurchaseRequestSubmit(request: AuthenticatedRequest, response: Response) {
  await submitPurchaseRequestForApproval(decodeParam(request.params.requestedOrderId), request.auth?.sub || 'SYSTEM');
  response.json({ data: { success: true }, errors: [] });
}

export async function getPurchaseRequestApprovalSteps(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPurchaseRequestApprovalSteps(decodeParam(request.params.requestedOrderId)), errors: [] });
}

export async function postPurchaseRequestStepApprove(request: AuthenticatedRequest, response: Response) {
  await approvePurchaseRequestStep(
    String(request.params.stepId ?? ''),
    request.auth?.sub || 'SYSTEM',
    request.body.note,
    request.auth?.role,
  );
  response.json({ data: { success: true }, errors: [] });
}

export async function postPurchaseRequestStepReject(request: AuthenticatedRequest, response: Response) {
  await rejectPurchaseRequestStep(
    String(request.params.stepId ?? ''),
    request.auth?.sub || 'SYSTEM',
    request.body.note,
    request.auth?.role,
  );
  response.json({ data: { success: true }, errors: [] });
}

export async function getApprovalConfigs(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listApprovalConfigs(), errors: [] });
}

export async function postApprovalConfig(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: { id: await addApprovalConfig(request.body) }, errors: [] });
}
