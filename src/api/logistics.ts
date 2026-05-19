import { http } from './http';
import type {
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  LogisticsTask,
  Priority,
  BusinessFlowTag,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
  TaskRole,
  TaskStatus,
  UserRef,
} from '../models/logistics';

export type {
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliverySourceLine,
  LogisticsTask,
  Priority,
  BusinessFlowTag,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
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

async function readCollection<T>(path: string): Promise<T> {
  const response = await http.get<ApiResponse<T>>(path);
  return response.data.data;
}

export async function fetchPurchaseRequests() {
  return readCollection<PurchaseRequest[]>('/purchase-requests');
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

export async function createPurchaseRequest(payload: CreatePurchaseRequestPayload) {
  const response = await http.post<ApiResponse<PurchaseRequest>>('/purchase-requests', payload);
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

export async function updateDeliveryOrder(orderNumber: string, payload: UpdateDeliveryOrderPayload) {
  const response = await http.patch<ApiResponse<DeliveryOrder>>(
    `/delivery-orders/${encodeURIComponent(orderNumber)}`,
    payload,
  );
  return response.data.data;
}

export async function updateLogisticsTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await http.patch<ApiResponse<LogisticsTask>>(`/tasks/${encodeURIComponent(taskId)}`, payload);
  return response.data.data;
}
