import { randomUUID } from 'node:crypto';

import { seedUsers as logisticsSeedUsers } from '../seeds/logisticsSeed';
import { APP_ROLES } from '../../src/auth/types';
import { createSapClient } from '../integrations/sap/client';
import { buildSapPurchaseOrderPayload } from '../integrations/sap/types';
import type {
  BusinessFlowTag,
  DeliveryOrder,
  DeliverySourceLine,
  LogisticsTask,
  Priority,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
  UserRef,
} from '../../src/models/logistics';
import { PRIORITIES, REQUIRED_DOCUMENTS, SHIPPING_METHODS, TASK_STATUSES } from '../constants';
import { pool } from '../db';
import { ApiError } from '../errors';
import { readNormalizedSnapshot, writeNormalizedSnapshot } from './normalizedStore';
import type {
  AppUserRow,
  CreateDeliveryOrderBody,
  CreatePurchaseOrderBody,
  CreatePurchaseRequestBody,
  DashboardStats,
  DatabaseClient,
  ExchangeRatesPayload,
  GlobalSearchResult,
  OpenExchangeRatesResponse,
  TokenPayload,
  UpdateDeliveryOrderBody,
  UpdatePurchaseRequestBody,
  UpdatePurchaseRequestStatusBody,
  UpdateTaskBody,
} from '../types';

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

export async function createPurchaseOrder(body: CreatePurchaseOrderBody) {
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

    const poNumber = nextPurchaseOrderNumber(purchaseOrders);
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

export async function createDeliveryOrder(body: CreateDeliveryOrderBody) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [purchaseRequests, purchaseOrders, deliveryOrders, tasks] = await Promise.all([
      readSnapshot<PurchaseRequest[]>('purchase_requests', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<LogisticsTask[]>('tasks', client),
    ]);
    const normalizedRequests = purchaseRequests.map(normalizePurchaseRequest);
    const normalizedOrders = purchaseOrders.map(normalizePurchaseOrder);
    const normalizedDeliveryOrders = deliveryOrders.map(normalizeDeliveryOrder);
    const sourceLines = normalizeDeliveryOrderSourceLines(body, normalizedRequests, normalizedOrders, normalizedDeliveryOrders);
    const primarySource = sourceLines[0];
    const sourcePr = normalizedRequests.find((request) => request.requested_order_id === primarySource.request_code);
    const sourcePo = normalizedOrders.find((order) => order.po_number === primarySource.po_number);

    if (!sourcePr || !sourcePo) {
      throw new ApiError(404, 'Không tìm thấy PR/PO nguồn để tạo DO.');
    }

    const requestCode = sourcePr.requested_order_id;
    const quantity = requiredPositiveNumber(
      body.quantity ?? sourceLines.reduce((total, line) => total + line.quantity, 0),
      'quantity',
    );
    const unit =
      optionalString(body.unit) ??
      (sourceLines.every((line) => line.unit === primarySource.unit) ? primarySource.unit : 'mixed');
    const itemName =
      optionalString(body.itemName) ??
      (sourceLines.length === 1 ? primarySource.item_name : `Multiple items (${sourceLines.length})`);
    const itemCode = optionalString(body.itemCode) ?? primarySource.item_code;
    const warehouseCode = optionalString(body.warehouseCode) ?? sourcePo.warehouse_code;
    const primaryPoLine = sourcePo.line_items.find((line) => line.id === primarySource.po_line_id) ?? sourcePo.line_items[0];
    const warehouseDeadline =
      optionalDate(body.warehouseDeadline, 'warehouseDeadline') ?? primaryPoLine.warehouse_deadline_date;
    const etaPlanned = optionalDate(body.etaPlanned, 'etaPlanned');
    const etdPlanned = optionalDate(body.etdPlanned, 'etdPlanned');
    const plannedEntryDate = optionalDate(body.plannedEntryDate, 'plannedEntryDate') ?? etaPlanned;
    const actualEntryDate = optionalDate(body.actualEntryDate, 'actualEntryDate');
    const documentsList = normalizeDocuments(body.documentsList);
    const missingDocuments = REQUIRED_DOCUMENTS.filter((documentName) => !documentsList.includes(documentName));
    const orderNumber = nextBusinessCode({
      existingValues: deliveryOrders.map((order) => order.order_info.order_number),
      fallbackStart: 1,
      prefix: `DO-${new Date().getFullYear()}-`,
    });
    const deliveryTasks = buildDefaultDeliveryTasks({
      existingTasks: tasks,
      missingDocuments,
      orderNumber,
      poNumber: sourcePo.po_number,
      productionContractNumber: optionalString(body.purchaseContractNumber) ?? sourcePr.production_contract_number,
      requestCode,
      warehouseDeadline,
    });
    const syncStatus =
      optionalString(body.supplierCode) || sourcePo.supplier_code ? 'SYNCED' : 'SYNC_INCOMPLETE';
    const deliveryOrder: DeliveryOrder = {
      id: `do-${randomUUID()}`,
      order_info: {
        request_code: requestCode,
        order_number: orderNumber,
        tracking_number: optionalString(body.trackingNumber),
        purchase_contract_number: optionalString(body.purchaseContractNumber) ?? sourcePr.production_contract_number,
        status: 'CREATED',
        notes: optionalString(body.notes) ?? 'Created from KBFE create DO form.',
        xnk_notes:
          missingDocuments.length > 0
            ? `Missing ${missingDocuments.join(', ')} for customs readiness.`
            : 'Document set is ready for customs.',
      },
      product_details: {
        item_name_requested: itemName,
        unit,
        quantity,
        lot_number: null,
        lot_unit_quantity: null,
        lot_unit_type: null,
        packaging_type: null,
      },
      source_lines: sourceLines.map((line) => ({
        id: `do-source-${randomUUID()}`,
        po_number: line.po_number,
        po_line_id: line.po_line_id,
        request_code: line.request_code,
        pr_line_id: line.pr_line_id,
        item_code: line.item_code,
        item_name: line.item_name,
        quantity: line.quantity,
        unit: line.unit,
      })),
      sap_integration: {
        supplier_code: optionalString(body.supplierCode) ?? sourcePo.supplier_code,
        supplier_name: optionalString(body.supplierName) ?? sourcePo.supplier_name,
        actual_item_code: itemCode,
        raw_date: syncStatus === 'SYNCED' ? todayIso() : null,
        po_number: sourcePo.po_number,
        sync_status: syncStatus,
      },
      logistics_shipping: {
        incoterms: optionalString(body.incoterms) ?? 'FOB',
        shipping_method: normalizeShippingMethod(body.shippingMethod),
        shipping_line: optionalString(body.shippingLine),
        vessel_code: null,
        port_of_departure: optionalString(body.portOfDeparture) ?? 'Supplier port pending',
        port_of_destination: optionalString(body.portOfDestination) ?? 'VNSGN - Cat Lai',
        documents_list: documentsList,
        missing_documents: missingDocuments,
        cut_off_date: etdPlanned ? addDays(etdPlanned, -2) : null,
        etd_planned: etdPlanned,
        eta_planned: etaPlanned,
      },
      warehouse_tracking: {
        warehouse_code: warehouseCode,
        production_ready_date: null,
        warehouse_deadline: warehouseDeadline,
        planned_entry_date: plannedEntryDate,
        actual_entry_date: actualEntryDate,
        delay_days: calculateDelayDays(actualEntryDate ?? plannedEntryDate, warehouseDeadline),
      },
      finance_tax: {
        import_tax_rate: null,
        tax_amount: null,
        currency: 'VND',
        tax_payment_deadline: etaPlanned ? addDays(etaPlanned, 1) : null,
        insurance: null,
      },
      task_summary: summarizeLogisticsTasks(deliveryTasks),
      flow_tags: ['LINEAR'],
    };
    const sourcePrCodes = Array.from(new Set(sourceLines.map((line) => line.request_code)));
    const sourcePoNumbers = Array.from(new Set(sourceLines.map((line) => line.po_number)));
    const updatedRequests = normalizedRequests.map((request) => {
      if (!sourcePrCodes.includes(request.requested_order_id)) {
        return request;
      }

      const updatedLineItems = request.line_items.map((lineItem) => {
        const linked = sourceLines.some(
          (line) => line.request_code === request.requested_order_id && line.pr_line_id === lineItem.id,
        );

        return linked
          ? {
              ...lineItem,
              linked_do_numbers: appendUnique(lineItem.linked_do_numbers, orderNumber),
            }
          : lineItem;
      });

      return {
        ...request,
        line_items: updatedLineItems,
        expected_arrival_date: etaPlanned ?? request.expected_arrival_date,
        linked_do_numbers: appendUnique(request.linked_do_numbers, orderNumber),
        status: 'CONVERTED_TO_PO' as const,
      };
    });
    const updatedOrders = normalizedOrders.map((order) =>
      sourcePoNumbers.includes(order.po_number)
        ? {
            ...order,
            linked_do_numbers: appendUnique(order.linked_do_numbers, orderNumber),
            status: 'PARTIALLY_DELIVERED' as const,
          }
        : order,
    );
    const nextDeliveryOrders = [deliveryOrder, ...normalizedDeliveryOrders];
    const classifiedOrders = classifyPurchaseOrders(updatedOrders, nextDeliveryOrders);
    const classifiedDeliveryOrders = classifyDeliveryOrders(nextDeliveryOrders, classifiedOrders);

    await Promise.all([
      writeSnapshot('purchase_requests', updatedRequests, client),
      writeSnapshot('purchase_orders', classifiedOrders, client),
      writeSnapshot('delivery_orders', classifiedDeliveryOrders, client),
      writeSnapshot('tasks', [...deliveryTasks, ...tasks], client),
    ]);
    await client.query('COMMIT');

    return deliveryOrder;
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

export async function updateDeliveryOrder(orderNumber: string, body: UpdateDeliveryOrderBody) {
  if (!orderNumber) {
    throw new ApiError(400, 'orderNumber là bắt buộc.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [deliveryOrdersRaw, tasks, purchaseOrdersRaw] = await Promise.all([
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<LogisticsTask[]>('tasks', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
    ]);
    const deliveryOrders = deliveryOrdersRaw.map(normalizeDeliveryOrder);
    const purchaseOrders = purchaseOrdersRaw.map(normalizePurchaseOrder);

    const orderIndex = deliveryOrders.findIndex((order) => order.order_info.order_number === orderNumber);
    if (orderIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy DO cần cập nhật.');
    }

    const current = deliveryOrders[orderIndex];
    if (current.order_info.status === 'DELIVERED') {
      throw new ApiError(409, 'DO đã hoàn tất và bị khóa chỉnh sửa.');
    }

    const documentsList =
      body.documentsList !== undefined ? normalizeDocuments(body.documentsList) : current.logistics_shipping.documents_list;
    const missingDocuments = REQUIRED_DOCUMENTS.filter((documentName) => !documentsList.includes(documentName));
    const etdPlanned =
      body.etdPlanned !== undefined ? optionalDate(body.etdPlanned, 'etdPlanned') : current.logistics_shipping.etd_planned;
    const etaPlanned =
      body.etaPlanned !== undefined ? optionalDate(body.etaPlanned, 'etaPlanned') : current.logistics_shipping.eta_planned;
    const plannedEntryDate =
      body.plannedEntryDate !== undefined
        ? optionalDate(body.plannedEntryDate, 'plannedEntryDate')
        : current.warehouse_tracking.planned_entry_date;
    const actualEntryDate =
      body.actualEntryDate !== undefined
        ? optionalDate(body.actualEntryDate, 'actualEntryDate')
        : current.warehouse_tracking.actual_entry_date;
    const warehouseDeadline =
      body.warehouseDeadline !== undefined
        ? requiredDate(body.warehouseDeadline, 'warehouseDeadline')
        : current.warehouse_tracking.warehouse_deadline;

    const updatedOrderBase: DeliveryOrder = {
      ...current,
      order_info: {
        ...current.order_info,
        tracking_number:
          body.trackingNumber !== undefined ? optionalString(body.trackingNumber) : current.order_info.tracking_number,
        notes: body.notes !== undefined ? optionalString(body.notes) ?? '' : current.order_info.notes,
        xnk_notes:
          missingDocuments.length > 0
            ? `Missing ${missingDocuments.join(', ')} for customs readiness.`
            : 'Document set is ready for customs.',
      },
      product_details: {
        ...current.product_details,
        item_name_requested:
          body.itemName !== undefined ? requiredString(body.itemName, 'itemName') : current.product_details.item_name_requested,
        quantity: body.quantity !== undefined ? requiredPositiveNumber(body.quantity, 'quantity') : current.product_details.quantity,
        unit: body.unit !== undefined ? requiredString(body.unit, 'unit') : current.product_details.unit,
      },
      sap_integration: {
        ...current.sap_integration,
        actual_item_code:
          body.itemCode !== undefined ? requiredString(body.itemCode, 'itemCode') : current.sap_integration.actual_item_code,
        supplier_code:
          body.supplierCode !== undefined ? optionalString(body.supplierCode) : current.sap_integration.supplier_code,
        supplier_name:
          body.supplierName !== undefined ? optionalString(body.supplierName) : current.sap_integration.supplier_name,
      },
      logistics_shipping: {
        ...current.logistics_shipping,
        shipping_method:
          body.shippingMethod !== undefined
            ? normalizeShippingMethod(body.shippingMethod)
            : current.logistics_shipping.shipping_method,
        incoterms: body.incoterms !== undefined ? requiredString(body.incoterms, 'incoterms') : current.logistics_shipping.incoterms,
        shipping_line:
          body.shippingLine !== undefined ? optionalString(body.shippingLine) : current.logistics_shipping.shipping_line,
        port_of_departure:
          body.portOfDeparture !== undefined
            ? requiredString(body.portOfDeparture, 'portOfDeparture')
            : current.logistics_shipping.port_of_departure,
        port_of_destination:
          body.portOfDestination !== undefined
            ? requiredString(body.portOfDestination, 'portOfDestination')
            : current.logistics_shipping.port_of_destination,
        documents_list: documentsList,
        missing_documents: missingDocuments,
        etd_planned: etdPlanned,
        eta_planned: etaPlanned,
        cut_off_date: etdPlanned ? addDays(etdPlanned, -2) : null,
      },
      warehouse_tracking: {
        ...current.warehouse_tracking,
        warehouse_code:
          body.warehouseCode !== undefined ? requiredString(body.warehouseCode, 'warehouseCode') : current.warehouse_tracking.warehouse_code,
        warehouse_deadline: warehouseDeadline,
        planned_entry_date: plannedEntryDate,
        actual_entry_date: actualEntryDate,
        delay_days: calculateDelayDays(actualEntryDate ?? plannedEntryDate, warehouseDeadline),
      },
      finance_tax: {
        ...current.finance_tax,
        import_tax_rate:
          body.importTaxRate !== undefined
            ? optionalNonNegativeNumber(body.importTaxRate, 'importTaxRate')
            : current.finance_tax.import_tax_rate,
        tax_amount:
          body.taxAmount !== undefined ? optionalNonNegativeNumber(body.taxAmount, 'taxAmount') : current.finance_tax.tax_amount,
        currency:
          body.currency !== undefined ? normalizeCurrencyCode(body.currency, 'currency') : current.finance_tax.currency,
      },
    };

    const orderTasks = tasks.filter((task) => task.do_number === orderNumber);
    const updatedOrder = withOperationalClosureState(updatedOrderBase, orderTasks);
    const updatedDeliveryOrders = deliveryOrders.map((order) =>
      order.order_info.order_number === orderNumber ? updatedOrder : order,
    );
    const updatedPurchaseOrders = classifyPurchaseOrders(
      syncPurchaseOrderStatuses(purchaseOrders, updatedDeliveryOrders),
      updatedDeliveryOrders,
    );

    await Promise.all([
      writeSnapshot('delivery_orders', updatedDeliveryOrders, client),
      writeSnapshot('purchase_orders', updatedPurchaseOrders, client),
    ]);
    await client.query('COMMIT');

    return updatedOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTask(taskId: string, body: UpdateTaskBody) {
  if (!taskId) {
    throw new ApiError(400, 'taskId là bắt buộc.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [tasks, deliveryOrdersRaw, purchaseOrdersRaw] = await Promise.all([
      readSnapshot<LogisticsTask[]>('tasks', client),
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
    ]);
    const deliveryOrders = deliveryOrdersRaw.map(normalizeDeliveryOrder);
    const purchaseOrders = purchaseOrdersRaw.map(normalizePurchaseOrder);

    const taskIndex = tasks.findIndex((task) => task.task_id === taskId);
    if (taskIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy task cần cập nhật.');
    }

    const current = tasks[taskIndex];
    if (current.status === 'COMPLETED') {
      throw new ApiError(409, 'Task đã hoàn tất và bị khóa chỉnh sửa.');
    }

    const nextProgress = body.progress !== undefined ? normalizeProgress(body.progress) : current.progress;
    const blockedReason =
      body.blockedReason !== undefined ? optionalString(body.blockedReason) : current.blocked_reason;
    const requestedStatus = body.status !== undefined ? normalizeTaskStatus(body.status) : null;
    const nextStatus = requestedStatus ?? inferTaskStatus(nextProgress, blockedReason);
    const normalizedStatus = nextStatus === 'COMPLETED' ? 'COMPLETED' : nextStatus;
    const completedAtInput =
      body.completedAt !== undefined ? optionalDateTime(body.completedAt, 'completedAt') : current.completed_at;

    if (normalizedStatus === 'BLOCKED' && !blockedReason) {
      throw new ApiError(400, 'blockedReason là bắt buộc khi task ở trạng thái BLOCKED.');
    }

    const updatedTask: LogisticsTask = {
      ...current,
      progress: normalizedStatus === 'COMPLETED' ? 100 : nextProgress,
      status: normalizedStatus,
      due_date: body.dueDate !== undefined ? requiredDate(body.dueDate, 'dueDate') : current.due_date,
      notes: body.notes !== undefined ? optionalString(body.notes) ?? '' : current.notes,
      blocked_reason: normalizedStatus === 'BLOCKED' ? blockedReason : null,
      completed_at: normalizedStatus === 'COMPLETED' ? completedAtInput ?? new Date().toISOString() : null,
    };

    const updatedTasks = tasks.map((task) => (task.task_id === taskId ? updatedTask : task));
    const updatedDeliveryOrders = deliveryOrders.map((order) => {
      if (order.order_info.order_number !== updatedTask.do_number) {
        return order;
      }

      const relatedTasks = updatedTasks.filter((task) => task.do_number === updatedTask.do_number);
      return withOperationalClosureState(order, relatedTasks);
    });
    const updatedPurchaseOrders = classifyPurchaseOrders(
      syncPurchaseOrderStatuses(purchaseOrders, updatedDeliveryOrders),
      updatedDeliveryOrders,
    );

    await Promise.all([
      writeSnapshot('tasks', updatedTasks, client),
      writeSnapshot('delivery_orders', updatedDeliveryOrders, client),
      writeSnapshot('purchase_orders', updatedPurchaseOrders, client),
    ]);
    await client.query('COMMIT');

    return updatedTask;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function fetchExchangeRates(base: string): Promise<ExchangeRatesPayload> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);

  if (!response.ok) {
    throw new ApiError(502, 'Không lấy được dữ liệu tỷ giá từ nhà cung cấp.');
  }

  const payload = (await response.json()) as OpenExchangeRatesResponse;

  if (payload.result !== 'success' || !payload.rates || !payload.base_code) {
    throw new ApiError(502, 'Nhà cung cấp tỷ giá trả dữ liệu không hợp lệ.');
  }

  const rates = Object.entries(payload.rates)
    .map(([currency, rate]) => ({ currency, rate: Number(rate) }))
    .filter((item) => Number.isFinite(item.rate))
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return {
    base: payload.base_code,
    nextUpdateAt: payload.time_next_update_utc ?? null,
    provider: 'open.er-api.com',
    rates,
    updatedAt: payload.time_last_update_utc ?? new Date().toISOString(),
  };
}

export async function readSnapshot<T>(key: string, client: DatabaseClient = pool): Promise<T> {
  return readNormalizedSnapshot<T>(key, client);
}

export async function writeSnapshot<T>(key: string, payload: T, client: DatabaseClient = pool) {
  await writeNormalizedSnapshot(key, payload, client);
}

async function readUserRef(userId: string): Promise<UserRef> {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const user = result.rows[0];

  if (!user) {
    return logisticsSeedUsers.requester;
  }

  return {
    user_id: user.id,
    name: user.full_name,
    department: user.department,
  };
}

export function normalizePurchaseRequest(request: PurchaseRequest): PurchaseRequest {
  const legacyLine: PurchaseRequestLineItem = {
    id: `legacy-${request.requested_order_id}-line-1`,
    item_code: request.item_code,
    item_name: request.item_name,
    quantity: request.quantity,
    unit: request.unit,
    warehouse_deadline_date: request.warehouse_deadline_date,
    warehouse_code: request.warehouse_code,
    production_contract_number: request.production_contract_number,
    linked_po_numbers: request.linked_po_numbers ?? [],
    linked_do_numbers: request.linked_do_numbers ?? [],
  };
  const lineItems = Array.isArray(request.line_items) && request.line_items.length > 0 ? request.line_items : [legacyLine];

  return {
    ...request,
    linked_po_numbers: request.linked_po_numbers ?? [],
    linked_do_numbers: request.linked_do_numbers ?? [],
    line_items: lineItems.map((lineItem) => ({
      ...lineItem,
      linked_po_numbers: lineItem.linked_po_numbers ?? [],
      linked_do_numbers: lineItem.linked_do_numbers ?? [],
    })),
    flow_tags: request.flow_tags ?? ['LINEAR'],
  };
}

export function normalizePurchaseOrder(order: PurchaseOrder): PurchaseOrder {
  const sourcePrCode = order.source_pr_codes?.[0] ?? 'UNKNOWN_PR';
  const legacyLine: PurchaseOrderLineItem = {
    id: `legacy-${order.po_number}-line-1`,
    source_pr_code: sourcePrCode,
    source_pr_line_id: `legacy-${sourcePrCode}-line-1`,
    item_code: 'LEGACY_ITEM',
    item_name: 'Legacy PO line',
    quantity: 1,
    unit: 'lot',
    warehouse_deadline_date: order.order_date,
    warehouse_code: order.warehouse_code,
  };

  return {
    ...order,
    source_pr_codes: order.source_pr_codes ?? [],
    linked_do_numbers: order.linked_do_numbers ?? [],
    line_items: Array.isArray(order.line_items) && order.line_items.length > 0 ? order.line_items : [legacyLine],
    flow_tags: order.flow_tags ?? ['LINEAR'],
  };
}

export function normalizeDeliveryOrder(order: DeliveryOrder): DeliveryOrder {
  const requestCode = order.order_info.request_code;
  const poNumber = order.sap_integration.po_number ?? 'UNKNOWN_PO';
  const legacySourceLine: DeliverySourceLine = {
    id: `legacy-${order.order_info.order_number}-source-1`,
    po_number: poNumber,
    po_line_id: `legacy-${poNumber}-line-1`,
    request_code: requestCode,
    pr_line_id: `legacy-${requestCode}-line-1`,
    item_code: order.sap_integration.actual_item_code ?? 'LEGACY_ITEM',
    item_name: order.product_details.item_name_requested,
    quantity: order.product_details.quantity,
    unit: order.product_details.unit,
  };

  return {
    ...order,
    source_lines: Array.isArray(order.source_lines) && order.source_lines.length > 0 ? order.source_lines : [legacySourceLine],
    flow_tags: order.flow_tags ?? ['LINEAR'],
  };
}

function normalizePurchaseOrderSourceLines(
  body: CreatePurchaseOrderBody,
  purchaseRequests: PurchaseRequest[],
  purchaseOrders: PurchaseOrder[],
) {
  const rawLines =
    Array.isArray(body.sourceLines) && body.sourceLines.length > 0
      ? body.sourceLines
      : [{ prCode: body.sourcePrCode, prLineId: undefined, quantity: undefined }];

  return rawLines.map((line, index) => {
    const prCode = requiredString(line.prCode, `sourceLines[${index}].prCode`);
    const request = purchaseRequests.find((item) => item.requested_order_id === prCode);

    if (!request) {
      throw new ApiError(404, `Không tìm thấy PR nguồn ${prCode}.`);
    }

    if (!['APPROVED', 'CONVERTED_TO_PO'].includes(request.status)) {
      throw new ApiError(409, 'Chỉ PR trạng thái APPROVED hoặc CONVERTED_TO_PO còn số lượng mới được tạo PO.');
    }

    const sourceLine = request.line_items.find((item) => item.id === line.prLineId) ?? request.line_items[0];
    if (!sourceLine) {
      throw new ApiError(404, `Không tìm thấy line nguồn của PR ${prCode}.`);
    }

    const remaining = calculatePrLineRemaining(sourceLine, prCode, purchaseOrders);
    const quantity = line.quantity === undefined ? remaining : requiredPositiveNumber(line.quantity, `sourceLines[${index}].quantity`);

    if (quantity > remaining) {
      throw new ApiError(409, `Số lượng PO vượt số lượng còn lại của ${prCode}/${sourceLine.item_code}.`);
    }

    return {
      source_pr_code: prCode,
      source_pr_line_id: sourceLine.id,
      item_code: sourceLine.item_code,
      item_name: sourceLine.item_name,
      quantity,
      unit: sourceLine.unit,
      warehouse_deadline_date: sourceLine.warehouse_deadline_date,
      warehouse_code: sourceLine.warehouse_code,
    };
  });
}

function normalizeDeliveryOrderSourceLines(
  body: CreateDeliveryOrderBody,
  purchaseRequests: PurchaseRequest[],
  purchaseOrders: PurchaseOrder[],
  deliveryOrders: DeliveryOrder[],
): DeliverySourceLine[] {
  const legacyPoNumber =
    optionalString(body.poNumber) ??
    purchaseRequests.find((request) => request.requested_order_id === optionalString(body.requestCode))?.linked_po_numbers[0];
  const rawLines =
    Array.isArray(body.sourceLines) && body.sourceLines.length > 0
      ? body.sourceLines
      : [{ poNumber: legacyPoNumber, poLineId: undefined, quantity: body.quantity }];

  return rawLines.map((line, index) => {
    const poNumber = requiredString(line.poNumber, `sourceLines[${index}].poNumber`);
    const order = purchaseOrders.find((item) => item.po_number === poNumber);

    if (!order) {
      throw new ApiError(404, `Không tìm thấy PO nguồn ${poNumber}.`);
    }

    const requestedPrCode = optionalString(body.requestCode);
    const sourceLine =
      order.line_items.find((item) => item.id === line.poLineId) ??
      order.line_items.find((item) => item.source_pr_code === requestedPrCode) ??
      order.line_items[0];

    if (!sourceLine) {
      throw new ApiError(404, `Không tìm thấy line nguồn của PO ${poNumber}.`);
    }

    const remaining = calculatePoLineRemaining(sourceLine, poNumber, deliveryOrders);
    const quantity = line.quantity === undefined ? remaining : requiredPositiveNumber(line.quantity, `sourceLines[${index}].quantity`);

    if (quantity > remaining) {
      throw new ApiError(409, `Số lượng DO vượt số lượng còn lại của ${poNumber}/${sourceLine.item_code}.`);
    }

    return {
      id: `do-source-${randomUUID()}`,
      po_number: poNumber,
      po_line_id: sourceLine.id,
      request_code: sourceLine.source_pr_code,
      pr_line_id: sourceLine.source_pr_line_id,
      item_code: sourceLine.item_code,
      item_name: sourceLine.item_name,
      quantity,
      unit: sourceLine.unit,
    };
  });
}

function calculatePrLineRemaining(
  lineItem: PurchaseRequestLineItem,
  prCode: string,
  purchaseOrders: PurchaseOrder[],
) {
  const orderedQuantity = purchaseOrders.reduce((total, order) => {
    return (
      total +
      order.line_items
        .filter((line) => line.source_pr_code === prCode && line.source_pr_line_id === lineItem.id)
        .reduce((lineTotal, line) => lineTotal + line.quantity, 0)
    );
  }, 0);

  return Math.max(0, lineItem.quantity - orderedQuantity);
}

function calculatePoLineRemaining(
  lineItem: PurchaseOrderLineItem,
  poNumber: string,
  deliveryOrders: DeliveryOrder[],
) {
  const deliveredQuantity = deliveryOrders.reduce((total, order) => {
    return (
      total +
      order.source_lines
        .filter((line) => line.po_number === poNumber && line.po_line_id === lineItem.id)
        .reduce((lineTotal, line) => lineTotal + line.quantity, 0)
    );
  }, 0);

  return Math.max(0, lineItem.quantity - deliveredQuantity);
}

export function classifyPurchaseOrders(purchaseOrders: PurchaseOrder[], deliveryOrders: DeliveryOrder[]) {
  const purchaseOrdersByPr = new Map<string, number>();
  for (const order of purchaseOrders) {
    for (const prCode of order.source_pr_codes) {
      purchaseOrdersByPr.set(prCode, (purchaseOrdersByPr.get(prCode) ?? 0) + 1);
    }
  }

  return purchaseOrders.map((order) => {
    const tags = new Set<BusinessFlowTag>();

    if (order.source_pr_codes.length > 1) {
      tags.add('BULK_PURCHASE');
    }

    if (order.source_pr_codes.some((prCode) => (purchaseOrdersByPr.get(prCode) ?? 0) > 1)) {
      tags.add('SPLIT_PURCHASE');
    }

    if (order.linked_do_numbers.length > 1) {
      tags.add('PARTIAL_DELIVERY');
    }

    if (
      deliveryOrders.some(
        (deliveryOrder) =>
          order.linked_do_numbers.includes(deliveryOrder.order_info.order_number) &&
          new Set(deliveryOrder.source_lines.map((line) => line.po_number)).size > 1,
      )
    ) {
      tags.add('CONTAINER_CONSOLIDATION');
    }

    if (tags.size === 0) {
      tags.add('LINEAR');
    }

    return {
      ...order,
      flow_tags: Array.from(tags),
    };
  });
}

export function classifyDeliveryOrders(deliveryOrders: DeliveryOrder[], purchaseOrders: PurchaseOrder[]) {
  const purchaseOrderMap = new Map(purchaseOrders.map((order) => [order.po_number, order]));

  return deliveryOrders.map((deliveryOrder) => {
    const tags = new Set<BusinessFlowTag>();
    const poNumbers = new Set(deliveryOrder.source_lines.map((line) => line.po_number));
    const prCodes = new Set(deliveryOrder.source_lines.map((line) => line.request_code));

    if (poNumbers.size > 1 || prCodes.size > 1) {
      tags.add('CONTAINER_CONSOLIDATION');
    }

    for (const poNumber of poNumbers) {
      const order = purchaseOrderMap.get(poNumber);
      if (order?.source_pr_codes.length && order.source_pr_codes.length > 1) {
        tags.add('BULK_PURCHASE');
      }
      if (order?.linked_do_numbers.length && order.linked_do_numbers.length > 1) {
        tags.add('PARTIAL_DELIVERY');
      }
    }

    if (tags.size === 0) {
      tags.add('LINEAR');
    }

    return {
      ...deliveryOrder,
      flow_tags: Array.from(tags),
    };
  });
}

function buildDefaultDeliveryTasks({
  existingTasks,
  missingDocuments,
  orderNumber,
  poNumber,
  productionContractNumber,
  requestCode,
  warehouseDeadline,
}: {
  existingTasks: LogisticsTask[];
  missingDocuments: string[];
  orderNumber: string;
  poNumber: string;
  productionContractNumber: string;
  requestCode: string;
  warehouseDeadline: string;
}): LogisticsTask[] {
  const nextTaskStart = nextTaskNumber(existingTasks);
  const templates: Array<{
    assignee: UserRef;
    dueOffset: number;
    name: string;
    role: LogisticsTask['role'];
  }> = [
    { assignee: logisticsSeedUsers.customs, dueOffset: -5, name: 'Check customs document set', role: 'Customs Officer' },
    { assignee: logisticsSeedUsers.port, dueOffset: -7, name: 'Update carrier tracking and ETA', role: 'Port Officer' },
    { assignee: logisticsSeedUsers.finance, dueOffset: -3, name: 'Confirm import tax estimate', role: 'Finance Officer' },
    { assignee: logisticsSeedUsers.warehouse, dueOffset: -1, name: 'Plan warehouse entry slot', role: 'Warehouse Staff' },
  ];

  return templates.map((template, index) => {
    const blocked = index === 0 && missingDocuments.length > 0;

    return {
      task_id: `TASK-${new Date().getFullYear()}-${String(nextTaskStart + index).padStart(6, '0')}`,
      do_number: orderNumber,
      request_code: requestCode,
      po_number: poNumber,
      production_contract_number: productionContractNumber,
      task_name: template.name,
      role: template.role,
      assignee: template.assignee,
      progress: blocked ? 10 : 0,
      created_at: new Date().toISOString(),
      assigned_at: new Date().toISOString(),
      completed_at: null,
      status: blocked ? 'BLOCKED' : 'TODO',
      priority: blocked ? 'HIGH' : 'MEDIUM',
      due_date: addDays(warehouseDeadline, template.dueOffset),
      notes: `Auto-created when ${orderNumber} was created.`,
      is_required_for_do_closure: true,
      blocked_reason: blocked ? `Missing ${missingDocuments.join(', ')}` : null,
    };
  });
}

function summarizeLogisticsTasks(tasks: LogisticsTask[]): DeliveryOrder['task_summary'] {
  return {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter((task) => task.status === 'COMPLETED').length,
    blocked_tasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    required_tasks_remaining: tasks.filter((task) => task.is_required_for_do_closure && task.status !== 'COMPLETED').length,
  };
}

function withOperationalClosureState(deliveryOrder: DeliveryOrder, relatedTasks: LogisticsTask[]) {
  const summary = summarizeLogisticsTasks(relatedTasks);
  const canClose =
    summary.required_tasks_remaining === 0 &&
    Boolean(deliveryOrder.warehouse_tracking.actual_entry_date) &&
    deliveryOrder.logistics_shipping.missing_documents.length === 0;

  let nextStatus = deliveryOrder.order_info.status;
  if (nextStatus !== 'CANCELLED') {
    if (canClose) {
      nextStatus = 'DELIVERED';
    } else if (nextStatus === 'DELIVERED') {
      nextStatus = 'WAREHOUSE_PENDING';
    }
  }

  return {
    ...deliveryOrder,
    order_info: {
      ...deliveryOrder.order_info,
      status: nextStatus,
    },
    task_summary: summary,
  };
}

function syncPurchaseOrderStatuses(purchaseOrders: PurchaseOrder[], deliveryOrders: DeliveryOrder[]) {
  return purchaseOrders.map((purchaseOrder) => {
    if (purchaseOrder.linked_do_numbers.length === 0) {
      return purchaseOrder;
    }

    const linkedDeliveryOrders = deliveryOrders.filter((deliveryOrder) =>
      purchaseOrder.linked_do_numbers.includes(deliveryOrder.order_info.order_number),
    );

    if (linkedDeliveryOrders.length === 0) {
      return purchaseOrder;
    }

    const allDelivered = linkedDeliveryOrders.every((deliveryOrder) => deliveryOrder.order_info.status === 'DELIVERED');

    return {
      ...purchaseOrder,
      status: allDelivered ? ('CLOSED' as const) : ('PARTIALLY_DELIVERED' as const),
    };
  });
}

function normalizeDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const documents = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  return Array.from(new Set(documents));
}

function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string' && PRIORITIES.includes(value as Priority)) {
    return value as Priority;
  }

  return 'MEDIUM';
}

function normalizePurchaseRequestStatus(value: unknown): PurchaseRequestStatus {
  const allowedStatuses: PurchaseRequestStatus[] = ['NEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'];

  if (typeof value === 'string' && allowedStatuses.includes(value as PurchaseRequestStatus)) {
    return value as PurchaseRequestStatus;
  }

  throw new ApiError(400, 'status PR không hợp lệ.');
}

function validatePurchaseRequestStatusTransition(current: PurchaseRequest, nextStatus: PurchaseRequestStatus) {
  if (current.status === nextStatus) {
    return;
  }

  if (current.status === 'CONVERTED_TO_PO' || current.linked_po_numbers.length > 0) {
    throw new ApiError(409, 'PR đã chuyển sang PO, không thể đổi trạng thái.');
  }

  if (current.status === 'CANCELLED') {
    throw new ApiError(409, 'PR đã hủy, không thể đổi trạng thái.');
  }

  if (current.status === 'REJECTED' && nextStatus !== 'PENDING_APPROVAL') {
    throw new ApiError(409, 'PR đã bị từ chối chỉ có thể đưa lại về chờ duyệt.');
  }

  const allowedTransitions: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
    APPROVED: ['PENDING_APPROVAL', 'CANCELLED'],
    CANCELLED: [],
    CONVERTED_TO_PO: [],
    NEW: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
    REJECTED: ['PENDING_APPROVAL'],
  };

  if (!allowedTransitions[current.status].includes(nextStatus)) {
    throw new ApiError(409, `Không thể đổi PR từ ${current.status} sang ${nextStatus}.`);
  }
}

function normalizeShippingMethod(value: unknown): DeliveryOrder['logistics_shipping']['shipping_method'] {
  if (typeof value === 'string' && SHIPPING_METHODS.includes(value as DeliveryOrder['logistics_shipping']['shipping_method'])) {
    return value as DeliveryOrder['logistics_shipping']['shipping_method'];
  }

  return 'SEA';
}

function normalizeTaskStatus(value: unknown): LogisticsTask['status'] {
  if (typeof value === 'string' && TASK_STATUSES.includes(value as LogisticsTask['status'])) {
    return value as LogisticsTask['status'];
  }

  throw new ApiError(400, 'status task không hợp lệ.');
}

function normalizeProgress(value: unknown) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new ApiError(400, 'progress phải là số từ 0 đến 100.');
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function inferTaskStatus(progress: number, blockedReason: string | null): LogisticsTask['status'] {
  if (progress >= 100) {
    return 'COMPLETED';
  }
  if (blockedReason) {
    return 'BLOCKED';
  }
  if (progress > 0) {
    return 'IN_PROGRESS';
  }
  return 'TODO';
}

function requiredString(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);

  if (!cleaned) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }

  return cleaned;
}

function optionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeCurrencyCode(value: unknown, fieldName: string) {
  const code = optionalString(value)?.toUpperCase();

  if (!code || !/^[A-Z]{3}$/.test(code)) {
    throw new ApiError(400, `${fieldName} phải là mã tiền tệ 3 ký tự, ví dụ USD.`);
  }

  return code;
}

function optionalNonNegativeNumber(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new ApiError(400, `${fieldName} phải là số >= 0.`);
  }

  return numericValue;
}

function requiredPositiveNumber(value: unknown, fieldName: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn 0.`);
  }

  return numberValue;
}

function requiredDate(value: unknown, fieldName: string) {
  const date = optionalDate(value, fieldName);

  if (!date) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }

  return date;
}

function optionalDate(value: unknown, fieldName: string) {
  const date = optionalString(value);

  if (!date) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new ApiError(400, `${fieldName} phải có định dạng YYYY-MM-DD.`);
  }

  return date;
}

function optionalDateTime(value: unknown, fieldName: string) {
  const dateTime = optionalString(value);
  if (!dateTime) {
    return null;
  }

  if (Number.isNaN(Date.parse(dateTime))) {
    throw new ApiError(400, `${fieldName} phải là định dạng datetime hợp lệ.`);
  }

  return new Date(dateTime).toISOString();
}

function appendUnique<T>(items: T[], item: T) {
  return items.includes(item) ? items : [...items, item];
}

function nextPurchaseOrderNumber(purchaseOrders: PurchaseOrder[]) {
  const numbers = purchaseOrders
    .map((order) => Number(order.po_number.match(/^PO-(\d+)$/)?.[1] ?? 0))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(4500098000, ...numbers) + 1;

  return `PO-${next}`;
}

function nextTaskNumber(tasks: LogisticsTask[]) {
  const numbers = tasks
    .map((task) => Number(task.task_id.match(/^TASK-\d{4}-(\d+)$/)?.[1] ?? 0))
    .filter((value) => Number.isFinite(value));

  return Math.max(0, ...numbers) + 1;
}

function nextBusinessCode({
  existingValues,
  fallbackStart,
  prefix,
}: {
  existingValues: string[];
  fallbackStart: number;
  prefix: string;
}) {
  const numbers = existingValues
    .map((value) => (value.startsWith(prefix) ? Number(value.slice(prefix.length)) : 0))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(fallbackStart - 1, ...numbers) + 1;

  return `${prefix}${String(next).padStart(6, '0')}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function calculateDelayDays(basisDate: string | null, deadline: string) {
  if (!basisDate) {
    return 0;
  }

  const basis = Date.parse(`${basisDate}T00:00:00.000Z`);
  const target = Date.parse(`${deadline}T00:00:00.000Z`);

  if (Number.isNaN(basis) || Number.isNaN(target)) {
    return 0;
  }

  return Math.max(0, Math.round((basis - target) / 86_400_000));
}

export function buildGlobalSearchResults({
  deliveryOrders,
  purchaseOrders,
  purchaseRequests,
  query,
  tasks,
  users,
}: {
  deliveryOrders: DeliveryOrder[];
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
  query: string;
  tasks: LogisticsTask[];
  users: AppUserRow[];
}): GlobalSearchResult[] {
  const normalizedQuery = normalizeSearch(query);
  const results: GlobalSearchResult[] = [];

  for (const request of purchaseRequests) {
    if (
      !matchesSearch(normalizedQuery, [
        request.requested_order_id,
        request.item_code,
        request.item_name,
        request.production_contract_number,
        request.requester.name,
        request.purchasing_manager.name,
        request.status,
        ...(request.flow_tags ?? []),
        ...request.line_items.flatMap((line) => [line.item_code, line.item_name]),
      ])
    ) {
      continue;
    }

    results.push({
      href: `/purchase-requests?pr=${encodeURIComponent(request.requested_order_id)}`,
      id: request.id,
      kind: 'purchase_request',
      meta: request.priority,
      status: request.status,
      subtitle: `${request.item_code} - ${request.item_name}`,
      title: request.requested_order_id,
    });
  }

  for (const order of purchaseOrders) {
    if (
      !matchesSearch(normalizedQuery, [
        order.po_number,
        order.supplier_code,
        order.supplier_name,
        order.status,
        order.sap_sync_status,
        ...order.source_pr_codes,
        ...order.linked_do_numbers,
        ...(order.flow_tags ?? []),
        ...order.line_items.flatMap((line) => [line.item_code, line.item_name, line.source_pr_code]),
      ])
    ) {
      continue;
    }

    results.push({
      href: `/purchase-orders?po=${encodeURIComponent(order.po_number)}`,
      id: order.id,
      kind: 'purchase_order',
      meta: order.supplier_code,
      status: order.status,
      subtitle: `${order.supplier_name} - ${order.currency} ${order.total_amount.toLocaleString('en-US')}`,
      title: order.po_number,
    });
  }

  for (const order of deliveryOrders) {
    if (
      !matchesSearch(normalizedQuery, [
        order.order_info.order_number,
        order.order_info.request_code,
        order.order_info.tracking_number,
        order.order_info.status,
        order.sap_integration.po_number,
        order.sap_integration.supplier_code,
        order.sap_integration.supplier_name,
        order.product_details.item_name_requested,
        ...(order.flow_tags ?? []),
        ...order.source_lines.flatMap((line) => [line.po_number, line.request_code, line.item_code, line.item_name]),
      ])
    ) {
      continue;
    }

    results.push({
      href: `/delivery-orders?do=${encodeURIComponent(order.order_info.order_number)}`,
      id: order.id,
      kind: 'delivery_order',
      meta: order.warehouse_tracking.warehouse_code,
      status: order.order_info.status,
      subtitle: `${order.order_info.request_code} - ETA ${order.logistics_shipping.eta_planned ?? 'N/A'}`,
      title: order.order_info.order_number,
    });
  }

  for (const task of tasks) {
    if (
      !matchesSearch(normalizedQuery, [
        task.task_id,
        task.task_name,
        task.do_number,
        task.request_code,
        task.po_number,
        task.role,
        task.assignee.name,
        task.status,
        task.blocked_reason,
      ])
    ) {
      continue;
    }

    results.push({
      href: `/tasks?task=${encodeURIComponent(task.task_id)}`,
      id: task.task_id,
      kind: 'task',
      meta: task.role,
      status: task.status,
      subtitle: `${task.assignee.name} - ${task.do_number}`,
      title: task.task_name,
    });
  }

  for (const user of users) {
    if (!matchesSearch(normalizedQuery, [user.full_name, user.email, user.role, user.position, user.department])) {
      continue;
    }

    results.push({
      href: `/settings?section=accounts&account=${encodeURIComponent(user.id)}`,
      id: user.id,
      kind: 'account',
      meta: user.department,
      status: user.role,
      subtitle: `${user.email} - ${user.department}`,
      title: user.full_name,
    });
  }

  return results.slice(0, 12);
}

function matchesSearch(normalizedQuery: string, values: Array<string | null | undefined>) {
  return values.some((value) => normalizeSearch(value ?? '').includes(normalizedQuery));
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function buildDashboardStats({
  purchaseRequests,
  purchaseOrders,
  deliveryOrders,
  tasks,
}: {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  deliveryOrders: DeliveryOrder[];
  tasks: LogisticsTask[];
}): DashboardStats {
  const deliveryStatusCounter = new Map<DeliveryOrder['order_info']['status'], number>();
  const taskStatusCounter = new Map<LogisticsTask['status'], number>();
  const taskRoleCounter = new Map<LogisticsTask['role'], { completed: number; total: number }>();
  const monthCounter = new Map<string, { deliveryOrders: number; completedTasks: number }>();
  const businessFlowCounter = new Map<BusinessFlowTag, number>();

  for (const order of deliveryOrders) {
    deliveryStatusCounter.set(
      order.order_info.status,
      (deliveryStatusCounter.get(order.order_info.status) ?? 0) + 1,
    );

    const month = order.logistics_shipping.eta_planned?.slice(0, 7) ?? 'No ETA';
    const monthData = monthCounter.get(month) ?? { deliveryOrders: 0, completedTasks: 0 };
    monthData.deliveryOrders += 1;
    monthCounter.set(month, monthData);

    for (const tag of order.flow_tags) {
      businessFlowCounter.set(tag, (businessFlowCounter.get(tag) ?? 0) + 1);
    }
  }

  for (const task of tasks) {
    taskStatusCounter.set(task.status, (taskStatusCounter.get(task.status) ?? 0) + 1);

    const roleData = taskRoleCounter.get(task.role) ?? { completed: 0, total: 0 };
    roleData.total += 1;
    if (task.status === 'COMPLETED') {
      roleData.completed += 1;
    }
    taskRoleCounter.set(task.role, roleData);

    if (task.completed_at) {
      const month = task.completed_at.slice(0, 7);
      const monthData = monthCounter.get(month) ?? { deliveryOrders: 0, completedTasks: 0 };
      monthData.completedTasks += 1;
      monthCounter.set(month, monthData);
    }
  }

  return {
    totals: {
      purchaseRequests: purchaseRequests.length,
      purchaseOrders: purchaseOrders.length,
      deliveryOrders: deliveryOrders.length,
      tasks: tasks.length,
      blockedTasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    },
    deliveryOrderStatus: Array.from(deliveryStatusCounter.entries()).map(([status, count]) => ({ status, count })),
    taskStatus: Array.from(taskStatusCounter.entries()).map(([status, count]) => ({ status, count })),
    taskRoleProgress: Array.from(taskRoleCounter.entries()).map(([role, payload]) => ({
      role,
      total: payload.total,
      completed: payload.completed,
      completionRate: payload.total > 0 ? Math.round((payload.completed / payload.total) * 100) : 0,
    })),
    monthlyThroughput: Array.from(monthCounter.entries())
      .map(([month, payload]) => ({
        month,
        deliveryOrders: payload.deliveryOrders,
        completedTasks: payload.completedTasks,
      }))
      .sort((left, right) => left.month.localeCompare(right.month)),
    businessFlowCounts: Array.from(businessFlowCounter.entries()).map(([tag, count]) => ({ tag, count })),
  };
}
