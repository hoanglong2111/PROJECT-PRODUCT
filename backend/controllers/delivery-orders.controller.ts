import type { Response } from 'express';

import type { AuthenticatedRequest, CreateDeliveryOrderBody, UpdateDeliveryOrderBody } from '../domain/types';
import { gd1ShipmentService } from '../services/gd1-shipments.service';
import {
  attachDeliveryOrderDocument,
  listDeliveryOrderAttachments,
} from '../services/delivery-orders.service';
import {
  createShipmentCost,
  listShipmentCosts,
  removeShipmentCost,
} from '../services/delivery-order-workflow.service';
import { ApiError } from '../utils/errors';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getDeliveryOrders(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await gd1ShipmentService.listShipments(), errors: [] });
}

export async function postDeliveryOrder(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({ data: await gd1ShipmentService.createShipment(request.body, request.auth?.sub || 'SYSTEM'), errors: [] });
}

export async function patchDeliveryOrder(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await gd1ShipmentService.updateShipment(decodeParam(request.params.orderNumber), request.body, request.auth?.sub || 'SYSTEM'),
    errors: [],
  });
}

export async function getDeliveryOrderAttachments(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listDeliveryOrderAttachments(decodeParam(request.params.orderNumber)), errors: [] });
}

export async function postDeliveryOrderAttachment(request: AuthenticatedRequest, response: Response) {
  const upload = request.multipartUpload;
  if (!upload) {
    throw new ApiError(400, 'documentType và file là bắt buộc.');
  }
  const data = await attachDeliveryOrderDocument({
    auth: request.auth,
    documentType: upload.documentType,
    file: upload.file,
    hblNumber: upload.hblNumber,
    orderNumber: decodeParam(request.params.orderNumber),
  });
  response.status(201).json({ data, errors: [] });
}

export async function getDeliveryOrderMilestones(request: AuthenticatedRequest, response: Response) {
  const shipment = await gd1ShipmentService.getShipment(decodeParam(request.params.orderNumber));
  response.json({ data: shipment.milestones, errors: [] });
}

export async function patchDeliveryOrderMilestone(request: AuthenticatedRequest, response: Response) {
  const result = await gd1ShipmentService.updateMilestone(
    decodeParam(request.params.orderNumber),
    String(request.params.milestoneCode ?? ''),
    request.body.actualDate,
    request.body.note,
    request.auth?.sub || 'SYSTEM',
  );
  response.json({ data: result, errors: [] });
}

export async function getDeliveryOrderCosts(request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listShipmentCosts(decodeParam(request.params.orderNumber)), errors: [] });
}

export async function postDeliveryOrderCost(request: AuthenticatedRequest, response: Response) {
  response.status(201).json({
    data: await createShipmentCost(decodeParam(request.params.orderNumber), request.body),
    errors: [],
  });
}

export async function deleteDeliveryOrderCost(request: AuthenticatedRequest, response: Response) {
  await removeShipmentCost(String(request.params.costId ?? ''));
  response.json({ data: { success: true }, errors: [] });
}
