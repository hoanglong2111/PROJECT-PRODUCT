import type { Request } from 'express';
import type { QueryResult, QueryResultRow } from 'pg';

import type { AppRole } from '../src/auth/types';
import type {
  BusinessFlowTag,
  DeliveryOrder,
  DeliverySourceLine,
  LogisticsTask,
  Priority,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../src/models/logistics';

export type TokenPayload = {
  email: string;
  role: AppRole;
  sub: string;
};

export type AuthenticatedRequest = Request & { auth?: TokenPayload };

export type DashboardStats = {
  totals: {
    purchaseRequests: number;
    purchaseOrders: number;
    deliveryOrders: number;
    tasks: number;
    blockedTasks: number;
  };
  deliveryOrderStatus: Array<{ status: DeliveryOrder['order_info']['status']; count: number }>;
  taskStatus: Array<{ status: LogisticsTask['status']; count: number }>;
  taskRoleProgress: Array<{ role: LogisticsTask['role']; total: number; completed: number; completionRate: number }>;
  monthlyThroughput: Array<{ month: string; deliveryOrders: number; completedTasks: number }>;
  businessFlowCounts: Array<{ tag: BusinessFlowTag; count: number }>;
};

export type AppUserRow = {
  avatar_url: string | null;
  default_warehouse_code?: string | null;
  department: string;
  email: string;
  full_name: string;
  id: string;
  operation_focus?: string | null;
  password_hash: string;
  phone_number?: string | null;
  position: string;
  preferred_module_path?: string | null;
  profile_note?: string | null;
  role: AppRole;
  work_location?: string | null;
  work_shift?: string | null;
};

export type CreateUserBody = {
  avatarUrl?: string | null;
  department?: string;
  email?: string;
  fullName?: string;
  password?: string;
  position?: string;
  role?: AppRole;
};

export type CreatePurchaseRequestBody = {
  expectedArrivalDate?: string | null;
  itemCode?: string;
  itemName?: string;
  lineItems?: Array<{
    itemCode?: string;
    itemName?: string;
    productionContractNumber?: string;
    quantity?: number;
    unit?: string;
    warehouseCode?: string;
    warehouseDeadlineDate?: string;
  }>;
  notes?: string;
  priority?: Priority;
  productionContractNumber?: string;
  quantity?: number;
  requestedOrderDate?: string;
  supplierExpectedDeliveryDate?: string | null;
  unit?: string;
  warehouseCode?: string;
  warehouseDeadlineDate?: string;
};

export type CreatePurchaseOrderBody = {
  currency?: string;
  orderDate?: string;
  poNumber?: string;
  sourceLines?: Array<{
    prCode?: string;
    prLineId?: string;
    quantity?: number;
  }>;
  sourcePrCode?: string;
  supplierCode?: string;
  supplierName?: string;
  totalAmount?: number;
  warehouseCode?: string;
};

export type UpdatePurchaseRequestBody = {
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

export type UpdatePurchaseRequestStatusBody = {
  reason?: string;
  status?: PurchaseRequestStatus;
};

export type UpdateDeliveryOrderBody = {
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

export type UpdateTaskBody = {
  blockedReason?: string | null;
  completedAt?: string | null;
  dueDate?: string;
  notes?: string;
  progress?: number;
  status?: LogisticsTask['status'];
};

export type CreateDeliveryOrderBody = {
  actualEntryDate?: string | null;
  documentsList?: string[];
  etaPlanned?: string | null;
  etdPlanned?: string | null;
  incoterms?: string;
  itemCode?: string;
  itemName?: string;
  notes?: string;
  plannedEntryDate?: string | null;
  poNumber?: string | null;
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
    poNumber?: string;
    poLineId?: string;
    quantity?: number;
  }>;
};

export type NormalizedDeliverySourceLine = DeliverySourceLine & {
  po_line_id: string;
  pr_line_id: string;
};

export type GlobalSearchKind = 'purchase_request' | 'purchase_order' | 'delivery_order' | 'task' | 'account';

export type GlobalSearchResult = {
  href: string;
  id: string;
  kind: GlobalSearchKind;
  meta?: string;
  status?: string;
  subtitle: string;
  title: string;
};

export type ExchangeRate = {
  currency: string;
  rate: number;
};

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

export type ExchangeRatesPayload = {
  base: string;
  nextUpdateAt: string | null;
  provider: string;
  rates: ExchangeRate[];
  updatedAt: string;
};

export type OpenExchangeRatesResponse = {
  base_code?: string;
  rates?: Record<string, number>;
  result?: string;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
};

export type DatabaseClient = {
  query: <T extends QueryResultRow = QueryResultRow>(queryText: string, values?: unknown[]) => Promise<QueryResult<T>>;
};

// ============================================================================
// GD1 API DTO LAYER
// ============================================================================

export type Gd1CreatePrBody = {
  prNo: string;
  title: string;
  departmentId?: string | null;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  requiredDate: string;
  notes?: string | null;
  currencyCode: string;
  lineItems: Array<{
    itemId: string;
    qtyRequested: number;
    unit: string;
    targetPrice?: number | null;
    requiredDate: string;
    preferredSupplierId?: string | null;
    note?: string | null;
  }>;
};

export type Gd1CreatePoBody = {
  poNo: string;
  supplierId: string;
  poType: 'SEA' | 'AIR' | 'DOMESTIC';
  incoterm: string;
  paymentTerm: string;
  currencyCode: string;
  exchangeRate: number;
  expectedEtd?: string | null;
  expectedEta?: string | null;
  toleranceOverPct?: number;
  toleranceUnderPct?: number;
  notes?: string | null;
  sourceLines: Array<{
    prLineId: string;
    qtyOrdered: number;
  }>;
};

export type Gd1UpdateMilestoneBody = {
  actualDate?: string | null;
  note?: string | null;
  source?: 'MANUAL' | 'API' | 'EMAIL';
};

export type Gd1CreateCostBody = {
  costType: 'FREIGHT' | 'INSURANCE' | 'CUSTOMS_DUTY' | 'VAT' | 'LOCAL_CHARGES' | 'DEMURRAGE' | 'OTHER';
  amount: number;
  currencyCode: string;
  exchangeRate: number;
  allocMethod: 'BY_VALUE' | 'BY_WEIGHT' | 'BY_QTY';
  invoiceRef?: string | null;
};

export type Gd1CreateTaskBody = {
  poStage: 'SENT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'SHIPPED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';
  taskName: string;
  taskTemplateId?: string | null;
  assigneeId: string;
  dueDate?: string | null;
  linkedShipmentMilestone?: string | null;
  note?: string | null;
};

export type Gd1CreateTemplateBody = {
  poType: 'SEA' | 'AIR' | 'DOMESTIC' | 'ALL';
  poStage: 'SENT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'SHIPPED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';
  taskName: string;
  defaultAssigneeRole: 'BUYER' | 'LOGISTICS' | 'FINANCE' | 'CUSTOMS_BROKER';
  slaHours: number;
  linkedMilestone?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type Gd1CreateApprovalConfigBody = {
  appliesTo: 'PR' | 'PO' | 'BOTH';
  departmentId?: string | null;
  minAmount: number;
  maxAmount?: number | null;
  currencyCode: string;
  stepOrder: number;
  approverRole: 'DEPARTMENT_MANAGER' | 'DIVISION_DIRECTOR' | 'CEO' | 'CFO';
  approverUserId?: string | null;
  escalationTimeoutHours: number;
  isActive?: boolean;
};

