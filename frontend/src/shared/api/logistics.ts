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
  ShipmentPoTask,
  ShipmentStatus,
  ShipmentRecord,
} from '@shared/model/logistics';

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

export type UpdateTaskPayload = {
  blockedReason?: string | null;
  completedAt?: string | null;
  dueDate?: string;
  notes?: string;
  progress?: number;
  status?: TaskStatus;
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

export type CreateQuotationPayload = {
  requestCode: string;
  shippingMode: ShippingMode;
  quoteAmount?: number | null;
  currency?: string | null;
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

function uiId(prefix: string) {
  return `${prefix}-${Date.now()}`;
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

function buildUiShipment(payload: {
  shipmentNumber: string;
  doNumber: string;
  poNumber: string;
  shippingMode: 'SEA' | 'AIR';
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
    carrier_name: payload.carrierName || '',
    vessel_voyage: payload.vesselVoyage || '',
    origin_port: payload.originPort || '',
    dest_port: payload.destPort || '',
    etd: payload.etd || '',
    eta: payload.eta || '',
    customs: {
      stream: 'GREEN',
      lane_status: '',
    },
    milestones: [],
    documents: [],
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
  return [] as ShipmentRecord[];
}

export async function createShipment(payload: {
  shipmentNumber: string;
  doNumber: string;
  poNumber: string;
  shippingMode: 'SEA' | 'AIR';
  carrierName?: string | null;
  vesselVoyage?: string | null;
  originPort?: string | null;
  destPort?: string | null;
  etd?: string | null;
  eta?: string | null;
}) {
  return buildUiShipment(payload);
}

export async function updateShipment(_shipmentNumber: string, payload: Partial<ShipmentRecord>) {
  return { ...payload, id: payload.id ?? uiId('shp') } as ShipmentRecord;
}

export async function fetchQuotations() {
  return [] as Quotation[];
}

export async function fetchPurchaseOrders() {
  return [] as PurchaseOrder[];
}

export async function fetchDeliveryOrders() {
  return [] as DeliveryOrder[];
}

export async function fetchLogisticsTasks() {
  return [] as LogisticsTask[];
}

export async function fetchDashboardStats() {
  return emptyDashboardStats;
}

export async function fetchSlaAlerts() {
  return [] as SlaAlert[];
}

export async function createQuotation(payload: CreateQuotationPayload) {
  return buildUiQuotation(payload);
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
  return { ...buildUiQuotation({ requestCode: quotationId, shippingMode: 'AIR' }), status: payload.action === 'CUSTOMER_APPROVED' ? 'APPROVED' : 'DRAFT' } as Quotation;
}

export async function confirmQuotationBooking(quotationId: string, payload: ConfirmQuotationBookingPayload) {
  return { ...buildUiQuotation({ requestCode: quotationId, shippingMode: 'AIR' }), bookingNumber: payload.bookingNumber } as Quotation;
}

export async function updateDeliveryOrder(orderNumber: string, payload: UpdateDeliveryOrderPayload) {
  return buildUiDeliveryOrder({ ...payload, requestCode: orderNumber });
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

export async function updateLogisticsTask(taskId: string, payload: UpdateTaskPayload) {
  return { task_id: taskId, ...payload } as LogisticsTask;
}

export async function advancePurchaseOrderStage(_poNumber: string, _stage: Gd1PoStatus) {
  return uiOnlySuccess;
}

export async function fetchPurchaseOrderStageTasks(_poNumber: string) {
  return [] as Gd1PoStageTask[];
}

export async function fetchShipmentMilestones(_orderNumber: string) {
  return [] as Gd1ShipmentMilestone[];
}

export async function updateShipmentMilestone(
  _orderNumber: string,
  _milestoneCode: string,
  _payload: { actualDate: string | null; note?: string; source?: string },
) {
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

export async function updatePoStageTask(_taskId: string, _payload: { status: string; note?: string }) {
  return uiOnlySuccess;
}

export async function fetchGlobalPoStageTasks() {
  return [] as Gd1PoStageTask[];
}
