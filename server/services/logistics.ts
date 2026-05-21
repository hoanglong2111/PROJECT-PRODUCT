import { randomUUID } from 'node:crypto';

import type {
  DeliveryOrder,
  LogisticsTask,
  PurchaseOrder,
  PurchaseRequest,
} from '../../src/models/logistics';
import { REQUIRED_DOCUMENTS } from '../constants';
import { pool } from '../db';
import { ApiError } from '../errors';
import { normalizeCurrencyCode } from './exchangeRates';
import { readSnapshot, writeSnapshot } from './logisticsSnapshots';
import {
  addDays,
  appendUnique,
  buildDefaultDeliveryTasks,
  calculateDelayDays,
  isDispatchGatePassed,
  nextBusinessCode,
  normalizeDeliveryOrderSourceLines,
  normalizeDocuments,
  normalizeShippingMethod,
  optionalDate,
  optionalNonNegativeNumber,
  optionalString,
  requiredDate,
  requiredPositiveNumber,
  requiredString,
  resolveOriginalWarehouseDeadline,
  summarizeLogisticsTasks,
  syncPurchaseOrderStatuses,
  todayIso,
  withOperationalClosureState,
} from './logisticsHelpers';
import {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from './logisticsTransforms';

export { readSnapshot, writeSnapshot } from './logisticsSnapshots';
export {
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
} from './logisticsTransforms';
export { buildDashboardStats, buildGlobalSearchResults } from './logisticsReporting';
export { fetchExchangeRates, normalizeCurrencyCode } from './exchangeRates';
import type { CreateDeliveryOrderBody, UpdateDeliveryOrderBody } from '../types';

export { createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus } from './logisticsPurchaseRequests';

export { createPurchaseOrder, syncPurchaseOrderWithSap } from './logisticsPurchaseOrders';


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


export async function updateDeliveryOrder(orderNumber: string, body: UpdateDeliveryOrderBody) {
  if (!orderNumber) {
    throw new ApiError(400, 'orderNumber là bắt buộc.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [deliveryOrdersRaw, tasks, purchaseOrdersRaw, purchaseRequestsRaw] = await Promise.all([
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<LogisticsTask[]>('tasks', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
      readSnapshot<PurchaseRequest[]>('purchase_requests', client),
    ]);
    const deliveryOrders = deliveryOrdersRaw.map(normalizeDeliveryOrder);
    const purchaseOrders = purchaseOrdersRaw.map(normalizePurchaseOrder);
    const purchaseRequests = purchaseRequestsRaw.map(normalizePurchaseRequest);

    const orderIndex = deliveryOrders.findIndex((order) => order.order_info.order_number === orderNumber);
    if (orderIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy DO cần cập nhật.');
    }

    const current = deliveryOrders[orderIndex];
    if (current.order_info.status === 'DELIVERED') {
      throw new ApiError(409, 'DO đã hoàn tất và bị khóa chỉnh sửa.');
    }
    const customsGatePassed = await isDispatchGatePassed(current.id, client);

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
    const delayDeadline = actualEntryDate
      ? resolveOriginalWarehouseDeadline(current, purchaseRequests, warehouseDeadline)
      : warehouseDeadline;

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
        delay_days: calculateDelayDays(actualEntryDate ?? plannedEntryDate, delayDeadline),
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
    const updatedOrder = withOperationalClosureState(updatedOrderBase, orderTasks, customsGatePassed);
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

export { attachDeliveryOrderDocument, listDeliveryOrderAttachments } from './logisticsAttachments';
export { updateTask } from './logisticsTasks';
