import type {
  BusinessFlowTag,
  AdvanceSettlement,
  AdvanceSettlementStatus,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  DocumentReview,
  DriveDossier,
  DriveDossierStatus,
  EfmsControl,
  EfmsContainer,
  EfmsHouseBill,
  EfmsTransportRecord,
  FinanceCharge,
  FinanceChargeType,
  FinanceNote,
  CustomsDeclaration,
  CustomsChannel,
  CustomsLaneStatus,
  CustomsStatus,
  LogisticsTask,
  LogisticsTaskTemplateRef,
  MblType,
  Priority,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderLot,
  PurchaseOrderStatus,
  Quotation,
  QuotationStatus,
  ShippingMode,
  SlaStatus,
  TaskRole,
  TaskStatus,
  UserRef,
  Gd1ApprovalStep,
  Gd1PoStageTask,
  Gd1TaskStatus,
  Gd1ShipmentMilestone,
  Gd1ShipmentCost,
  Gd1PoStatus,
  Gd1MilestoneCode,
  ShipmentMilestone,
  ShipmentDocument,
  ShipmentCost,
  ShipmentPoTask,
  ShipmentStatus,
  ShipmentRecord,
} from '@shared/model/logistics';
import {
  fetchDeliveryOrdersV1,
  updateDeliveryOrderV1,
  type DeliveryOrderLotV1,
  type DeliveryOrderLineV1,
  type DeliveryOrderV1,
} from './deliveryOrders';
import {
  fetchPurchaseOrders as fetchPurchaseOrdersV1,
  type PurchaseOrderLineV1,
  type PurchaseOrderV1,
} from './purchaseOrders';
import {
  cancelQuotation,
  createDeliveryOrderQuotation,
  fetchQuotationV1,
  fetchQuotationsV1,
  markQuotationFinal,
  receiveQuotation,
  rejectQuotation,
  requestQuotation,
  submitQuotationToKbi,
  type QuotationChargeLineV1,
  type QuotationChargeTypeV1,
  type QuotationStatusV1,
  type QuotationTypeV1,
  type QuotationV1,
} from './quotations';
import {
  createShipmentFromDeliveryOrder,
  fetchShipmentMilestonesV1,
  fetchShipmentsV1,
  fetchShipmentV1,
  markShipmentMilestoneDone,
  updateShipmentV1,
  type CreateShipmentFromDeliveryOrderPayload,
  type ShipmentCostV1,
  type ShipmentDocumentStatusV1,
  type ShipmentDocumentV1,
  type ShipmentLoadTypeV1,
  type ShipmentMilestoneCodeV1,
  type ShipmentMilestoneV1,
  type ShipmentModeV1,
  type ShipmentV1,
} from './shipments';
import { fetchCurrencies, fetchSuppliers } from './tradeMasterData';
import { apiClient } from './axiosConfig';
import { parseContract, deliveryOrderScreenListSchema, shipmentRecordListSchema } from './contracts';

export type {
  BusinessFlowTag,
  AdvanceSettlement,
  AdvanceSettlementStatus,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  DocumentReview,
  DriveDossier,
  DriveDossierStatus,
  EfmsControl,
  EfmsContainer,
  EfmsHouseBill,
  EfmsTransportRecord,
  FinanceCharge,
  FinanceChargeType,
  FinanceNote,
  CustomsDeclaration,
  CustomsChannel,
  CustomsLaneStatus,
  CustomsStatus,
  LogisticsTask,
  LogisticsTaskTemplateRef,
  MblType,
  Priority,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderLot,
  PurchaseOrderStatus,
  Quotation,
  QuotationStatus,
  ShippingMode,
  SlaStatus,
  TaskRole,
  TaskStatus,
  UserRef,
  Gd1ApprovalStep,
  Gd1PoStageTask,
  Gd1ShipmentMilestone,
  Gd1ShipmentCost,
  Gd1PoStatus,
  Gd1MilestoneCode,
  ShipmentMilestone,
  ShipmentDocument,
  ShipmentCost,
  ShipmentPoTask,
  ShipmentStatus,
  ShipmentRecord,
};

type ApiResponse<T> = {
  data: T;
  errors?: unknown[];
  meta?: Record<string, unknown>;
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

export type UpdatePurchaseOrderLotAllocationPayload = {
  lots: Array<{
    id?: string;
    lotNo: string;
    doNumber?: string;
  }>;
  lineAllocations: Array<{
    poLineId: string;
    lotNo: string;
    quantity: number;
  }>;
};

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

export type UpdateDeliveryOrderPayload = {
  actualEntryDate?: string | null;
  currency?: string;
  documentsList?: string[];
  etaPlanned?: string | null;
  etdPlanned?: string | null;
  importTaxRate?: number | null;
  incoterms?: string;
  itemCode?: string;
  itemName?: string;
  notes?: string;
  plannedEntryDate?: string | null;
  portOfDeparture?: string;
  portOfDestination?: string;
  quantity?: number;
  shippingLine?: string | null;
  shippingMethod?: DeliveryOrder['logistics_shipping']['shipping_method'];
  supplierCode?: string | null;
  supplierName?: string | null;
  taxAmount?: number | null;
  trackingNumber?: string | null;
  unit?: string;
  warehouseCode?: string;
  warehouseDeadline?: string;
};

export type TaskAssigneeInput = {
  id?: string | null;
  name: string;
  department?: string | null;
};

export type UpdateTaskPayload = {
  blockedReason?: string | null;
  completedAt?: string | null;
  dueDate?: string;
  notes?: string;
  progress?: number;
  status?: TaskStatus;
  taskName?: string;
  role?: TaskRole;
  stage?: TaskScreenStage;
  refType?: string;
  refId?: string;
  refNo?: string;
  priority?: Priority;
  assignee?: TaskAssigneeInput;
  taskTemplateId?: string | null;
};

export type CreateTaskPayload = {
  taskName: string;
  taskTemplateId?: string | null;
  refType?: string;
  refId?: string;
  refNo?: string;
  stage?: TaskScreenStage;
  role?: TaskRole;
  assignee?: TaskAssigneeInput;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  progress?: number;
  notes?: string;
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

export type TaskListScreenDto = {
  items: TaskScreenItem[];
  summary?: {
    total: number;
    pending: number;
    in_progress: number;
    blocked: number;
    completed: number;
    overdue?: number;
  };
  filters?: Record<string, string[]>;
};

export type PurchaseOrderTasksScreenDto = {
  purchase_order: {
    id: string;
    po_no: string;
    status: string;
  };
  task_groups: Array<{
    stage: TaskScreenStage;
    tasks: TaskScreenItem[];
  }>;
};

export type DashboardStats = {
  totals: {
    purchaseRequests: number;
    purchaseOrders: number;
    deliveryOrders: number;
    tasks: number;
    blockedTasks: number;
  };
  businessFlowCounts?: Array<{ tag: BusinessFlowTag; count: number }>;
  deliveryOrderStatus: Array<{ status: DeliveryOrderStatus; count: number }>;
  taskStatus: Array<{ status: TaskStatus; count: number }>;
  taskRoleProgress: Array<{ role: TaskRole; total: number; completed: number; completionRate: number }>;
  monthlyThroughput: Array<{ month: string; deliveryOrders: number; completedTasks: number }>;
};

export type QuotationAction =
  | 'SEND_PRELIMINARY'
  | 'SEND_OFFICIAL'
  | 'CUSTOMER_APPROVED'
  | 'CUSTOMER_REJECTED'
  | 'REVISION_REQUESTED';

export type LogisticsAttachment = {
  documentType: string;
  entityId: string;
  entityType: string;
  fileName: string;
  hblNumber: string | null;
  id: string;
  mimeType: string;
  size: number;
  storageUrl: string;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type QuotationChargeLineInput = {
  charge_type: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price: number;
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

export type CreateShipmentPayload = {
  shipmentNumber?: string;
  deliveryOrderId?: string;
  doNumber: string;
  poNumber?: string;
  shippingMode: ShipmentModeV1;
  loadType?: ShipmentLoadTypeV1 | null;
  carrierName?: string | null;
  carrierId?: string | null;
  vesselVoyage?: string | null;
  voyageNo?: string | null;
  blAwbNo?: string | null;
  containerNo?: string[] | null;
  originPort?: string | null;
  destPort?: string | null;
  etd?: string | null;
  eta?: string | null;
  notes?: string | null;
};

export type UpdateQuotationActionPayload = {
  action: QuotationAction;
};

export type ConfirmQuotationBookingPayload = {
  bookingNumber: string;
};

export type UpdateShippingInstructionPayload = {
  bookingNumber?: string | null;
  mblNumber?: string | null;
  mblType?: MblType | null;
  manifestNumber?: string | null;
  shippingLine?: string | null;
  vesselCode?: string | null;
  grossWeight?: number | null;
  cbm?: number | null;
  actualDepartureAt?: string | null;
  actualArrivalAt?: string | null;
};

export type CreateHouseBillPayload = {
  hblNumber: string;
  shipper: string;
  consignee: string;
  placeOfReceipt?: string | null;
  placeOfDelivery?: string | null;
  assignedTo?: string | null;
};

export type CreateContainerPayload = {
  containerType: string;
  containerNumber: string;
  sealNumber?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
};

export type CreateDocumentReviewPayload = {
  hblNumber?: string | null;
  draftBlAttachmentId: string;
  commercialInvoiceAttachmentId: string;
  packingListAttachmentId: string;
  notes?: string | null;
};

export type ConfirmDocumentCrossCheckPayload = {
  matched: boolean;
  notes?: string | null;
};

export type ConfirmFinalBlPayload = {
  finalBlAttachmentId: string;
};

export type CreateChargePayload = {
  chargeType: FinanceChargeType;
  chargeCode: string;
  description: string;
  amount: number;
  currency: string;
};

export type UpdateChargePayload = {
  chargeCode?: string;
  description?: string;
  amount?: number;
  currency?: string;
};

export type IssueFinanceNotePayload = {
  chargeType?: FinanceChargeType;
};

export type UpdateCustomsPayload = {
  declarationNumber?: string | null;
  channel?: CustomsChannel | null;
  status?: CustomsStatus | null;
  laneStatus?: CustomsLaneStatus | null;
  telexReleased?: boolean;
  notes?: string | null;
};

export type SlaAlert = {
  entityId: string;
  entityType: 'document_review' | 'finance_note' | 'quotation';
  message: string;
  ownerRole: TaskRole | string;
  slaDueAt: string | null;
  slaStage: string | null;
};

export type CreateAdvanceSettlementPayload = {
  hblNumber?: string | null;
  assignedRole: TaskRole;
  amount: number;
  currency: string;
  purpose: string;
  notes?: string | null;
};

export type UpdateAdvanceSettlementStatusPayload = {
  status: AdvanceSettlementStatus;
  notes?: string | null;
};

export type UploadDeliveryOrderAttachmentResult = {
  attachment: LogisticsAttachment;
  deliveryOrder: DeliveryOrder;
};

const emptyDashboardStats: DashboardStats = {
  totals: {
    purchaseRequests: 0,
    purchaseOrders: 0,
    deliveryOrders: 0,
    tasks: 0,
    blockedTasks: 0,
  },
  businessFlowCounts: [],
  deliveryOrderStatus: [],
  taskStatus: [],
  taskRoleProgress: [],
  monthlyThroughput: [],
};

const uiOnlySuccess = { success: true } as const;

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function sumNumbers(values: unknown[]) {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function deliveryOrderNo(deliveryOrder: DeliveryOrderV1) {
  return deliveryOrder.do_no ?? deliveryOrder.delivery_order_no ?? deliveryOrder.id;
}

function uiId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function inferPoFlowTags(purchaseOrder: PurchaseOrderV1): BusinessFlowTag[] {
  if ((purchaseOrder.lines ?? []).some((line) => toNumber(line.qty_lotted) > 0 && toNumber(line.qty_lotted) < toNumber(line.qty_ordered))) {
    return ['PARTIAL_DELIVERY'];
  }
  return ['LINEAR'];
}

function mapV1PurchaseOrderLine(line: PurchaseOrderLineV1): PurchaseOrderLineItem {
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

function mapV1PurchaseOrder(purchaseOrder: PurchaseOrderV1, linkedDoNumbers: string[] = []): PurchaseOrder {
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

function mapTaskScreenToTemplateRef(task: TaskScreenItem): LogisticsTaskTemplateRef | null {
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

function mapTaskScreenToLogisticsTask(task: TaskScreenItem): LogisticsTask {
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
    is_required_for_do_closure: true,
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

function taskScreenStatusToGd1(status: TaskStatus): Gd1TaskStatus {
  if (status === 'COMPLETED') return 'DONE';
  if (status === 'TODO') return 'PENDING';
  if (status === 'WAITING') return 'PENDING';
  return status as Gd1TaskStatus;
}

function gd1StatusToTaskScreen(status: string): TaskStatus {
  if (status === 'DONE') return 'COMPLETED';
  if (status === 'PENDING') return 'PENDING';
  return status as TaskStatus;
}

function mapTaskScreenToPoStageTask(task: TaskScreenItem): Gd1PoStageTask {
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

function quotationStatusToUi(status: QuotationStatusV1): QuotationStatus {
  const statusMap: Record<QuotationStatusV1, QuotationStatus> = {
    REQUEST_FOR_QUOTATION: 'PRELIMINARY_SENT',
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'OFFICIAL_SENT',
    CONFIRMED: 'APPROVED',
    REJECTED: 'REJECTED',
  };

  return statusMap[status];
}

function inferQuotationShippingMode(quotation: QuotationV1): ShippingMode {
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

function sumChargeLines(chargeLines: QuotationChargeLineV1[] | undefined, types: string[]) {
  const allowedTypes = new Set(types);
  return sumNumbers(
    (chargeLines ?? [])
      .filter((line) => allowedTypes.has(line.charge_type))
      .map((line) => line.total_amount ?? line.amount),
  );
}

function mapV1Quotation(quotation: QuotationV1, requestCode?: string): Quotation & {
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

async function resolveDeliveryOrderId(value: string) {
  const response = await fetchDeliveryOrdersV1({ page: 1, limit: 100, search: value });
  const deliveryOrder = response.data.find((order) => order.id === value || deliveryOrderNo(order) === value);
  if (!deliveryOrder) {
    throw new Error(`Delivery order ${value} not found`);
  }
  return deliveryOrder.id;
}

async function resolveSupplierId(value: string) {
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

async function resolveCurrencyId(value: string | null | undefined) {
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

async function resolveShipmentId(value: string) {
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

function buildQuotationChargeLines(payload: CreateQuotationPayload): BuiltQuotationChargeLine[] {
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

function inferQuotationTypeFromChargeLines(chargeLines: ReturnType<typeof buildQuotationChargeLines>): QuotationTypeV1 {
  const types = new Set(chargeLines.map((line) => line.charge_type));
  if (types.size > 1) return 'MIXED';
  if (types.has('CUSTOMS_FEE')) return 'CUSTOMS';
  if (types.has('LOCAL_CHARGE')) return 'LOCAL_CHARGE';
  return 'FREIGHT';
}

function mapDeliveryOrderStatus(status: DeliveryOrderV1['status']): DeliveryOrderStatus {
  if (status === 'SHIPPED') return 'IN_TRANSIT';
  return status;
}

function inferShippingMethod(deliveryOrder: DeliveryOrderV1): DeliveryOrder['logistics_shipping']['shipping_method'] {
  const modeType = (
    deliveryOrder.transport_mode?.mode_type ??
    deliveryOrder.transport_mode?.mode_code ??
    ''
  ).toUpperCase();
  if (modeType === 'AIR') return 'AIR';
  if (modeType === 'ROAD' || modeType === 'TRUCKING' || modeType.includes('TRUCK')) return 'ROAD';
  return 'SEA';
}

function transportModeIdFromShippingMethod(
  shippingMethod: DeliveryOrder['logistics_shipping']['shipping_method'] | undefined,
) {
  if (shippingMethod === 'AIR') return 'tm_air';
  if (shippingMethod === 'ROAD') return 'tm_road';
  if (shippingMethod === 'SEA') return 'tm_sea';
  return undefined;
}

function resolveDestinationPort(deliveryOrder: DeliveryOrderV1, firstLot?: DeliveryOrderLotV1 | null) {
  const explicitPort = firstLot?.po_lot?.destination_port ?? firstLot?.lot?.destination_port;
  if (explicitPort) return explicitPort;

  const destination = deliveryOrder.destination_address ?? '';
  if (/port|cang|cảng|cat\s?lai|cát\s?lái/i.test(destination)) {
    return destination;
  }

  return inferShippingMethod(deliveryOrder) === 'AIR' ? 'Tan Son Nhat Airport' : 'CatLai Port';
}

function mapDeliverySourceLine(deliveryOrder: DeliveryOrderV1, line: DeliveryOrderLineV1): DeliverySourceLine {
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

function mapV1DeliveryOrder(deliveryOrder: DeliveryOrderV1): DeliveryOrder {
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

function buildUiQuotation(payload: CreateQuotationPayload): Quotation {
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

function normalizeShipmentMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentRecord['shipping_mode'] {
  if (mode === 'AIR') return 'AIR';
  if (mode === 'ROAD' || mode === 'RAIL' || mode === 'MULTIMODAL' || mode === 'TRUCKING' || mode === 'OTHER') {
    return mode;
  }
  return 'SEA';
}

function inferLoadTypeFromMode(mode: ShipmentModeV1 | string | null | undefined): ShipmentLoadTypeV1 | null {
  const normalized = String(mode ?? '').toUpperCase();
  if (normalized.includes('FCL')) return 'FCL';
  if (normalized.includes('LCL')) return 'LCL';
  if (normalized.includes('FTL')) return 'FTL';
  if (normalized.includes('LTL')) return 'LTL';
  return null;
}

function mapV1ShipmentMilestone(milestone: ShipmentMilestoneV1): ShipmentMilestone {
  return {
    actual_date: milestone.actual_at ?? milestone.actual_date ?? milestone.done_at ?? null,
    id: milestone.id,
    milestone_code: milestone.milestone_code as ShipmentMilestone['milestone_code'],
    note: milestone.notes ?? milestone.note ?? null,
    planned_date: milestone.planned_at ?? milestone.planned_date ?? null,
    source: milestone.source === 'API' || milestone.source === 'EMAIL' ? milestone.source : 'MANUAL',
  };
}

function mapV1ShipmentDocumentStatus(status: ShipmentDocumentStatusV1): ShipmentDocument['status'] {
  return status;
}

function mapV1ShipmentDocument(document: ShipmentDocumentV1): ShipmentDocument {
  return {
    file_name: document.file_name,
    id: document.id,
    document_type: document.document_type,
    reject_reason: document.status === 'REJECTED' ? document.notes ?? undefined : undefined,
    status: mapV1ShipmentDocumentStatus(document.status),
    uploaded_at: document.received_at ?? document.update_at ?? document.create_at,
  };
}

function mapV1ShipmentCost(cost: ShipmentCostV1): ShipmentCost {
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

function mapV1Shipment(shipment: ShipmentV1): ShipmentRecordWithQuotation {
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

function buildUiShipment(payload: {
  shipmentNumber: string;
  doNumber: string;
  poNumber: string;
  shippingMode: ShipmentModeV1;
  loadType?: ShipmentLoadTypeV1 | null;
  carrierName?: string | null;
  vesselVoyage?: string | null;
  originPort?: string | null;
  destPort?: string | null;
  etd?: string | null;
  eta?: string | null;
}): ShipmentRecord {
  return {
    id: uiId('shp'),
    shipment_number: payload.shipmentNumber,
    do_number: payload.doNumber,
    po_number: payload.poNumber,
    status: 'BOOKED',
    shipping_mode: payload.shippingMode,
    load_type: payload.loadType ?? null,
    carrier_name: payload.carrierName || '',
    vessel_voyage: payload.vesselVoyage || '',
    origin_port: payload.originPort || '',
    dest_port: payload.destPort || '',
    etd: payload.etd || '',
    eta: payload.eta || '',
    atd: '',
    ata: '',
    bl_awb_no: '',
    customs: {
      stream: 'GREEN',
      lane_status: '',
    },
    milestones: [],
    documents: [],
    costs: [],
    po_tasks: [],
  };
}

function buildUiPurchaseOrder(payload: CreatePurchaseOrderPayload): PurchaseOrder {
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

function buildUiDeliveryOrder(payload: CreateDeliveryOrderPayload): DeliveryOrder {
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

export async function fetchQuotation(payload: CreateQuotationPayload) {
  return buildUiQuotation(payload);
}

export async function fetchShipments() {
  const response = await fetchShipmentsV1({ page: 1, limit: 100 });
  const details = await Promise.all(
    response.data.map(async (shipment) => {
      try {
        return await fetchShipmentV1(shipment.id);
      } catch {
        return shipment;
      }
    }),
  );
  const shipments = details.map(mapV1Shipment);
  parseContract(shipmentRecordListSchema, shipments, 'fetchShipments');
  return shipments;
}

export async function createShipment(payload: CreateShipmentPayload) {
  const deliveryOrderId = payload.deliveryOrderId ?? await resolveDeliveryOrderId(payload.doNumber);
  const requestPayload: CreateShipmentFromDeliveryOrderPayload = {
    bl_awb_no: payload.blAwbNo ?? null,
    carrier: payload.carrierName ?? null,
    carrier_id: payload.carrierId ?? null,
    container_no: payload.containerNo ?? null,
    delivery_order_id: deliveryOrderId,
    eta: payload.eta ?? null,
    etd: payload.etd ?? null,
    load_type: payload.loadType ?? null,
    mode: payload.shippingMode,
    notes: payload.notes ?? null,
    pod: payload.destPort ?? null,
    pol: payload.originPort ?? null,
    shipment_no: payload.shipmentNumber,
    vessel_flight: payload.vesselVoyage ?? null,
    voyage_no: payload.voyageNo ?? null,
  };

  return mapV1Shipment(await createShipmentFromDeliveryOrder(requestPayload));
}

export async function updateShipment(shipmentNumberOrId: string, payload: Partial<ShipmentRecord>) {
  const shipmentId = payload.id ?? shipmentNumberOrId;
  const [vesselFlight, voyageNo] = (payload.vessel_voyage ?? '').split('/').map((value) => value.trim());
  const updated = await updateShipmentV1(shipmentId, {
    carrier: payload.carrier_name,
    customs_channel: payload.customs?.stream,
    eta: payload.eta || null,
    etd: payload.etd || null,
    load_type: payload.load_type,
    mode: payload.shipping_mode,
    pod: payload.dest_port,
    pol: payload.origin_port,
    vessel_flight: vesselFlight || undefined,
    voyage_no: voyageNo || undefined,
  });

  return mapV1Shipment(updated);
}

export async function fetchQuotations() {
  const [quotationResponse, deliveryOrderResponse] = await Promise.all([
    fetchQuotationsV1({ page: 1, limit: 100 }),
    fetchDeliveryOrdersV1({ page: 1, limit: 100 }),
  ]);
  const detailedQuotations = await Promise.all(
    quotationResponse.data.map(async (quotation) => {
      try {
        return await fetchQuotationV1(quotation.id);
      } catch {
        return quotation;
      }
    }),
  );
  const deliveryOrderNoById = new Map(
    deliveryOrderResponse.data.map((deliveryOrder) => [deliveryOrder.id, deliveryOrderNo(deliveryOrder)]),
  );

  return detailedQuotations.map((quotation) =>
    mapV1Quotation(quotation, deliveryOrderNoById.get(quotation.ref_id ?? '')),
  );
}

export async function fetchPurchaseOrders() {
  const [purchaseOrderResponse, deliveryOrderResponse] = await Promise.all([
    fetchPurchaseOrdersV1({ page: 1, limit: 100 }),
    fetchDeliveryOrdersV1({ page: 1, limit: 100 }),
  ]);
  const deliveryOrdersByPoId = new Map<string, string[]>();

  deliveryOrderResponse.data.forEach((deliveryOrder) => {
    deliveryOrdersByPoId.set(deliveryOrder.purchase_order_id, [
      ...(deliveryOrdersByPoId.get(deliveryOrder.purchase_order_id) ?? []),
      deliveryOrderNo(deliveryOrder),
    ]);
  });

  return purchaseOrderResponse.data.map((purchaseOrder) =>
    mapV1PurchaseOrder(purchaseOrder, deliveryOrdersByPoId.get(purchaseOrder.id) ?? []),
  );
}

export async function fetchDeliveryOrders(): Promise<DeliveryOrder[]> {
  // The backend owns the DO screen-DTO (real task_summary / missing_documents /
  // warehouse), so the frontend no longer joins lots/lines or synthesizes fields.
  const response = await apiClient.get<{ data: DeliveryOrder[] }>('/v1/delivery-orders/screen');
  const deliveryOrders = response.data.data ?? [];
  parseContract(deliveryOrderScreenListSchema, deliveryOrders, 'fetchDeliveryOrders');
  return deliveryOrders;
}

export async function fetchLogisticsTasks() {
  const response = await apiClient.get<ApiResponse<TaskListScreenDto>>('/v1/tasks');
  return response.data.data.items.map(mapTaskScreenToLogisticsTask);
}

export async function fetchDashboardStats() {
  const [purchaseOrders, deliveryOrders, tasks] = await Promise.all([
    fetchPurchaseOrders(),
    fetchDeliveryOrders(),
    fetchLogisticsTasks(),
  ]);
  const statusCounts = new Map<DeliveryOrderStatus, number>();
  const taskStatusCounts = new Map<TaskStatus, number>();
  const taskRoleCounts = new Map<TaskRole, { completed: number; total: number }>();
  const businessFlowCounts = new Map<BusinessFlowTag, number>();
  const monthCounts = new Map<string, { completedTasks: number; deliveryOrders: number }>();

  deliveryOrders.forEach((deliveryOrder) => {
    statusCounts.set(deliveryOrder.order_info.status, (statusCounts.get(deliveryOrder.order_info.status) ?? 0) + 1);
    deliveryOrder.flow_tags.forEach((tag) => {
      businessFlowCounts.set(tag, (businessFlowCounts.get(tag) ?? 0) + 1);
    });

    const month = (deliveryOrder.warehouse_tracking.planned_entry_date || deliveryOrder.warehouse_tracking.warehouse_deadline || '').slice(0, 7);
    if (month) {
      const current = monthCounts.get(month) ?? { completedTasks: 0, deliveryOrders: 0 };
      monthCounts.set(month, {
        completedTasks: current.completedTasks + deliveryOrder.task_summary.completed_tasks,
        deliveryOrders: current.deliveryOrders + 1,
      });
    }
  });

  tasks.forEach((task) => {
    taskStatusCounts.set(task.status, (taskStatusCounts.get(task.status) ?? 0) + 1);
    const current = taskRoleCounts.get(task.role) ?? { completed: 0, total: 0 };
    taskRoleCounts.set(task.role, {
      completed: current.completed + (task.status === 'COMPLETED' ? 1 : 0),
      total: current.total + 1,
    });
  });

  return {
    businessFlowCounts: Array.from(businessFlowCounts.entries()).map(([tag, count]) => ({ count, tag })),
    deliveryOrderStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ count, status })),
    monthlyThroughput: Array.from(monthCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, counts]) => ({ month, ...counts })),
    taskRoleProgress: Array.from(taskRoleCounts.entries()).map(([role, counts]) => ({
      completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      completed: counts.completed,
      role,
      total: counts.total,
    })),
    taskStatus: Array.from(taskStatusCounts.entries()).map(([status, count]) => ({ count, status })),
    totals: {
      blockedTasks: tasks.filter((task) => task.status === 'BLOCKED').length,
      deliveryOrders: deliveryOrders.length,
      purchaseOrders: purchaseOrders.length,
      purchaseRequests: 0,
      tasks: tasks.length,
    },
  } satisfies DashboardStats;
}

export async function fetchSlaAlerts() {
  return [] as SlaAlert[];
}

export async function createQuotation(payload: CreateQuotationPayload) {
  const [deliveryOrderId, supplierId, currencyCode] = await Promise.all([
    resolveDeliveryOrderId(payload.requestCode),
    resolveSupplierId((payload as any).carrierId ?? (payload as any).carrierName ?? ''),
    resolveCurrencyId(payload.currency),
  ]);
  const chargeLines = buildQuotationChargeLines(payload);
  const quotation = await createDeliveryOrderQuotation(deliveryOrderId, {
    charge_lines: chargeLines,
    currency_code: currencyCode,
    exchange_rate: 1,
    note: (payload as any).isAllInclusive ? 'All-inclusive quotation' : null,
    quotation_no: `QT-${payload.requestCode}-${Date.now().toString().slice(-6)}`,
    quotation_type: inferQuotationTypeFromChargeLines(chargeLines),
    supplier_id: supplierId,
    valid_until: addDaysIso(7).slice(0, 10),
  });

  return mapV1Quotation(quotation, payload.requestCode);
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
  return buildUiPurchaseOrder(payload);
}

export async function updatePurchaseOrderLotAllocation(
  poNumber: string,
  _payload: UpdatePurchaseOrderLotAllocationPayload,
) {
  return buildUiPurchaseOrder({
    currency: 'USD',
    poNumber,
    supplierCode: '',
    supplierName: '',
    totalAmount: 0,
    warehouseCode: '',
  });
}

export async function syncPurchaseOrderSap(poNumber: string) {
  return buildUiPurchaseOrder({
    currency: 'USD',
    poNumber,
    supplierCode: '',
    supplierName: '',
    totalAmount: 0,
    warehouseCode: '',
  });
}

export async function createDeliveryOrder(payload: CreateDeliveryOrderPayload) {
  return buildUiDeliveryOrder(payload);
}

export async function updateQuotationAction(quotationId: string, payload: UpdateQuotationActionPayload) {
  const quotation = await fetchQuotationV1(quotationId);

  if (payload.action === 'SEND_PRELIMINARY') {
    if (quotation.status === 'DRAFT') {
      return mapV1Quotation(await requestQuotation(quotationId));
    }
    return mapV1Quotation(quotation);
  }

  if (payload.action === 'SEND_OFFICIAL') {
    if (quotation.status === 'REQUEST_FOR_QUOTATION') {
      return mapV1Quotation(await receiveQuotation(quotationId));
    }
    if (quotation.status === 'DRAFT') {
      return mapV1Quotation(await submitQuotationToKbi(quotationId));
    }
    return mapV1Quotation(quotation);
  }

  if (payload.action === 'CUSTOMER_APPROVED') {
    return mapV1Quotation(await markQuotationFinal(quotationId));
  }

  if (payload.action === 'CUSTOMER_REJECTED') {
    if (quotation.status === 'DRAFT') {
      return mapV1Quotation(await cancelQuotation(quotationId));
    }
    return mapV1Quotation(await rejectQuotation(quotationId));
  }

  if (payload.action === 'REVISION_REQUESTED') {
    return mapV1Quotation(await requestQuotation(quotationId));
  }

  return mapV1Quotation(quotation);
}

export async function confirmQuotationBooking(quotationId: string, payload: ConfirmQuotationBookingPayload) {
  return { ...buildUiQuotation({ requestCode: quotationId, shippingMode: 'AIR' }), bookingNumber: payload.bookingNumber } as Quotation;
}

export async function updateDeliveryOrder(orderNumber: string, payload: UpdateDeliveryOrderPayload) {
  const deliveryOrderId = await resolveDeliveryOrderId(orderNumber);
  const updated = await updateDeliveryOrderV1(deliveryOrderId, {
    destination_address: payload.portOfDestination,
    notes: payload.notes,
    origin_address: payload.portOfDeparture,
    planned_cargo_ready_date: payload.plannedEntryDate,
    planned_eta: payload.etaPlanned,
    planned_etd: payload.etdPlanned,
    transport_mode_id: transportModeIdFromShippingMethod(payload.shippingMethod),
    warehouse_name: payload.warehouseCode,
  });

  return mapV1DeliveryOrder(updated);
}

export async function fetchEfmsControl(_orderNumber: string) {
  return {
    advanceSettlements: [],
    charges: [],
    containers: [],
    customs: null,
    documentReviews: [],
    financeNotes: [],
    houseBills: [],
    latestDriveDossier: null,
    transport: null,
  } satisfies EfmsControl;
}

export async function createAdvanceSettlement(_orderNumber: string, payload: CreateAdvanceSettlementPayload) {
  return { ...payload, id: uiId('advance') } as AdvanceSettlement;
}

export async function updateAdvanceSettlementStatus(
  settlementId: string,
  payload: UpdateAdvanceSettlementStatusPayload,
) {
  return { id: settlementId, ...payload } as AdvanceSettlement;
}

export async function syncDriveDossier(orderNumber: string) {
  return { id: uiId('drive'), deliveryOrderId: orderNumber, status: 'PENDING_CONFIG' } as DriveDossier;
}

export async function updateShippingInstruction(orderNumber: string, payload: UpdateShippingInstructionPayload) {
  return { id: uiId('transport'), deliveryOrderId: orderNumber, ...payload } as EfmsTransportRecord;
}

export async function createHouseBill(orderNumber: string, payload: CreateHouseBillPayload) {
  return { id: uiId('hbl'), deliveryOrderId: orderNumber, ...payload } as EfmsHouseBill;
}

export async function createContainer(orderNumber: string, payload: CreateContainerPayload) {
  return { id: uiId('container'), deliveryOrderId: orderNumber, ...payload } as EfmsContainer;
}

export async function createDocumentReview(orderNumber: string, payload: CreateDocumentReviewPayload) {
  return { id: uiId('review'), deliveryOrderId: orderNumber, ...payload } as DocumentReview;
}

export async function confirmDocumentCrossCheck(reviewId: string, payload: ConfirmDocumentCrossCheckPayload) {
  return { id: reviewId, ...payload } as unknown as DocumentReview;
}

export async function confirmFinalBl(reviewId: string, payload: ConfirmFinalBlPayload) {
  return { id: reviewId, ...payload } as DocumentReview;
}

export async function fetchCharges(_orderNumber: string) {
  return [] as FinanceCharge[];
}

export async function createCharge(orderNumber: string, payload: CreateChargePayload) {
  return { id: uiId('charge'), deliveryOrderId: orderNumber, ...payload } as FinanceCharge;
}

export async function updateCharge(chargeId: string, payload: UpdateChargePayload) {
  return { id: chargeId, ...payload } as FinanceCharge;
}

export async function deleteCharge(chargeId: string) {
  return { id: chargeId } as FinanceCharge;
}

export async function issueFinanceNote(orderNumber: string, payload: IssueFinanceNotePayload) {
  return { id: uiId('finance-note'), deliveryOrderId: orderNumber, ...payload } as FinanceNote;
}

export async function sendFinanceNoteToAccounting(noteId: string) {
  return { id: noteId } as FinanceNote;
}

export async function fetchCustoms(_orderNumber: string) {
  return null as CustomsDeclaration | null;
}

export async function updateCustoms(orderNumber: string, payload: UpdateCustomsPayload) {
  return { id: uiId('customs'), deliveryOrderId: orderNumber, ...payload } as CustomsDeclaration;
}

export async function fetchDeliveryOrderAttachments(_orderNumber: string) {
  return [] as LogisticsAttachment[];
}

export async function uploadDeliveryOrderAttachment({
  documentType,
  file,
  hblNumber,
  orderNumber,
}: {
  documentType: string;
  file: File;
  hblNumber?: string | null;
  orderNumber: string;
}) {
  const attachment: LogisticsAttachment = {
    documentType,
    entityId: orderNumber,
    entityType: 'delivery_order',
    fileName: file.name,
    hblNumber: hblNumber ?? null,
    id: uiId('attachment'),
    mimeType: file.type,
    size: file.size,
    storageUrl: '',
    uploadedAt: new Date().toISOString(),
    uploadedBy: null,
  };

  return {
    attachment,
    deliveryOrder: buildUiDeliveryOrder({ requestCode: orderNumber }),
  } satisfies UploadDeliveryOrderAttachmentResult;
}

function mapTaskAssigneeInput(assignee?: TaskAssigneeInput) {
  if (!assignee) return undefined;
  return {
    id: assignee.id ?? null,
    name: assignee.name,
    department: assignee.department ?? null,
  };
}

export async function createLogisticsTask(payload: CreateTaskPayload) {
  const response = await apiClient.post<ApiResponse<TaskScreenItem>>('/v1/tasks', {
    task_name: payload.taskName,
    task_template_id: payload.taskTemplateId,
    ref_type: payload.refType,
    ref_id: payload.refId,
    ref_no: payload.refNo,
    stage: payload.stage,
    role: payload.role,
    assignee: mapTaskAssigneeInput(payload.assignee),
    status: payload.status,
    priority: payload.priority,
    due_at: payload.dueDate,
    progress: payload.progress,
    note: payload.notes,
  });
  return mapTaskScreenToLogisticsTask(response.data.data);
}

export async function updateLogisticsTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await apiClient.patch<ApiResponse<TaskScreenItem>>(`/v1/tasks/${taskId}`, {
    blocked_reason: payload.blockedReason,
    completed_at: payload.completedAt,
    due_at: payload.dueDate,
    note: payload.notes,
    progress: payload.progress,
    status: payload.status,
    task_name: payload.taskName,
    role: payload.role,
    stage: payload.stage,
    ref_type: payload.refType,
    ref_id: payload.refId,
    ref_no: payload.refNo,
    priority: payload.priority,
    assignee: mapTaskAssigneeInput(payload.assignee),
    task_template_id: payload.taskTemplateId,
  });
  return mapTaskScreenToLogisticsTask(response.data.data);
}

export async function advancePurchaseOrderStage(_poNumber: string, _stage: Gd1PoStatus) {
  return uiOnlySuccess;
}

export async function fetchPurchaseOrderStageTasks(poNumber: string) {
  const response = await apiClient.get<ApiResponse<PurchaseOrderTasksScreenDto>>(`/v1/purchase-orders/${poNumber}/tasks`);
  return response.data.data.task_groups.flatMap((group) => group.tasks.map(mapTaskScreenToPoStageTask));
}

export async function fetchShipmentMilestones(orderNumber: string) {
  const shipmentId = await resolveShipmentId(orderNumber);
  const milestones = await fetchShipmentMilestonesV1(shipmentId);
  return milestones.map((milestone) => ({
    actual_date: milestone.actual_at ?? milestone.actual_date ?? milestone.done_at ?? null,
    created_at: milestone.create_at ?? '',
    id: milestone.id,
    milestone_code: milestone.milestone_code as Gd1MilestoneCode,
    note: milestone.notes ?? milestone.note ?? null,
    planned_date: milestone.planned_at ?? milestone.planned_date ?? null,
    recorded_by: null,
    sequence_no: milestone.sequence_no,
    shipment_id: milestone.shipment_id,
    source: milestone.source === 'API' || milestone.source === 'EMAIL' ? milestone.source : 'MANUAL',
    tenant_id: null,
    updated_at: milestone.update_at ?? '',
  })) as Gd1ShipmentMilestone[];
}

export async function updateShipmentMilestone(
  orderNumber: string,
  milestoneCode: string,
  payload: { actualDate: string | null; note?: string; source?: string },
) {
  const shipmentId = await resolveShipmentId(orderNumber);
  await markShipmentMilestoneDone(shipmentId, milestoneCode as ShipmentMilestoneCodeV1, {
    actual_at: payload.actualDate,
    notes: payload.note ?? null,
  });
  return uiOnlySuccess;
}

export async function fetchShipmentCosts(_orderNumber: string) {
  return [] as Gd1ShipmentCost[];
}

export async function addShipmentCost(
  _orderNumber: string,
  payload: {
    costType: string;
    amount: number;
    currencyCode: string;
    exchangeRate: number;
    allocMethod: string;
    invoiceRef?: string | null;
  },
) {
  return { id: uiId('cost'), ...payload } as unknown as Gd1ShipmentCost;
}

export async function deleteShipmentCost(_costId: string) {
  return uiOnlySuccess;
}

export async function updatePoStageTask(taskId: string, payload: { status: string; note?: string }) {
  const response = await apiClient.patch<ApiResponse<TaskScreenItem>>(`/v1/tasks/${taskId}`, {
    note: payload.note,
    status: gd1StatusToTaskScreen(payload.status),
  });
  return mapTaskScreenToPoStageTask(response.data.data);
}

export async function fetchGlobalPoStageTasks() {
  const response = await apiClient.get<ApiResponse<TaskListScreenDto>>('/v1/tasks');
  return response.data.data.items.map(mapTaskScreenToPoStageTask);
}
