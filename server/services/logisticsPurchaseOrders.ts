import { randomUUID } from 'node:crypto';

import { createSapClient } from '../integrations/sap/client';
import { buildSapPurchaseOrderPayload } from '../integrations/sap/types';
import type { PurchaseOrder, PurchaseOrderLineItem, PurchaseRequest } from '../../src/models/logistics';
import { pool } from '../db';
import { ApiError } from '../errors';
import type { CreatePurchaseOrderBody, TokenPayload } from '../types';
import {
  appendUnique,
  normalizeBusinessCode,
  normalizePurchaseOrderSourceLines,
  optionalDate,
  requiredPositiveNumber,
  requiredString,
  todayIso,
} from './logisticsHelpers';
import { readSnapshot, writeSnapshot } from './logisticsSnapshots';
import { classifyPurchaseOrders, normalizePurchaseOrder, normalizePurchaseRequest } from './logisticsTransforms';

export async function createPurchaseOrder(body: CreatePurchaseOrderBody) {
  const poNumber = normalizeBusinessCode(requiredString(body.poNumber, 'poNumber'));
  const supplierCode = requiredString(body.supplierCode, 'supplierCode');
  const supplierName = requiredString(body.supplierName, 'supplierName');
  const currency = requiredString(body.currency, 'currency').toUpperCase();
  const orderDate = optionalDate(body.orderDate, 'orderDate') ?? todayIso();
  const totalAmount = requiredPositiveNumber(body.totalAmount, 'totalAmount');
  const warehouseCode = requiredString(body.warehouseCode, 'warehouseCode');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [purchaseRequests, purchaseOrders] = await Promise.all([
      readSnapshot<PurchaseRequest[]>('purchase_requests', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
    ]);
    const normalizedRequests = purchaseRequests.map(normalizePurchaseRequest);
    const normalizedOrders = purchaseOrders.map(normalizePurchaseOrder);
    const sourceLines = normalizePurchaseOrderSourceLines(body, normalizedRequests, normalizedOrders);

    if (normalizedOrders.some((order) => normalizeBusinessCode(order.po_number) === poNumber)) {
      throw new ApiError(409, `PO ${poNumber} đã tồn tại.`);
    }

    const sourcePrCodes = Array.from(new Set(sourceLines.map((line) => line.source_pr_code)));
    const lineItems: PurchaseOrderLineItem[] = sourceLines.map((line) => ({
      id: `po-line-${randomUUID()}`,
      source_pr_code: line.source_pr_code,
      source_pr_line_id: line.source_pr_line_id,
      item_code: line.item_code,
      item_name: line.item_name,
      quantity: line.quantity,
      unit: line.unit,
      warehouse_deadline_date: line.warehouse_deadline_date,
      warehouse_code: line.warehouse_code,
    }));
    const purchaseOrder: PurchaseOrder = {
      id: `po-${randomUUID()}`,
      po_number: poNumber,
      source_pr_codes: sourcePrCodes,
      line_items: lineItems,
      supplier_code: supplierCode,
      supplier_name: supplierName,
      status: 'SAP_PENDING',
      order_date: orderDate,
      currency,
      total_amount: totalAmount,
      sap_sync_status: 'PENDING',
      linked_do_numbers: [],
      warehouse_code: warehouseCode,
      flow_tags: ['LINEAR'],
    };
    const updatedRequests = normalizedRequests.map((request) => {
      if (!sourcePrCodes.includes(request.requested_order_id)) {
        return request;
      }

      const updatedLineItems = request.line_items.map((lineItem) => {
        const linked = sourceLines.some(
          (line) => line.source_pr_code === request.requested_order_id && line.source_pr_line_id === lineItem.id,
        );

        return linked
          ? {
              ...lineItem,
              linked_po_numbers: appendUnique(lineItem.linked_po_numbers, poNumber),
            }
          : lineItem;
      });

      return {
        ...request,
        line_items: updatedLineItems,
        linked_po_numbers: appendUnique(request.linked_po_numbers, poNumber),
        status: 'CONVERTED_TO_PO' as const,
      };
    });

    await Promise.all([
      writeSnapshot('purchase_orders', classifyPurchaseOrders([purchaseOrder, ...normalizedOrders], []), client),
      writeSnapshot('purchase_requests', updatedRequests, client),
    ]);
    await client.query('COMMIT');

    return purchaseOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function syncPurchaseOrderWithSap(poNumber: string, auth?: TokenPayload) {
  if (!poNumber) {
    throw new ApiError(400, 'poNumber là bắt buộc.');
  }

  if (!auth || !['ADMIN', 'PIC_MANAGER'].includes(auth.role)) {
    throw new ApiError(403, 'Chỉ PIC Manager được đồng bộ SAP cho PO.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseOrders = await readSnapshot<PurchaseOrder[]>('purchase_orders', client);
    const normalizedOrders = purchaseOrders.map(normalizePurchaseOrder);
    const order = normalizedOrders.find((item) => item.po_number === poNumber);

    if (!order) {
      throw new ApiError(404, 'Không tìm thấy PO cần đồng bộ SAP.');
    }

    if (order.status === 'CLOSED') {
      throw new ApiError(409, 'PO đã đóng, không thể đồng bộ SAP.');
    }

    const sapPayload = buildSapPurchaseOrderPayload(order);
    const sapClient = createSapClient();
    const result = await sapClient.syncPurchaseOrder(sapPayload);
    const updatedOrder: PurchaseOrder = {
      ...order,
      sap_sync_status: result.status,
      status: result.status === 'SYNCED' ? 'SAP_SYNCED' : 'SAP_PENDING',
    };
    const updatedOrders = normalizedOrders.map((item) => (item.po_number === poNumber ? updatedOrder : item));

    await writeSnapshot('purchase_orders', updatedOrders, client);
    await client.query(
      `
        UPDATE purchase_orders
        SET sap_object_id = $1,
            sap_raw_payload = $2,
            sap_synced_at = $3,
            updated_at = NOW()
        WHERE po_number = $4
      `,
      [result.sapObjectId, result.raw, result.syncedAt, poNumber],
    );
    await client.query(
      `
        INSERT INTO sap_sync_events (
          id, entity_type, entity_id, sap_object_type, sap_object_id, status,
          request_payload, response_payload, error_message, created_by
        )
        VALUES ($1, 'purchase_order', $2, 'PO', $3, $4, $5, $6, NULL, $7)
      `,
      [
        `sap-sync-${randomUUID()}`,
        poNumber,
        result.sapObjectId,
        result.status,
        sapPayload,
        result.raw,
        auth.sub,
      ],
    );
    await client.query('COMMIT');

    return updatedOrder;
  } catch (error) {
    await client.query('ROLLBACK');

    const errorMessage = error instanceof Error ? error.message : String(error);
    await pool.query(
      `
        INSERT INTO sap_sync_events (
          id, entity_type, entity_id, sap_object_type, sap_object_id, status,
          request_payload, response_payload, error_message, created_by
        )
        VALUES ($1, 'purchase_order', $2, 'PO', NULL, 'FAILED', '{}'::JSONB, NULL, $3, $4)
      `,
      [`sap-sync-${randomUUID()}`, poNumber, errorMessage, auth?.sub ?? null],
    );

    throw error;
  } finally {
    client.release();
  }
}
