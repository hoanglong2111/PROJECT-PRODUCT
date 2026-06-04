import type { Response } from 'express';

import type { AuthenticatedRequest, CreatePurchaseOrderBody } from '../domain/types';
import { createPurchaseOrder, listPurchaseOrders, syncPurchaseOrderWithSap } from '../services/purchase-orders.service';
import { changePurchaseOrderStage, listPurchaseOrderTasks } from '../services/purchase-order-workflow.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getPurchaseOrders(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPurchaseOrders(), errors: [] });
}

export async function postPurchaseOrder(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await createPurchaseOrder(request.body as CreatePurchaseOrderBody), errors: [] });
}

export async function postPurchaseOrderSapSync(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await syncPurchaseOrderWithSap(decodeParam(request.params.poNumber), request.auth), errors: [] });
}

export async function patchPurchaseOrderStage(request: AuthenticatedRequest, response: Response) {
  await changePurchaseOrderStage(decodeParam(request.params.poNumber), String(request.body.stage ?? ''), request.auth);
  response.json({ data: { success: true }, errors: [] });
}

export async function getPurchaseOrderTasks(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPurchaseOrderTasks(decodeParam(request.params.poNumber)), errors: [] });
}
