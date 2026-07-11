import type {
  BusinessFlowTag,
  AdvanceSettlement,
  AdvanceSettlementStatus,
  BlockedByParty,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  DocumentReview,
  DriveDossier,
  DriveDossierStatus,
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
  DepartmentCode,
  TaskStatus,
  UserRef,
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
} from '@shared/model/logistics';
import {
  fetchDeliveryOrdersV1,
  updateDeliveryOrderV1,
} from './deliveryOrders';
import {
  fetchPurchaseOrders as fetchPurchaseOrdersV1,
} from './purchaseOrders';
import {
  cancelQuotation,
  createDeliveryOrderQuotation,
  fetchQuotationV1,
  fetchQuotationsV1,
  markQuotationFinal,
  rejectQuotation,
  submitQuotationToKbi,
} from './quotations';
import {
  createShipmentFromDeliveryOrder,
  fetchShipmentMilestonesV1,
  fetchShipmentsV1,
  fetchShipmentV1,
  markShipmentMilestoneDone,
  updateShipmentV1,
  type CreateShipmentFromDeliveryOrderPayload,
  type ShipmentLoadTypeV1,
  type ShipmentMilestoneCodeV1,
  type ShipmentModeV1,
} from './shipments';
import { apiClient } from './axiosConfig';
import { parseContract, deliveryOrderScreenListSchema, shipmentRecordListSchema } from './contracts';

import { addDaysIso, buildQuotationChargeLines, buildUiDeliveryOrder, buildUiPurchaseOrder, buildUiQuotation, deliveryOrderNo, gd1StatusToTaskScreen, inferQuotationTypeFromChargeLines, mapTaskScreenToLogisticsTask, mapTaskScreenToPoStageTask, mapV1DeliveryOrder, mapV1PurchaseOrder, mapV1Quotation, mapV1Shipment, resolveCurrencyId, resolveDeliveryOrderId, resolveShipmentId, resolveSupplierId, transportModeIdFromShippingMethod, uiId } from './mappers/logisticsMappers';
import type { CreateDeliveryOrderPayload, CreatePurchaseOrderPayload, CreateQuotationPayload, TaskScreenItem, TaskScreenStage } from './mappers/logisticsMappers';
export type { CreateDeliveryOrderPayload, CreatePurchaseOrderPayload, CreateQuotationPayload, QuotationChargeLineInput, TaskScreenItem, TaskScreenStage } from './mappers/logisticsMappers';
export type {
  BusinessFlowTag,
  AdvanceSettlement,
  AdvanceSettlementStatus,
  BlockedByParty,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  DocumentReview,
  DriveDossier,
  DriveDossierStatus,
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
  DepartmentCode,
  TaskStatus,
  UserRef,
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
  department?: DepartmentCode | null;
  code?: string | null;
};

export type UpdateTaskPayload = {
  blockedReason?: string | null;
  blockedByParty?: BlockedByParty | null;
  completedAt?: string | null;
  dueDate?: string;
  notes?: string;
  progress?: number;
  status?: TaskStatus;
  taskName?: string;
  department?: DepartmentCode;
  assigneeCode?: string | null;
  doNumber?: string | null;
  poNumber?: string | null;
  priority?: Priority;
  assignee?: TaskAssigneeInput;
  taskTemplateId?: string | null;
};

export type CreateTaskPayload = {
  taskName: string;
  taskTemplateId?: string | null;
  refNo?: string;
  blockedReason?: string | null;
  blockedByParty?: BlockedByParty | null;
  department?: DepartmentCode;
  assigneeCode?: string | null;
  doNumber?: string | null;
  poNumber?: string | null;
  assignee?: TaskAssigneeInput;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  progress?: number;
  notes?: string;
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
  taskDepartmentProgress: Array<{ department: DepartmentCode; total: number; completed: number; completionRate: number }>;
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
  ownerDept: DepartmentCode | string;
  slaDueAt: string | null;
  slaStage: string | null;
};

export type CreateAdvanceSettlementPayload = {
  hblNumber?: string | null;
  assignedRole: string;
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

const uiOnlySuccess = { success: true } as const;

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
  const taskDepartmentCounts = new Map<DepartmentCode, { completed: number; total: number }>();
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
    const current = taskDepartmentCounts.get(task.department) ?? { completed: 0, total: 0 };
    taskDepartmentCounts.set(task.department, {
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
    taskDepartmentProgress: Array.from(taskDepartmentCounts.entries()).map(([department, counts]) => ({
      completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      completed: counts.completed,
      department,
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
    return mapV1Quotation(quotation);
  }

  if (payload.action === 'SEND_OFFICIAL') {
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
    return mapV1Quotation(quotation);
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
    code: assignee.code ?? null,
  };
}

export async function createLogisticsTask(payload: CreateTaskPayload) {
  const response = await apiClient.post<ApiResponse<TaskScreenItem>>('/v1/tasks', {
    task_name: payload.taskName,
    task_template_id: payload.taskTemplateId,
    ref_no: payload.refNo,
    do_number: payload.doNumber,
    po_number: payload.poNumber,
    department: payload.department,
    assignee_code: payload.assigneeCode,
    assignee: mapTaskAssigneeInput(payload.assignee),
    status: payload.status,
    priority: payload.priority,
    due_at: payload.dueDate,
    progress: payload.progress,
    note: payload.notes,
    blocked_reason: payload.blockedReason,
    blocked_by_party: payload.blockedByParty,
  });
  return mapTaskScreenToLogisticsTask(response.data.data);
}

export async function updateLogisticsTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await apiClient.patch<ApiResponse<TaskScreenItem>>(`/v1/tasks/${taskId}`, {
    blocked_reason: payload.blockedReason,
    blocked_by_party: payload.blockedByParty,
    completed_at: payload.completedAt,
    due_at: payload.dueDate,
    note: payload.notes,
    progress: payload.progress,
    status: payload.status,
    task_name: payload.taskName,
    do_number: payload.doNumber,
    po_number: payload.poNumber,
    department: payload.department,
    assignee_code: payload.assigneeCode,
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
