import type {
  BusinessFlowTag,
  DeliveryOrder,
  DeliverySourceLine,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseRequest,
  PurchaseRequestLineItem,
} from '../domain/logistics';

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

export function classifyPurchaseOrders(purchaseOrders: PurchaseOrder[], deliveryOrders: DeliveryOrder[]) {
  const purchaseOrdersByPr = new Map<string, number>();
  for (const order of purchaseOrders) {
    for (const prCode of order.source_pr_codes) {
      purchaseOrdersByPr.set(prCode, (purchaseOrdersByPr.get(prCode) ?? 0) + 1);
    }
  }
  const consolidatedDeliveryOrders = new Map(
    deliveryOrders.map((deliveryOrder) => [
      deliveryOrder.order_info.order_number,
      new Set(deliveryOrder.source_lines.map((line) => line.po_number)).size > 1,
    ]),
  );

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

    if (order.linked_do_numbers.some((orderNumber) => consolidatedDeliveryOrders.get(orderNumber))) {
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
