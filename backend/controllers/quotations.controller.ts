import type { Response } from 'express';

import type { AuthenticatedRequest } from '../domain/types';
import {
  confirmQuotationBooking,
  createQuotation,
  listQuotations,
  listSlaAlerts,
  updateQuotationAction,
} from '../services/quotations.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getQuotations(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listQuotations(), errors: [] });
}

export async function postQuotation(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await createQuotation(request.body, request.auth), errors: [] });
}

export async function patchQuotationAction(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updateQuotationAction(decodeParam(request.params.quotationId), request.body, request.auth),
    errors: [],
  });
}

export async function postQuotationBooking(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await confirmQuotationBooking(decodeParam(request.params.quotationId), request.body, request.auth),
    errors: [],
  });
}

export async function getSlaAlerts(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listSlaAlerts(), errors: [] });
}
