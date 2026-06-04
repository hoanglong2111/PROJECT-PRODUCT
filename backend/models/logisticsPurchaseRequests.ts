import { randomUUID } from 'node:crypto';

import { seedUsers as logisticsSeedUsers } from '../seeds/logisticsSeed';
import type { PurchaseRequest, PurchaseRequestLineItem } from '../domain/logistics';
import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type {
  CreatePurchaseRequestBody,
  TokenPayload,
  UpdatePurchaseRequestBody,
  UpdatePurchaseRequestStatusBody,
} from '../domain/types';
import {
  calculateDelayDays,
  nextBusinessCode,
  normalizePriority,
  normalizePurchaseRequestStatus,
  optionalDate,
  optionalString,
  readUserRef,
  requiredDate,
  requiredPositiveNumber,
  requiredString,
  todayIso,
  validatePurchaseRequestStatusTransition,
} from './logisticsHelpers';
import { readSnapshot, writeSnapshot } from './logisticsSnapshots';
import { normalizePurchaseRequest } from './logisticsTransforms';

export async function createPurchaseRequest(body: CreatePurchaseRequestBody, auth?: TokenPayload) {
  const requestedLineItems =
    Array.isArray(body.lineItems) && body.lineItems.length > 0
      ? body.lineItems
      : [
          {
            itemCode: body.itemCode,
            itemName: body.itemName,
            productionContractNumber: body.productionContractNumber,
            quantity: body.quantity,
            unit: body.unit,
            warehouseCode: body.warehouseCode,
            warehouseDeadlineDate: body.warehouseDeadlineDate,
          },
        ];
  const lineItems: PurchaseRequestLineItem[] = requestedLineItems.map((lineItem, index) => ({
    id: `pr-line-${randomUUID()}`,
    item_code: requiredString(lineItem.itemCode, `lineItems[${index}].itemCode`),
    item_name: requiredString(lineItem.itemName, `lineItems[${index}].itemName`),
    quantity: requiredPositiveNumber(lineItem.quantity, `lineItems[${index}].quantity`),
    unit: requiredString(lineItem.unit, `lineItems[${index}].unit`),
    warehouse_deadline_date: requiredDate(lineItem.warehouseDeadlineDate, `lineItems[${index}].warehouseDeadlineDate`),
    warehouse_code: requiredString(lineItem.warehouseCode, `lineItems[${index}].warehouseCode`),
    production_contract_number: requiredString(lineItem.productionContractNumber, `lineItems[${index}].productionContractNumber`),
    linked_po_numbers: [],
    linked_do_numbers: [],
  }));
  const primaryLine = lineItems[0];
  const itemCode = primaryLine.item_code;
  const itemName = lineItems.length === 1 ? primaryLine.item_name : `Multiple items (${lineItems.length})`;
  const unit = lineItems.every((lineItem) => lineItem.unit === primaryLine.unit) ? primaryLine.unit : 'mixed';
  const quantity = lineItems.reduce((total, lineItem) => total + lineItem.quantity, 0);
  const warehouseCode = primaryLine.warehouse_code;
  const productionContractNumber = primaryLine.production_contract_number;
  const warehouseDeadlineDate = primaryLine.warehouse_deadline_date;
  const requestedOrderDate = optionalDate(body.requestedOrderDate, 'requestedOrderDate') ?? todayIso();
  const expectedArrivalDate = optionalDate(body.expectedArrivalDate, 'expectedArrivalDate');
  const supplierExpectedDeliveryDate = optionalDate(body.supplierExpectedDeliveryDate, 'supplierExpectedDeliveryDate');
  const priority = normalizePriority(body.priority);
  const requester = auth?.sub ? await readUserRef(auth.sub) : logisticsSeedUsers.requester;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseRequests = await readSnapshot<PurchaseRequest[]>('purchase_requests', client);
    const request: PurchaseRequest = {
      id: `pr-${randomUUID()}`,
      requested_order_id: nextBusinessCode({
        existingValues: purchaseRequests.map((item) => item.requested_order_id),
        fallbackStart: 1,
        prefix: `PR-${new Date().getFullYear()}-`,
      }),
      item_code: itemCode,
      item_name: itemName,
      quantity,
      unit,
      priority,
      requested_order_date: requestedOrderDate,
      adjusted_date: null,
      warehouse_deadline_date: warehouseDeadlineDate,
      production_contract_number: productionContractNumber,
      requester,
      purchasing_manager: logisticsSeedUsers.buyer,
      status: 'NEW',
      notes: optionalString(body.notes) ?? 'Created from KBFE create PR form.',
      line_items: lineItems,
      actual_warehouse_entry_date: null,
      supplier_expected_delivery_date: supplierExpectedDeliveryDate,
      expected_arrival_date: expectedArrivalDate,
      delay_days: calculateDelayDays(expectedArrivalDate, warehouseDeadlineDate),
      linked_po_numbers: [],
      linked_do_numbers: [],
      warehouse_code: warehouseCode,
      flow_tags: ['LINEAR'],
    };

    await writeSnapshot('purchase_requests', [request, ...purchaseRequests], client);
    await client.query('COMMIT');

    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePurchaseRequest(requestedOrderId: string, body: UpdatePurchaseRequestBody) {
  if (!requestedOrderId) {
    throw new ApiError(400, 'requestedOrderId là bắt buộc.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseRequests = await readSnapshot<PurchaseRequest[]>('purchase_requests', client);
    const requestIndex = purchaseRequests.findIndex((request) => request.requested_order_id === requestedOrderId);

    if (requestIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy PR cần cập nhật.');
    }

    const current = normalizePurchaseRequest(purchaseRequests[requestIndex]);
    if (current.linked_po_numbers.length > 0 || current.status === 'CONVERTED_TO_PO') {
      throw new ApiError(409, 'PR đã chuyển sang PO, không thể chỉnh sửa dữ liệu cốt lõi.');
    }

    const next: PurchaseRequest = {
      ...current,
      item_code: body.itemCode !== undefined ? requiredString(body.itemCode, 'itemCode') : current.item_code,
      item_name: body.itemName !== undefined ? requiredString(body.itemName, 'itemName') : current.item_name,
      quantity: body.quantity !== undefined ? requiredPositiveNumber(body.quantity, 'quantity') : current.quantity,
      unit: body.unit !== undefined ? requiredString(body.unit, 'unit') : current.unit,
      priority: body.priority !== undefined ? normalizePriority(body.priority) : current.priority,
      production_contract_number:
        body.productionContractNumber !== undefined
          ? requiredString(body.productionContractNumber, 'productionContractNumber')
          : current.production_contract_number,
      warehouse_code:
        body.warehouseCode !== undefined ? requiredString(body.warehouseCode, 'warehouseCode') : current.warehouse_code,
      warehouse_deadline_date:
        body.warehouseDeadlineDate !== undefined
          ? requiredDate(body.warehouseDeadlineDate, 'warehouseDeadlineDate')
          : current.warehouse_deadline_date,
      supplier_expected_delivery_date:
        body.supplierExpectedDeliveryDate !== undefined
          ? optionalDate(body.supplierExpectedDeliveryDate, 'supplierExpectedDeliveryDate')
          : current.supplier_expected_delivery_date,
      expected_arrival_date:
        body.expectedArrivalDate !== undefined
          ? optionalDate(body.expectedArrivalDate, 'expectedArrivalDate')
          : current.expected_arrival_date,
      notes: body.notes !== undefined ? optionalString(body.notes) ?? '' : current.notes,
    };

    next.delay_days = calculateDelayDays(next.actual_warehouse_entry_date ?? next.expected_arrival_date, next.warehouse_deadline_date);
    next.line_items = next.line_items.map((lineItem, index) =>
      index === 0
        ? {
            ...lineItem,
            item_code: next.item_code,
            item_name: next.item_name,
            quantity: next.quantity,
            unit: next.unit,
            warehouse_code: next.warehouse_code,
            warehouse_deadline_date: next.warehouse_deadline_date,
            production_contract_number: next.production_contract_number,
          }
        : lineItem,
    );

    const updatedRequests = purchaseRequests.map((request) =>
      request.requested_order_id === requestedOrderId ? next : request,
    );

    await writeSnapshot('purchase_requests', updatedRequests, client);
    await client.query('COMMIT');

    return next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePurchaseRequestStatus(
  requestedOrderId: string,
  body: UpdatePurchaseRequestStatusBody,
  auth?: TokenPayload,
) {
  if (!requestedOrderId) {
    throw new ApiError(400, 'requestedOrderId là bắt buộc.');
  }

  const nextStatus = normalizePurchaseRequestStatus(body.status);
  if (!auth || !['ADMIN', 'PIC_MANAGER'].includes(auth.role)) {
    throw new ApiError(403, 'Chỉ PIC Manager được đổi trạng thái PR.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseRequests = await readSnapshot<PurchaseRequest[]>('purchase_requests', client);
    const requestIndex = purchaseRequests.findIndex((request) => request.requested_order_id === requestedOrderId);

    if (requestIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy PR cần cập nhật trạng thái.');
    }

    const current = normalizePurchaseRequest(purchaseRequests[requestIndex]);
    validatePurchaseRequestStatusTransition(current, nextStatus);

    const reason = optionalString(body.reason);
    const actionNote = reason
      ? `Status changed ${current.status} -> ${nextStatus}: ${reason}`
      : `Status changed ${current.status} -> ${nextStatus}.`;
    const next: PurchaseRequest = {
      ...current,
      adjusted_date: todayIso(),
      notes: current.notes ? `${current.notes}\n${actionNote}` : actionNote,
      status: nextStatus,
    };
    const updatedRequests = purchaseRequests.map((request) =>
      request.requested_order_id === requestedOrderId ? next : request,
    );

    await writeSnapshot('purchase_requests', updatedRequests, client);
    await client.query('COMMIT');

    return next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
