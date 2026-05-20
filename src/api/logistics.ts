import { http } from './http';
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
  PurchaseOrderStatus,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
  Quotation,
  QuotationStatus,
  ShippingMode,
  SlaStatus,
  TaskRole,
  TaskStatus,
  UserRef,
} from '../models/logistics';

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
  PurchaseOrderStatus,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
  Quotation,
  QuotationStatus,
  ShippingMode,
  SlaStatus,
  TaskRole,
  TaskStatus,
  UserRef,
};

type ApiResponse<T> = {
  data: T;
  errors?: unknown[];
  meta?: Record<string, unknown>;
};

export type CreatePurchaseRequestPayload = {
  expectedArrivalDate?: string | null;
  itemCode: string;
  itemName: string;
  lineItems?: Array<{
    itemCode: string;
    itemName: string;
    productionContractNumber?: string;
    quantity: number;
    unit: string;
    warehouseCode?: string;
    warehouseDeadlineDate?: string;
  }>;
  notes?: string;
  priority: Priority;
  productionContractNumber: string;
  quantity: number;
  requestedOrderDate?: string;
  supplierExpectedDeliveryDate?: string | null;
  unit: string;
  warehouseCode: string;
  warehouseDeadlineDate: string;
};

export type CreatePurchaseOrderPayload = {
  currency: string;
  orderDate?: string;
  sourceLines?: Array<{
    prCode: string;
    prLineId: string;
    quantity: number;
  }>;
  sourcePrCode?: string;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
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

export type UpdatePurchaseRequestPayload = {
  expectedArrivalDate?: string | null;
  itemCode?: string;
  itemName?: string;
  notes?: string;
  priority?: Priority;
  productionContractNumber?: string;
  quantity?: number;
  supplierExpectedDeliveryDate?: string | null;
  unit?: string;
  warehouseCode?: string;
  warehouseDeadlineDate?: string;
};

export type UpdatePurchaseRequestStatusPayload = {
  reason?: string;
  status: PurchaseRequestStatus;
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

async function readCollection<T>(path: string): Promise<T> {
  const response = await http.get<ApiResponse<T>>(path);
  return response.data.data;
}

export async function fetchPurchaseRequests() {
  return readCollection<PurchaseRequest[]>('/purchase-requests');
}

export async function fetchQuotations() {
  return readCollection<Quotation[]>('/quotations');
}

export async function fetchPurchaseOrders() {
  return readCollection<PurchaseOrder[]>('/purchase-orders');
}

export async function fetchDeliveryOrders() {
  return readCollection<DeliveryOrder[]>('/delivery-orders');
}

export async function fetchLogisticsTasks() {
  return readCollection<LogisticsTask[]>('/tasks');
}

export async function fetchDashboardStats() {
  return readCollection<DashboardStats>('/dashboard/stats');
}

export async function fetchSlaAlerts() {
  return readCollection<SlaAlert[]>('/sla/alerts');
}

export async function createPurchaseRequest(payload: CreatePurchaseRequestPayload) {
  const response = await http.post<ApiResponse<PurchaseRequest>>('/purchase-requests', payload);
  return response.data.data;
}

export async function createQuotation(payload: CreateQuotationPayload) {
  const response = await http.post<ApiResponse<Quotation>>('/quotations', payload);
  return response.data.data;
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
  const response = await http.post<ApiResponse<PurchaseOrder>>('/purchase-orders', payload);
  return response.data.data;
}

export async function syncPurchaseOrderSap(poNumber: string) {
  const response = await http.post<ApiResponse<PurchaseOrder>>(
    `/purchase-orders/${encodeURIComponent(poNumber)}/sap-sync`,
  );
  return response.data.data;
}

export async function createDeliveryOrder(payload: CreateDeliveryOrderPayload) {
  const response = await http.post<ApiResponse<DeliveryOrder>>('/delivery-orders', payload);
  return response.data.data;
}

export async function updatePurchaseRequest(requestedOrderId: string, payload: UpdatePurchaseRequestPayload) {
  const response = await http.patch<ApiResponse<PurchaseRequest>>(
    `/purchase-requests/${encodeURIComponent(requestedOrderId)}`,
    payload,
  );
  return response.data.data;
}

export async function updatePurchaseRequestStatus(
  requestedOrderId: string,
  payload: UpdatePurchaseRequestStatusPayload,
) {
  const response = await http.patch<ApiResponse<PurchaseRequest>>(
    `/purchase-requests/${encodeURIComponent(requestedOrderId)}/status`,
    payload,
  );
  return response.data.data;
}

export async function updateQuotationAction(quotationId: string, payload: UpdateQuotationActionPayload) {
  const response = await http.patch<ApiResponse<Quotation>>(
    `/quotations/${encodeURIComponent(quotationId)}/action`,
    payload,
  );
  return response.data.data;
}

export async function confirmQuotationBooking(quotationId: string, payload: ConfirmQuotationBookingPayload) {
  const response = await http.post<ApiResponse<Quotation>>(
    `/quotations/${encodeURIComponent(quotationId)}/booking`,
    payload,
  );
  return response.data.data;
}

export async function updateDeliveryOrder(orderNumber: string, payload: UpdateDeliveryOrderPayload) {
  const response = await http.patch<ApiResponse<DeliveryOrder>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}`,
    payload,
  );
  return response.data.data;
}

export async function fetchEfmsControl(orderNumber: string) {
  const response = await http.get<ApiResponse<EfmsControl>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/efms-control`,
  );
  return response.data.data;
}

export async function createAdvanceSettlement(orderNumber: string, payload: CreateAdvanceSettlementPayload) {
  const response = await http.post<ApiResponse<AdvanceSettlement>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/advance-settlements`,
    payload,
  );
  return response.data.data;
}

export async function updateAdvanceSettlementStatus(
  settlementId: string,
  payload: UpdateAdvanceSettlementStatusPayload,
) {
  const response = await http.patch<ApiResponse<AdvanceSettlement>>(
    `/advance-settlements/${encodeURIComponent(settlementId)}/status`,
    payload,
  );
  return response.data.data;
}

export async function syncDriveDossier(orderNumber: string) {
  const response = await http.post<ApiResponse<DriveDossier>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/drive-dossier`,
  );
  return response.data.data;
}

export async function updateShippingInstruction(orderNumber: string, payload: UpdateShippingInstructionPayload) {
  const response = await http.patch<ApiResponse<EfmsTransportRecord>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/shipping-instruction`,
    payload,
  );
  return response.data.data;
}

export async function createHouseBill(orderNumber: string, payload: CreateHouseBillPayload) {
  const response = await http.post<ApiResponse<EfmsHouseBill>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/hbls`,
    payload,
  );
  return response.data.data;
}

export async function createContainer(orderNumber: string, payload: CreateContainerPayload) {
  const response = await http.post<ApiResponse<EfmsContainer>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/containers`,
    payload,
  );
  return response.data.data;
}

export async function createDocumentReview(orderNumber: string, payload: CreateDocumentReviewPayload) {
  const response = await http.post<ApiResponse<DocumentReview>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/document-reviews`,
    payload,
  );
  return response.data.data;
}

export async function confirmDocumentCrossCheck(reviewId: string, payload: ConfirmDocumentCrossCheckPayload) {
  const response = await http.post<ApiResponse<DocumentReview>>(
    `/document-reviews/${encodeURIComponent(reviewId)}/cross-check`,
    payload,
  );
  return response.data.data;
}

export async function confirmFinalBl(reviewId: string, payload: ConfirmFinalBlPayload) {
  const response = await http.post<ApiResponse<DocumentReview>>(
    `/document-reviews/${encodeURIComponent(reviewId)}/final-bl`,
    payload,
  );
  return response.data.data;
}

export async function fetchCharges(orderNumber: string) {
  return readCollection<FinanceCharge[]>(`/delivery-orders/${encodeURIComponent(orderNumber)}/charges`);
}

export async function createCharge(orderNumber: string, payload: CreateChargePayload) {
  const response = await http.post<ApiResponse<FinanceCharge>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/charges`,
    payload,
  );
  return response.data.data;
}

export async function updateCharge(chargeId: string, payload: UpdateChargePayload) {
  const response = await http.patch<ApiResponse<FinanceCharge>>(`/charges/${encodeURIComponent(chargeId)}`, payload);
  return response.data.data;
}

export async function deleteCharge(chargeId: string) {
  const response = await http.delete<ApiResponse<FinanceCharge>>(`/charges/${encodeURIComponent(chargeId)}`);
  return response.data.data;
}

export async function issueFinanceNote(orderNumber: string, payload: IssueFinanceNotePayload) {
  const response = await http.post<ApiResponse<FinanceNote>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/finance-notes`,
    payload,
  );
  return response.data.data;
}

export async function sendFinanceNoteToAccounting(noteId: string) {
  const response = await http.post<ApiResponse<FinanceNote>>(
    `/finance-notes/${encodeURIComponent(noteId)}/send-to-accounting`,
  );
  return response.data.data;
}

export async function fetchCustoms(orderNumber: string) {
  const response = await http.get<ApiResponse<CustomsDeclaration | null>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/customs`,
  );
  return response.data.data;
}

export async function updateCustoms(orderNumber: string, payload: UpdateCustomsPayload) {
  const response = await http.patch<ApiResponse<CustomsDeclaration>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/customs`,
    payload,
  );
  return response.data.data;
}

export async function fetchDeliveryOrderAttachments(orderNumber: string) {
  return readCollection<LogisticsAttachment[]>(`/delivery-orders/${encodeURIComponent(orderNumber)}/attachments`);
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
  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('file', file);
  if (hblNumber) {
    formData.append('hblNumber', hblNumber);
  }

  const response = await http.post<ApiResponse<UploadDeliveryOrderAttachmentResult>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}/attachments`,
    formData,
  );
  return response.data.data;
}

export async function updateLogisticsTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await http.patch<ApiResponse<LogisticsTask>>(`/tasks/${encodeURIComponent(taskId)}`, payload);
  return response.data.data;
}
