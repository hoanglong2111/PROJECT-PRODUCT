import type { Response } from 'express';

import type { AuthenticatedRequest, CreatePurchaseOrderBody } from '../domain/types';
import { gd1PurchaseOrderService } from '../services/gd1-purchase-orders.service';
import { syncPurchaseOrderWithSap } from '../services/purchase-orders.service';
import { changePurchaseOrderStage, listPurchaseOrderTasks } from '../services/purchase-order-workflow.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getPurchaseOrders(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await gd1PurchaseOrderService.listPOs(), errors: [] });
}

export async function postPurchaseOrder(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await gd1PurchaseOrderService.createPO(request.body, request.auth?.sub || 'SYSTEM'), errors: [] });
}

export async function postPurchaseOrderSapSync(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await syncPurchaseOrderWithSap(decodeParam(request.params.poNumber), request.auth), errors: [] });
}

export async function patchPurchaseOrderStage(request: AuthenticatedRequest, response: Response) {
  const result = await gd1PurchaseOrderService.transitionPO(decodeParam(request.params.poNumber), String(request.body.stage || request.body.status || ''), request.auth?.sub || 'SYSTEM');
  response.json({ data: result, errors: [] });
}

export async function getPurchaseOrderTasks(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPurchaseOrderTasks(decodeParam(request.params.poNumber)), errors: [] });
}
