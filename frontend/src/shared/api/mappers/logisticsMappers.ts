// Domain mappers carved out of api/logistics.ts (V1 DTO -> legacy UI model).
// Sections: shared helpers, purchase orders, tasks, quotations, delivery orders, shipments.

import { DeliveryOrderLineV1, DeliveryOrderLotV1, DeliveryOrderV1, fetchDeliveryOrdersV1 } from '../deliveryOrders';
import { PurchaseOrderLineV1, PurchaseOrderV1 } from '../purchaseOrders';
import { QuotationChargeLineV1, QuotationChargeTypeV1, QuotationStatusV1, QuotationTypeV1, QuotationV1 } from '../quotations';
import { ShipmentCostV1, ShipmentDocumentStatusV1, ShipmentDocumentV1, ShipmentLoadTypeV1, ShipmentMilestoneV1, ShipmentModeV1, ShipmentV1, fetchShipmentsV1 } from '../shipments';
import { fetchCurrencies, fetchSuppliers } from '../tradeMasterData';
import { BusinessFlowTag, DeliveryOrder, DeliveryOrderStatus, DeliverySourceLine, Gd1PoStageTask, Gd1TaskStatus, LogisticsTask, LogisticsTaskTemplateRef, Priority, PurchaseOrder, PurchaseOrderLineItem, PurchaseOrderStatus, Quotation, QuotationStatus, ShipmentCost, ShipmentDocument, ShipmentMilestone, ShipmentRecord, ShipmentStatus, ShippingMode, TaskRole, TaskStatus } from '@shared/model/logistics';

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

export type CreatePurchaseOrderPayload = {
  currency: string;
  expectedEta?: string | null;
  expectedEtd?: string | null;
  incoterm?: string;
  orderDate?: string;
  paymentTerm?: string;
  poNumber: string;
  poType?: string;
  sourceLines?: Array<{
    classificationCode?: string;
    coNote?: string;
    declarationType?: string;
    dutyRate?: number;
    hsCode?: string;
    itemCode?: string;
    itemGroup?: string;
    itemName?: string;
    quantity?: number;
    sourceReference?: string;
    tariffCode?: string;
    taxNote?: string;
    unit?: string;
    vatRate?: number;
    lotNumber?: string;
    itemId?: string;
    expectedEta?: string | null;
    unitPrice?: number;
  }>;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
};

export type CreateQuotationPayload = {
  requestCode: string;
  shippingMode: ShippingMode;
  quoteAmount?: number | null;
  currency?: string | null;
  /**
   * Itemized Incoterms-aware charge lines. When provided, these are persisted
   * verbatim and the legacy flat freight/local/customs fields are ignored.
   */
  chargeLines?: QuotationChargeLineInput[];
};

export type QuotationChargeLineInput = {
  charge_type: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price: number;
};

export type TaskScreenItem = {
  id: string;
  task_no: string;
  task_name: string;
  ref_type: 'PURCHASE_ORDER' | string;
  ref_id: string;
  ref_no: string;
  stage: TaskScreenStage;
  role: TaskRole;
  assignee: {
    id?: string;
    user_id?: string;
    name: string;
    department: string | null;
  };
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  completed_at: string | null;
  progress: number;
  blocked_reason: string | null;
  note?: string | null;
  description?: string | null;
  task_template_id?: string | null;
  milestone_code?: string | null;
  department?: string | null;
  sla_hours?: number | null;
  sla_text?: string | null;
  related_documents?: string | null;
  template_group_code?: string | null;
  template_group_name?: string | null;
  create_at?: string;
  update_at?: string;
};

export type TaskScreenStage =
  | 'SUPPLIER_CONFIRMATION'
  | 'LOT_PLANNING'
  | 'INTERNAL_DO'
  | 'QUOTATION'
  | 'SHIPMENT'
  | 'CUSTOMS'
  | 'CARRIER_DO'
  | 'DTO';

export function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function sumNumbers(values: unknown[]) {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

export function deliveryOrderNo(deliveryOrder: DeliveryOrderV1) {
  return deliveryOrder.do_no ?? deliveryOrder.delivery_order_no ?? deliveryOrder.id;
}

export function uiId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function inferPoFlowTags(purchaseOrder: PurchaseOrderV1): BusinessFlowTag[] {
  if ((purchaseOrder.lines ?? []).some((line) => toNumber(line.qty_lotted) > 0 && toNumber(line.qty_lotted) < toNumber(line.qty_ordered))) {
    return ['PARTIAL_DELIVERY'];
  }
  return ['LINEAR'];
}

export function mapV1PurchaseOrderLine(line: PurchaseOrderLineV1): PurchaseOrderLineItem {
  const item = line.item;
  const customsProfile = line.item_customs_profile;

  return {
    classification_code: customsProfile?.customs_type ?? undefined,
    co_note: customsProfile?.co_tax_note ?? undefined,
    declaration_type: customsProfile?.customs_type ?? undefined,
    duty_rate: toNumber(customsProfile?.import_duty_rate),
    expected_eta: dateOnly(line.expected_eta_line) || null,
    hs_code: customsProfile?.hs_code ?? undefined,
    id: line.id,
    item_code: item?.item_code ?? line.item_id,
    item_group: undefined,
    item_id: line.item_id,
    item_name: item?.item_name ?? line.item_description ?? '',
    lot_number: null,
    quantity: toNumber(line.qty_ordered),
    source_pr_code: '',
    source_pr_line_id: '',
    source_reference: line.purchase_order_id,
    tariff_code: customsProfile?.reference_doc_no ?? undefined,
    tax_note: customsProfile?.tax_note ?? undefined,
    unit: line.unit ?? '',
    unit_price: toNumber(line.unit_price),
    vat_rate: toNumber(customsProfile?.vat_rate),
    warehouse_code: '',
    warehouse_deadline_date: dateOnly(line.expected_eta_line),
  };
}

export function mapV1PurchaseOrder(purchaseOrder: PurchaseOrderV1, linkedDoNumbers: string[] = []): PurchaseOrder {
  const lineItems = (purchaseOrder.lines ?? []).map(mapV1PurchaseOrderLine);
  const totalAmount = lineItems.reduce(
    (total, line) => total + line.quantity * toNumber(line.unit_price),
    0,
  );

  return {
    currency: purchaseOrder.currency?.currency_code ?? '',
    expected_eta: dateOnly(purchaseOrder.expected_eta) || null,
    expected_etd: dateOnly(purchaseOrder.expected_etd) || null,
    flow_tags: inferPoFlowTags(purchaseOrder),
    id: purchaseOrder.id,
    incoterm: purchaseOrder.incoterm?.incoterm_code ?? undefined,
    line_items: lineItems,
    linked_do_numbers: linkedDoNumbers,
    lots: [],
    order_date: dateOnly(purchaseOrder.create_at),
    payment_term: purchaseOrder.payment_term ?? undefined,
    po_number: purchaseOrder.po_no,
    po_type: purchaseOrder.po_type as PurchaseOrder['po_type'],
    sap_sync_status: 'SYNCED',
    sent_at: purchaseOrder.sent_at,
    source_pr_codes: [],
    status: purchaseOrder.status as PurchaseOrderStatus,
    supplier_code: purchaseOrder.supplier?.supplier_code ?? purchaseOrder.supplier_id,
    supplier_name: purchaseOrder.supplier?.supplier_name ?? '',
    total_amount: totalAmount,
    version: 1,
    warehouse_code: '',
    confirmed_date: purchaseOrder.confirmed_at,
  };
}

export function mapTaskScreenToTemplateRef(task: TaskScreenItem): LogisticsTaskTemplateRef | null {
  if (!task.task_template_id) return null;

  return {
    task_template_id: task.task_template_id,
    group_code: task.template_group_code ?? null,
    group_name: task.template_group_name ?? null,
    milestone_code: task.milestone_code ?? null,
    department: task.department ?? null,
    sla_hours: task.sla_hours ?? null,
    sla_text: task.sla_text ?? null,
    related_documents: task.related_documents ?? null,
  };
}

export function mapTaskScreenToLogisticsTask(task: TaskScreenItem): LogisticsTask {
  const assigneeId = task.assignee.id ?? task.assignee.user_id ?? '';

  return {
    assigned_at: task.create_at ?? null,
    assignee: {
      department: task.assignee.department ?? '',
      name: task.assignee.name,
      user_id: assigneeId,
    },
    blocked_reason: task.blocked_reason ?? null,
    completed_at: task.completed_at,
    created_at: task.create_at ?? '',
    do_number: task.ref_no,
    due_date: dateOnly(task.due_at) || '',
    hbl_number: null,
    notes: task.note ?? task.description ?? '',
    po_number: task.ref_type === 'PURCHASE_ORDER' ? task.ref_no : null,
    priority: task.priority,
    production_contract_number: task.ref_id,
    progress: toNumber(task.progress),
    request_code: task.ref_no,
    role: task.role,
    status: task.status,
    task_id: task.id,
    task_name: task.task_name,
    task_template_id: task.task_template_id ?? null,
    template: mapTaskScreenToTemplateRef(task),
  };
}

export function taskScreenStatusToGd1(status: TaskStatus): Gd1TaskStatus {
  if (status === 'COMPLETED') return 'DONE';
  if (status === 'TODO') return 'PENDING';
  if (status === 'WAITING') return 'PENDING';
  return status as Gd1TaskStatus;
}

export function gd1StatusToTaskScreen(status: string): TaskStatus {
  if (status === 'DONE') return 'COMPLETED';
  if (status === 'PENDING') return 'PENDING';
  return status as TaskStatus;
}

export function mapTaskScreenToPoStageTask(task: TaskScreenItem): Gd1PoStageTask {
  const assigneeId = task.assignee.id ?? task.assignee.user_id ?? '';

  return {
    assigned_by: 'mock-api',
    assignee_id: assigneeId,
    completed_at: task.completed_at,
    completed_by: task.completed_at ? assigneeId : null,
    created_at: task.create_at ?? '',
    due_date: dateOnly(task.due_at) || null,
    id: task.id,
    linked_shipment_milestone: null,
    note: task.note ?? null,
    po_stage: task.stage as Gd1PoStageTask['po_stage'],
    purchase_order_id: task.ref_id,
    started_at: task.status === 'IN_PROGRESS' ? task.update_at ?? task.create_at ?? null : null,
    status: taskScreenStatusToGd1(task.status),
    task_name: task.task_name,
    task_template_id: task.task_template_id ?? null,
    template_milestone_code: task.milestone_code ?? null,
    template_department: task.department ?? null,
    tenant_id: null,
    updated_at: task.update_at ?? '',
  };
}

export function quotationStatusToUi(status: QuotationStatusV1): QuotationStatus {
  const statusMap: Record<QuotationStatusV1, QuotationStatus> = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'OFFICIAL_SENT',
    PENDING_ADJUSTMENT: 'OFFICIAL_SENT',
    CONFIRMED: 'APPROVED',
    REJECTED: 'REJECTED',
  };

  return statusMap[status];
}

export function inferQuotationShippingMode(quotation: QuotationV1): ShippingMode {
  const lines = quotation.charge_lines ?? [];
  const chargeTypes = new Set(lines.map((line) => line.charge_type));
  if (chargeTypes.has('AIR_FREIGHT')) return 'AIR';
  // Fall back to the per-line pricing basis (CONT/RT/KGS) emitted by the
  // Incoterms-aware form, since the quotation record has no shipping-mode field.
  const units = new Set(lines.map((line) => (line.unit ?? '').toUpperCase()));
  if (units.has('KGS')) return 'AIR';
  if (units.has('RT') || chargeTypes.has('CFS')) return 'LCL';
  if (units.has('CONT')) return 'FCL';
  if (chargeTypes.has('TRUCKING')) return 'LCL';
  return 'FCL';
}

export function sumChargeLines(chargeLines: QuotationChargeLineV1[] | undefined, types: string[]) {
  const allowedTypes = new Set(types);
  return sumNumbers(
    (chargeLines ?? [])
      .filter((line) => allowedTypes.has(line.charge_type))
      .map((line) => line.total_amount ?? line.amount),
  );
}

export function mapV1Quotation(quotation: QuotationV1, requestCode?: string): Quotation & {
  carrierName?: string;
  chargeLines?: QuotationChargeLineV1[];
  customsFee?: number;
  freightCost?: number;
  isFinal?: boolean;
  isAllInclusive?: boolean;
  localCharges?: number;
  quotationGroupId?: string;
  version?: number;
} {
  const chargeLines = quotation.charge_lines ?? [];
  const freightCost = sumChargeLines(chargeLines, ['OCEAN_FREIGHT', 'AIR_FREIGHT', 'BREAKBULK_FREIGHT', 'ORIGIN_CHARGE']);
  const localCharges = sumChargeLines(chargeLines, [
    'LOCAL_CHARGE', 'TRUCKING', 'DO_FEE', 'HANDLING', 'THC', 'CIC', 'EMC_EMF', 'CLEANING', 'CFS',
    'LOWERING_FEE', 'LOADING_FEE', 'DEMURRAGE', 'DETENTION', 'WAREHOUSE', 'DOCUMENT_FEE',
  ]);
  const customsFee = sumChargeLines(chargeLines, ['CUSTOMS_FEE']);
  const quotationTotal = Number(quotation.grand_total_amount ?? quotation.total_amount);
  const chargeLineTotal = sumNumbers(chargeLines.map((line) => line.total_amount ?? line.amount));

  return {
    autoApproveAt: null,
    bookingConfirmedAt: quotation.confirmed_at,
    bookingNumber: quotation.is_final ? quotation.quotation_no : null,
    carrierName: quotation.supplier?.supplier_name ?? quotation.supplier_id,
    chargeLines,
    createdAt: quotation.create_at,
    createdBy: null,
    currency: quotation.currency?.currency_code ?? quotation.currency_code ?? quotation.currency_id ?? null,
    customerResponseAt: quotation.confirmed_at ?? quotation.rejected_at ?? quotation.cancelled_at,
    customsFee,
    freightCost,
    id: quotation.id,
    isFinal: quotation.is_final,
    isAllInclusive: quotation.quotation_type === 'MIXED',
    localCharges,
    officialDueAt: quotation.valid_until ?? addDaysIso(3),
    officialSentAt: quotation.submitted_at,
    preliminaryDueAt: quotation.quoted_at ?? addDaysIso(1),
    preliminarySentAt: quotation.quoted_at,
    quoteAmount: Number.isFinite(quotationTotal) ? quotationTotal : chargeLineTotal,
    quoteNumber: quotation.version > 1 ? `${quotation.quotation_no} v${quotation.version}` : quotation.quotation_no,
    quotationGroupId: quotation.quotation_group_id,
    requestCode: requestCode ?? quotation.ref_id ?? '',
    shippingMode: inferQuotationShippingMode(quotation),
    status: quotationStatusToUi(quotation.status),
    updatedAt: quotation.update_at,
    version: quotation.version,
  };
}

export async function resolveDeliveryOrderId(value: string) {
  const response = await fetchDeliveryOrdersV1({ page: 1, limit: 100, search: value });
  const deliveryOrder = response.data.find((order) => order.id === value || deliveryOrderNo(order) === value);
  if (!deliveryOrder) {
    throw new Error(`Delivery order ${value} not found`);
  }
  return deliveryOrder.id;
}

export async function resolveSupplierId(value: string) {
  const response = await fetchSuppliers({ page: 1, limit: 100, role: 'FORWARDER', is_active: true });
  const suppliers = response.data.length > 0
    ? response.data
    : (await fetchSuppliers({ page: 1, limit: 100, is_active: true })).data;
  const supplier = suppliers.find(
    (item) => item.id === value || item.supplier_code === value || item.supplier_name === value,
  );
  if (!supplier) {
    throw new Error(`Forwarder ${value} not found`);
  }
  return supplier.id;
}

export async function resolveCurrencyId(value: string | null | undefined) {
  const currencyCode = value?.trim() || 'USD';
  const response = await fetchCurrencies({ page: 1, limit: 100, is_active: true });
  const currency = response.data.find(
    (item) => item.id === currencyCode || item.currency_code === currencyCode,
  );
  if (!currency) {
    throw new Error(`Currency ${currencyCode} not found`);
  }
  return currency.currency_code;
}

export async function resolveShipmentId(value: string) {
  const response = await fetchShipmentsV1({ page: 1, limit: 100, search: value });
  const shipment = response.data.find((item) => item.id === value || item.shipment_no === value);
  if (!shipment) {
    throw new Error(`Shipment ${value} not found`);
  }
  return shipment.id;
}

type BuiltQuotationChargeLine = {
  charge_type: QuotationChargeTypeV1;
  description: string;
  line_no: number;
  quantity: number;
  unit: string;
  unit_price: number;
};

export function buildQuotationChargeLines(payload: CreateQuotationPayload): BuiltQuotationChargeLine[] {
  // Preferred path: itemized Incoterms-aware lines from the form.
  if (Array.isArray(payload.chargeLines) && payload.chargeLines.length > 0) {
    return payload.chargeLines
      .filter((line) => toNumber(line.unit_price) > 0)
      .map((line, index) => ({
        charge_type: line.charge_type as QuotationChargeTypeV1,
        description: line.description,
        line_no: index + 1,
        quantity: toNumber(line.quantity) || 1,
        unit: line.unit || 'SET',
        unit_price: toNumber(line.unit_price),
      }));
  }

  // Legacy fallback: flat freight/local/customs aggregate fields.
  const shippingMode = payload.shippingMode.toUpperCase();
  const chargeLines: BuiltQuotationChargeLine[] = [];
  const addLine = (chargeType: QuotationChargeTypeV1, description: string, amount: number) => {
    if (amount <= 0) return;
    chargeLines.push({
      charge_type: chargeType,
      description,
      line_no: chargeLines.length + 1,
      quantity: 1,
      unit: 'SET',
      unit_price: amount,
    });
  };
  const mainFreight = toNumber((payload as any).freightCost) || toNumber(payload.quoteAmount);

  addLine(shippingMode.includes('AIR') ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT', 'Main freight', mainFreight);
  addLine('LOCAL_CHARGE', 'Local charges', toNumber((payload as any).localCharges));
  addLine('CUSTOMS_FEE', 'Customs clearance fee', toNumber((payload as any).customsFee));

  return chargeLines;
}

export function inferQuotationTypeFromChargeLines(chargeLines: ReturnType<typeof buildQuotationChargeLines>): QuotationTypeV1 {
  const types = new Set(chargeLines.map((line) => line.charge_type));
  if (types.size > 1) return 'MIXED';
  if (types.has('CUSTOMS_FEE')) return 'CUSTOMS';
  if (types.has('LOCAL_CHARGE')) return 'LOCAL_CHARGE';
  return 'FREIGHT';
}

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

export function buildUiQuotation(payload: CreateQuotationPayload): Quotation {
  const now = new Date().toISOString();

  return {
    id: uiId('quote'),
    quoteNumber: payload.requestCode || uiId('QUOTE'),
    requestCode: payload.requestCode,
    shippingMode: payload.shippingMode,
    status: 'DRAFT',
    preliminaryDueAt: now,
    preliminarySentAt: null,
    officialDueAt: now,
    officialSentAt: null,
    autoApproveAt: null,
    customerResponseAt: null,
    quoteAmount: payload.quoteAmount ?? null,
    currency: payload.currency ?? null,
    bookingNumber: null,
    bookingConfirmedAt: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeShipmentMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentRecord['shipping_mode'] {
  if (mode === 'AIR') return 'AIR';
  if (mode === 'ROAD' || mode === 'RAIL' || mode === 'MULTIMODAL' || mode === 'TRUCKING' || mode === 'OTHER') {
    return mode;
  }
  return 'SEA';
}

export function inferLoadTypeFromMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentLoadTypeV1 | null {
  const normalized = String(mode ?? '').toUpperCase();
  if (normalized.includes('FCL')) return 'FCL';
  if (normalized.includes('LCL')) return 'LCL';
  if (normalized.includes('FTL')) return 'FTL';
  if (normalized.includes('LTL')) return 'LTL';
  return null;
}

export function mapV1ShipmentMilestone(milestone: ShipmentMilestoneV1): ShipmentMilestone {
  return {
    actual_date: milestone.actual_at ?? milestone.actual_date ?? milestone.done_at ?? null,
    id: milestone.id,
    milestone_code: milestone.milestone_code as ShipmentMilestone['milestone_code'],
    note: milestone.notes ?? milestone.note ?? null,
    planned_date: milestone.planned_at ?? milestone.planned_date ?? null,
    source: milestone.source === 'API' || milestone.source === 'EMAIL' ? milestone.source : 'MANUAL',
  };
}

export function mapV1ShipmentDocumentStatus(status: ShipmentDocumentStatusV1): ShipmentDocument['status'] {
  return status;
}

export function mapV1ShipmentDocument(document: ShipmentDocumentV1): ShipmentDocument {
  return {
    file_name: document.file_name,
    id: document.id,
    document_type: document.document_type,
    reject_reason: document.status === 'REJECTED' ? document.notes ?? undefined : undefined,
    status: mapV1ShipmentDocumentStatus(document.status),
    uploaded_at: document.received_at ?? document.update_at ?? document.create_at,
  };
}

export function mapV1ShipmentCost(cost: ShipmentCostV1): ShipmentCost {
  return {
    id: cost.id,
    cost_type: cost.cost_type,
    description: cost.description ?? null,
    amount: toNumber(cost.amount),
    currency_code: cost.currency_code,
    exchange_rate: toNumber(cost.exchange_rate, 1),
    alloc_method: cost.alloc_method,
    invoice_ref: cost.invoice_ref ?? null,
    notes: cost.notes ?? null,
  };
}

type ShipmentRecordWithQuotation = ShipmentRecord & {
  final_quotation?: QuotationV1 | null;
};

export function mapV1Shipment(shipment: ShipmentV1): ShipmentRecordWithQuotation {
  const deliveryOrder = shipment.delivery_order;
  const purchaseOrder = deliveryOrder?.purchase_order;
  const vesselParts = [shipment.vessel_flight, shipment.voyage_no].filter(Boolean);

  // The customs channel (luồng xanh/vàng/đỏ) is only meaningful once the shipment has
  // cleared customs ("đã thông quan"). While in transit / pre-clearance there is no lane,
  // so we leave lane_status empty and every consumer (list, filter, detail) hides it.
  const hasCleared = shipment.status === 'CUSTOMS_CLEARED' || shipment.status === 'DELIVERED';

  return {
    carrier_name: shipment.carrier ?? shipment.forwarder?.forwarder_name ?? '',
    customs: {
      clearance_date: hasCleared ? dateOnly(shipment.update_at) : undefined,
      lane_status: hasCleared ? shipment.customs_channel ?? '' : '',
      stream: shipment.customs_channel ?? 'GREEN',
    },
    dest_port: shipment.pod ?? deliveryOrder?.destination_address ?? '',
    do_number: deliveryOrder ? deliveryOrderNo(deliveryOrder) : shipment.delivery_order_id,
    documents: (shipment.documents ?? []).map(mapV1ShipmentDocument),
    costs: (shipment.costs ?? []).map(mapV1ShipmentCost),
    final_quotation: shipment.final_quotation ?? null,
    etd: dateOnly(shipment.etd),
    eta: dateOnly(shipment.eta),
    atd: dateOnly(shipment.atd),
    ata: dateOnly(shipment.ata),
    bl_awb_no: shipment.bl_awb_no ?? '',
    id: shipment.id,
    milestones: (shipment.milestones ?? []).map(mapV1ShipmentMilestone),
    origin_port: shipment.pol ?? deliveryOrder?.origin_address ?? '',
    po_number: purchaseOrder?.po_no ?? deliveryOrder?.purchase_order_id ?? '',
    po_tasks: [],
    shipment_number: shipment.shipment_no,
    shipping_mode: normalizeShipmentMode(shipment.mode),
    load_type: shipment.load_type ?? inferLoadTypeFromMode(shipment.mode),
    status: shipment.status as ShipmentStatus,
    vessel_voyage: vesselParts.join(' / '),
  };
}

export function buildUiPurchaseOrder(payload: CreatePurchaseOrderPayload): PurchaseOrder {
  return {
    id: uiId('po'),
    po_number: payload.poNumber,
    source_pr_codes: [],
    line_items: [],
    supplier_code: payload.supplierCode,
    supplier_name: payload.supplierName,
    status: 'DRAFT',
    order_date: payload.orderDate || new Date().toISOString().slice(0, 10),
    currency: payload.currency,
    total_amount: payload.totalAmount,
    sap_sync_status: 'PENDING',
    linked_do_numbers: [],
    lots: [],
    po_type: payload.poType as PurchaseOrder['po_type'],
    incoterm: payload.incoterm,
    payment_term: payload.paymentTerm,
    expected_etd: payload.expectedEtd ?? null,
    expected_eta: payload.expectedEta ?? null,
    version: 1,
    sent_at: null,
    confirmed_date: null,
    warehouse_code: payload.warehouseCode,
    flow_tags: ['LINEAR'],
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

