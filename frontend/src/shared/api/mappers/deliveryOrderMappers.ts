import { DeliveryOrderLineV1, DeliveryOrderLotV1, DeliveryOrderV1 } from '../deliveryOrders';
import { DeliveryOrder, DeliveryOrderStatus, DeliverySourceLine } from '@shared/model/logistics';
import { dateOnly, deliveryOrderNo, toNumber, uiId } from './mapperShared';

export type CreateDeliveryOrderPayload = {
  documentsList?: string[];
  etaPlanned?: string | null;
  etdPlanned?: string | null;
  incoterms?: string;
  itemCode?: string;
  itemName?: string;
  notes?: string;
  plannedEntryDate?: string | null;
  poNumber?: string;
  portOfDeparture?: string;
  portOfDestination?: string;
  purchaseContractNumber?: string;
  quantity?: number;
  requestCode?: string;
  shippingLine?: string | null;
  shippingMethod?: DeliveryOrder['logistics_shipping']['shipping_method'];
  supplierCode?: string | null;
  supplierName?: string | null;
  trackingNumber?: string | null;
  unit?: string;
  warehouseCode?: string;
  warehouseDeadline?: string;
  sourceLines?: Array<{
    poNumber: string;
    poLineId: string;
    quantity: number;
  }>;
};

export function mapDeliveryOrderStatus(status: DeliveryOrderV1['status']): DeliveryOrderStatus {
  if (status === 'SHIPPED') return 'IN_TRANSIT';
  return status;
}

export function inferShippingMethod(deliveryOrder: DeliveryOrderV1): DeliveryOrder['logistics_shipping']['shipping_method'] {
  const modeType = (
    deliveryOrder.transport_mode?.mode_type ??
    deliveryOrder.transport_mode?.mode_code ??
    ''
  ).toUpperCase();
  if (modeType === 'AIR') return 'AIR';
  if (modeType === 'ROAD' || modeType === 'TRUCKING' || modeType.includes('TRUCK')) return 'ROAD';
  return 'SEA';
}

export function transportModeIdFromShippingMethod(
  shippingMethod: DeliveryOrder['logistics_shipping']['shipping_method'] | undefined,
) {
  if (shippingMethod === 'AIR') return 'tm_air';
  if (shippingMethod === 'ROAD') return 'tm_road';
  if (shippingMethod === 'SEA') return 'tm_sea';
  return undefined;
}

export function resolveDestinationPort(deliveryOrder: DeliveryOrderV1, firstLot?: DeliveryOrderLotV1 | null) {
  const explicitPort = firstLot?.po_lot?.destination_port ?? firstLot?.lot?.destination_port;
  if (explicitPort) return explicitPort;

  const destination = deliveryOrder.destination_address ?? '';
  if (/port|cang|cảng|cat\s?lai|cát\s?lái/i.test(destination)) {
    return destination;
  }

  return inferShippingMethod(deliveryOrder) === 'AIR' ? 'Tan Son Nhat Airport' : 'CatLai Port';
}

export function mapDeliverySourceLine(deliveryOrder: DeliveryOrderV1, line: DeliveryOrderLineV1): DeliverySourceLine {
  const purchaseOrder = deliveryOrder.purchase_order;
  const purchaseOrderLine = line.purchase_order_line;
  const item = line.item ?? purchaseOrderLine?.item ?? null;
  const orderNo = deliveryOrderNo(deliveryOrder);
  const shipmentContainer = Array.isArray(line.shipment?.container_no)
    ? line.shipment.container_no.filter(Boolean).join(', ')
    : line.shipment?.container_no;
  const lineQuantity = toNumber(line.qty);
  const orderedQuantity = toNumber(purchaseOrderLine?.qty_ordered);
  const lineGrossWeight = toNumber(purchaseOrderLine?.gross_weight_kg);
  const allocatedWeight =
    lineGrossWeight > 0 && orderedQuantity > 0
      ? (lineGrossWeight * lineQuantity) / orderedQuantity
      : lineGrossWeight || null;

  return {
    id: line.id,
    do_number: orderNo,
    lot_number: line.lot_no ?? line.lot?.lot_no ?? null,
    shipment_number: line.shipment_number ?? line.shipment?.shipment_no ?? deliveryOrder.linked_shipment_number ?? null,
    item_code: item?.item_code ?? line.item_id,
    item_name: item?.item_name ?? line.item_description ?? '',
    hs_code: line.hs_code ?? purchaseOrderLine?.item_customs_profile?.hs_code ?? null,
    po_line_id: line.purchase_order_line_id,
    po_number: purchaseOrder?.po_no ?? deliveryOrder.purchase_order_id,
    pr_line_id: '',
    quantity: lineQuantity,
    ordered_quantity: orderedQuantity || null,
    request_code: purchaseOrder?.po_no ?? orderNo,
    unit: line.unit,
    weight_kg: allocatedWeight,
    container_count: purchaseOrder?.total_containers ?? purchaseOrder?.lot_summary?.total_containers ?? null,
    container_no: line.container_no ?? shipmentContainer ?? null,
    route_origin: line.route_origin ?? line.shipment?.pol ?? deliveryOrder.origin_address ?? null,
    route_destination: line.route_destination ?? line.shipment?.pod ?? deliveryOrder.destination_address ?? null,
    etd: dateOnly(line.etd ?? line.shipment?.etd ?? deliveryOrder.planned_etd),
    eta: dateOnly(line.eta ?? line.shipment?.eta ?? deliveryOrder.planned_eta),
  };
}

export function mapV1DeliveryOrder(deliveryOrder: DeliveryOrderV1): DeliveryOrder {
  const sourceLines = (deliveryOrder.lines ?? []).map((line) => mapDeliverySourceLine(deliveryOrder, line));
  const firstLine = sourceLines[0];
  const totalQuantity = sourceLines.reduce((total, line) => total + line.quantity, 0);
  const purchaseOrder = deliveryOrder.purchase_order;
  const supplier = purchaseOrder?.supplier;
  const firstLot = deliveryOrder.lots?.[0];
  const firstLotNo = firstLot?.lot_no ?? firstLot?.lot?.lot_no ?? firstLot?.po_lot?.lot_no ?? null;
  const plannedEta = dateOnly(deliveryOrder.planned_eta);
  const plannedEtd = dateOnly(deliveryOrder.planned_etd);
  const plannedCargoReady = dateOnly(deliveryOrder.planned_cargo_ready_date);
  const warehouseDeadline = plannedEta || plannedCargoReady || plannedEtd || dateOnly(deliveryOrder.create_at);
  const orderNo = deliveryOrderNo(deliveryOrder);

  return {
    id: deliveryOrder.id,
    flow_tags: deliveryOrder.lots && deliveryOrder.lots.length > 1 ? ['PARTIAL_DELIVERY'] : ['LINEAR'],
    linked_shipment_number: deliveryOrder.linked_shipment_number ?? deliveryOrder.shipments?.[0]?.shipment_no ?? null,
    logistics_shipping: {
      cut_off_date: null,
      documents_list: [],
      etd_planned: plannedEtd || null,
      eta_planned: plannedEta || null,
      incoterms: purchaseOrder?.incoterm?.incoterm_code ?? '',
      missing_documents: [],
      port_of_departure: deliveryOrder.origin_address ?? '',
      port_of_destination: resolveDestinationPort(deliveryOrder, firstLot),
      shipping_line: null,
      shipping_method: inferShippingMethod(deliveryOrder),
      vessel_code: null,
    },
    order_info: {
      notes: deliveryOrder.notes ?? '',
      order_number: orderNo,
      purchase_contract_number: purchaseOrder?.contract_no ?? '',
      request_code: purchaseOrder?.po_no ?? orderNo,
      status: mapDeliveryOrderStatus(deliveryOrder.status),
      tracking_number: null,
      xnk_notes: '',
    },
    product_details: {
      item_name_requested: firstLine?.item_name ?? '',
      lot_number: firstLotNo,
      lot_unit_quantity: firstLot ? totalQuantity : null,
      lot_unit_type: firstLine?.unit ?? null,
      packaging_type: null,
      quantity: totalQuantity,
      unit: firstLine?.unit ?? '',
    },
    sap_integration: {
      actual_item_code: firstLine?.item_code ?? null,
      po_number: purchaseOrder?.po_no ?? null,
      raw_date: dateOnly(deliveryOrder.create_at),
      supplier_code: supplier?.supplier_code ?? null,
      supplier_name: supplier?.supplier_name ?? null,
      sync_status: 'SYNCED',
    },
    source_lines: sourceLines,
    source_lot_id: firstLot?.po_lot_id,
    source_lot_no: firstLotNo ?? undefined,
    source_po_number: purchaseOrder?.po_no,
    task_summary: {
      blocked_tasks: 0,
      completed_tasks: deliveryOrder.status === 'CLOSED' ? 1 : 0,
      required_tasks_remaining: deliveryOrder.status === 'CLOSED' || deliveryOrder.status === 'CANCELLED' ? 0 : 1,
      total_tasks: 1,
    },
    warehouse_tracking: {
      actual_entry_date: deliveryOrder.status === 'CLOSED' ? dateOnly(deliveryOrder.update_at) : null,
      delay_days: 0,
      planned_entry_date: plannedEta || null,
      production_ready_date: plannedCargoReady || null,
      warehouse_code: deliveryOrder.warehouse_name ?? '',
      warehouse_deadline: warehouseDeadline,
    },
    finance_tax: {
      currency: purchaseOrder?.currency?.currency_code ?? 'USD',
      import_tax_rate: null,
      insurance: null,
      tax_amount: null,
      tax_payment_deadline: null,
    },
  };
}

export function buildUiDeliveryOrder(payload: CreateDeliveryOrderPayload): DeliveryOrder {
  return {
    id: uiId('do'),
    source_po_number: payload.poNumber,
    source_lines: [],
    order_info: {
      request_code: payload.requestCode || '',
      order_number: payload.requestCode || uiId('DO'),
      tracking_number: payload.trackingNumber ?? null,
      purchase_contract_number: payload.purchaseContractNumber || '',
      status: 'DRAFT',
      notes: payload.notes || '',
      xnk_notes: '',
    },
    product_details: {
      item_name_requested: payload.itemName || '',
      unit: payload.unit || '',
      quantity: payload.quantity || 0,
      lot_number: null,
      lot_unit_quantity: null,
      lot_unit_type: null,
      packaging_type: null,
    },
    sap_integration: {
      supplier_code: payload.supplierCode ?? null,
      supplier_name: payload.supplierName ?? null,
      actual_item_code: payload.itemCode ?? null,
      raw_date: null,
      po_number: payload.poNumber ?? null,
      sync_status: 'SYNCED',
    },
    logistics_shipping: {
      incoterms: payload.incoterms || '',
      shipping_method: payload.shippingMethod || 'SEA',
      shipping_line: payload.shippingLine ?? null,
      vessel_code: null,
      port_of_departure: payload.portOfDeparture || '',
      port_of_destination: payload.portOfDestination || '',
      documents_list: payload.documentsList ?? [],
      missing_documents: [],
      cut_off_date: null,
      etd_planned: payload.etdPlanned ?? null,
      eta_planned: payload.etaPlanned ?? null,
    },
    warehouse_tracking: {
      warehouse_code: payload.warehouseCode || '',
      production_ready_date: null,
      warehouse_deadline: payload.warehouseDeadline || '',
      planned_entry_date: payload.plannedEntryDate ?? null,
      actual_entry_date: null,
      delay_days: 0,
    },
    finance_tax: {
      import_tax_rate: null,
      tax_amount: null,
      currency: 'USD',
      tax_payment_deadline: null,
      insurance: null,
    },
    task_summary: {
      total_tasks: 0,
      completed_tasks: 0,
      blocked_tasks: 0,
      required_tasks_remaining: 0,
    },
    flow_tags: ['LINEAR'],
  };
}
