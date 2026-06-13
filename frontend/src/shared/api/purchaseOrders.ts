import { apiClient } from './axiosConfig';
import type { Currency, Incoterm, Supplier, TransportMode } from './tradeMasterData';
import type { Item, ItemTaxProfile } from './items';

export type ApiDecimal = number | string;

export type V1ApiError = {
  code: 'VALIDATION_ERROR' | 'STATE_CONFLICT' | 'BUSINESS_RULE_VIOLATION' | 'NOT_FOUND' | 'API_ERROR' | string;
  message: string;
};

export type V1Response<T, TMeta = Record<string, unknown>> = {
  data: T;
  meta: TMeta;
  errors: V1ApiError[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PurchaseOrderListMeta = {
  total: number;
  pagination: PaginationMeta;
};

export type PurchaseOrderStatusV1 =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'CANCELLED';
export type PurchaseOrderTypeV1 = 'SEA' | 'AIR' | 'DOMESTIC';
export type PoLotStatus = 'PLANNED' | 'READY' | 'ASSIGNED_TO_SHIPMENT' | 'SHIPPED' | 'CANCELLED';

export type PurchaseOrderV1 = {
  id: string;
  po_no: string;
  contract_no: string | null;
  supplier_id: string;
  currency_id: string | null;
  incoterm_id: string | null;
  transport_mode_id: string | null;
  po_type: PurchaseOrderTypeV1 | string | null;
  payment_term: string | null;
  exchange_rate: ApiDecimal | null;
  expected_etd: string | null;
  expected_eta: string | null;
  actual_etd?: string | null;
  actual_eta?: string | null;
  expected_warehouse_eta?: string | null;
  actual_warehouse_ata?: string | null;
  status: PurchaseOrderStatusV1;
  sent_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  total_weight_kg?: ApiDecimal | null;
  total_containers?: number;
  total_lots?: number;
  lot_ids?: string[];
  delayed_days?: number | null;
  lot_summary?: {
    total_weight_kg: ApiDecimal | null;
    total_containers: number;
    total_lots: number;
    lot_ids: string[];
  };
  logistics_timeline?: {
    loading_port: {
      etd: string | null;
      atd: string | null;
    };
    unloading_port: {
      eta: string | null;
      ata: string | null;
    };
    warehouse: {
      eta: string | null;
      ata: string | null;
    };
  };
  supplier?: Supplier | null;
  currency?: Currency | null;
  incoterm?: Incoterm | null;
  transport_mode?: TransportMode | null;
  lines?: PurchaseOrderLineV1[];
  confirmations?: PurchaseOrderConfirmation[];
};

export type PurchaseOrderLineV1 = {
  id: string;
  purchase_order_id: string;
  item_id: string;
  item_customs_profile_id: string | null;
  line_no: number;
  item_description: string | null;
  qty_ordered: ApiDecimal;
  unit: string | null;
  unit_price: ApiDecimal | null;
  tax_rate: ApiDecimal | null;
  discount_pct: ApiDecimal | null;
  gross_weight_kg?: ApiDecimal | null;
  qty_confirmed: ApiDecimal;
  qty_lotted: ApiDecimal;
  qty_shipped: ApiDecimal;
  qty_received: ApiDecimal;
  expected_eta_line: string | null;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  item?: Item | null;
  item_customs_profile?: ItemTaxProfile | null;
};

export type PurchaseOrderConfirmation = {
  id: string;
  purchase_order_id: string;
  confirmed_by: string | null;
  confirmed_at: string;
  supplier_ref_no: string | null;
  is_full_shipment: boolean;
  allow_partial_shipment: boolean;
  note: string | null;
  lines?: PurchaseOrderConfirmationLine[];
};

export type PurchaseOrderConfirmationLine = {
  id: string;
  purchase_order_confirmation_id: string;
  purchase_order_line_id: string;
  confirmed_qty: ApiDecimal;
  cargo_ready_date: string | null;
  can_fulfill: boolean;
  allow_partial_shipment: boolean;
  note: string | null;
  purchase_order_line?: PurchaseOrderLineV1;
};

export type PoLot = {
  id: string;
  purchase_order_id: string;
  lot_no: string;
  lot_name: string | null;
  status: PoLotStatus;
  planned_cargo_ready_date: string | null;
  planned_etd: string | null;
  planned_eta: string | null;
  sort_order: number;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  items?: PoLotLine[];
};

export type PoLotLine = {
  id: string;
  po_lot_id: string;
  purchase_order_line_id: string;
  item_id: string;
  item_code?: string;
  item_name?: string;
  hs_code?: string | null;
  qty_lotted: ApiDecimal;
  qty_ordered?: ApiDecimal | null;
  gross_weight_kg?: ApiDecimal | null;
  unit: string | null;
  notes: string | null;
  sort_order: number;
  create_at?: string;
  update_at?: string;
  purchase_order_line?: PurchaseOrderLineV1 | null;
  item?: Item | null;
  item_customs_profile?: ItemTaxProfile | null;
};

export type PurchaseOrderLotPlanning = {
  purchase_order: PurchaseOrderV1;
  po_lines: PurchaseOrderLineV1[];
  lots: PoLot[];
};

export type ListPurchaseOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  status?: PurchaseOrderStatusV1 | '';
  supplier_id?: string;
};

export type PurchaseOrderLinePayload = {
  line_no: number;
  item_id: string;
  item_customs_profile_id?: string | null;
  item_description?: string | null;
  qty_ordered: number;
  unit?: string | null;
  unit_price?: number | null;
  tax_rate?: number | null;
  discount_pct?: number | null;
  gross_weight_kg?: number | null;
  expected_eta_line?: string | null;
  notes?: string | null;
};

export type CreatePurchaseOrderV1Payload = {
  po_no: string;
  supplier_id: string;
  contract_no?: string | null;
  currency_id?: string | null;
  currency_code?: string | null;
  incoterm_id?: string | null;
  transport_mode_id?: string | null;
  po_type?: PurchaseOrderTypeV1 | null;
  payment_term?: string | null;
  exchange_rate?: number | null;
  expected_etd?: string | null;
  expected_eta?: string | null;
  notes?: string | null;
  lines?: PurchaseOrderLinePayload[];
};

export type UpdatePurchaseOrderV1Payload = Partial<Omit<CreatePurchaseOrderV1Payload, 'lines' | 'po_no' | 'supplier_id'>> & {
  po_no?: string;
  supplier_id?: string;
};

export type CancelPurchaseOrderPayload = {
  cancel_reason?: string | null;
};

export type ConfirmPurchaseOrderPayload = {
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  supplier_ref_no?: string | null;
  is_full_shipment?: boolean;
  allow_partial_shipment?: boolean;
  note?: string | null;
  lines: Array<{
    purchase_order_line_id: string;
    confirmed_qty: number;
    cargo_ready_date?: string | null;
    can_fulfill?: boolean;
    allow_partial_shipment?: boolean;
    note?: string | null;
  }>;
};

export type LotPayload = Partial<Omit<PoLot, 'create_at' | 'delete_at' | 'id' | 'is_delete' | 'items' | 'purchase_order_id' | 'update_at'>>;

export type CreateLotPayload = LotPayload & {
  lot_no: string;
};

export type MovePoLotLinePayload = {
  target_lot_id: string;
  target_sort_order?: number;
};

export type SplitPoLotLinePayload = MovePoLotLinePayload & {
  split_qty: number;
};

export type ReorderLotsPayload = {
  purchase_order_id: string;
  ordered_lot_ids: string[];
};

export type ReorderLotLinesPayload = {
  lot_id: string;
  ordered_lot_line_ids: string[];
};

function unwrapV1Data<T, TMeta>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    throw new Error(apiResponse.errors[0]?.message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], PurchaseOrderListMeta> }) {
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || 'Request failed');
  }
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

function currencyCodeFromPayload(payload: CreatePurchaseOrderV1Payload | UpdatePurchaseOrderV1Payload) {
  const value = payload.currency_code || payload.currency_id;
  if (!value) return undefined;
  return value.startsWith('cur_') ? value.replace(/^cur_/, '').toUpperCase() : value;
}

function toMockPurchaseOrderPayload<T extends CreatePurchaseOrderV1Payload | UpdatePurchaseOrderV1Payload>(payload: T) {
  return {
    ...payload,
    currency_code: currencyCodeFromPayload(payload),
  };
}

export async function fetchPurchaseOrders(params: ListPurchaseOrdersParams = {}) {
  const response = await apiClient.get<V1Response<PurchaseOrderV1[], PurchaseOrderListMeta>>(
    '/v1/purchase-orders',
    { params },
  );
  return unwrapV1List(response);
}

export async function fetchPurchaseOrder(id: string) {
  const response = await apiClient.get<V1Response<PurchaseOrderV1>>(`/v1/purchase-orders/${id}`);
  return unwrapV1Data(response);
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderV1Payload) {
  const response = await apiClient.post<V1Response<PurchaseOrderV1 | PurchaseOrderLotPlanning>>(
    '/v1/purchase-orders',
    toMockPurchaseOrderPayload(payload),
  );
  const data = unwrapV1Data(response);
  return 'purchase_order' in data ? data.purchase_order : data;
}

export async function updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderV1Payload) {
  const response = await apiClient.patch<V1Response<PurchaseOrderV1>>(
    `/v1/mock/purchase_orders/${id}`,
    toMockPurchaseOrderPayload(payload),
  );
  return unwrapV1Data(response);
}

export async function deletePurchaseOrder(id: string) {
  const response = await apiClient.delete<V1Response<PurchaseOrderV1>>(`/v1/mock/purchase_orders/${id}`);
  return unwrapV1Data(response);
}

export async function sendPurchaseOrder(id: string) {
  const response = await apiClient.post<V1Response<PurchaseOrderV1>>(`/v1/purchase-orders/${id}/send`);
  return unwrapV1Data(response);
}

export async function cancelPurchaseOrder(id: string, payload: CancelPurchaseOrderPayload = {}) {
  const response = await apiClient.post<V1Response<PurchaseOrderV1>>(`/v1/purchase-orders/${id}/cancel`, payload);
  return unwrapV1Data(response);
}

export async function markPurchaseOrderInProduction(id: string) {
  const response = await apiClient.patch<V1Response<PurchaseOrderV1>>(`/v1/mock/purchase_orders/${id}`, {
    status: 'IN_PRODUCTION',
  });
  return unwrapV1Data(response);
}

export async function markPurchaseOrderReadyToShip(id: string) {
  const response = await apiClient.patch<V1Response<PurchaseOrderV1>>(`/v1/mock/purchase_orders/${id}`, {
    status: 'READY_TO_SHIP',
  });
  return unwrapV1Data(response);
}

export async function confirmPurchaseOrder(id: string, payload: ConfirmPurchaseOrderPayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderConfirmation>>(
    `/v1/purchase-orders/${id}/confirmations`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchPurchaseOrderLines(id: string) {
  const response = await apiClient.get<V1Response<PurchaseOrderLineV1[]>>(`/v1/purchase-orders/${id}/lines`);
  return unwrapV1Data(response);
}

export async function createPurchaseOrderLine(id: string, payload: PurchaseOrderLinePayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLineV1>>('/v1/mock/purchase_order_lines', {
    ...payload,
    purchase_order_id: id,
  });
  return unwrapV1Data(response);
}

export async function updatePurchaseOrderLine(lineId: string, payload: Partial<PurchaseOrderLinePayload>) {
  const response = await apiClient.patch<V1Response<PurchaseOrderLineV1>>(
    `/v1/mock/purchase_order_lines/${lineId}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deletePurchaseOrderLine(lineId: string) {
  const response = await apiClient.delete<V1Response<PurchaseOrderLineV1>>(
    `/v1/mock/purchase_order_lines/${lineId}`,
  );
  return unwrapV1Data(response);
}

export async function fetchPurchaseOrderLotPlanning(id: string) {
  const response = await apiClient.get<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/purchase-orders/${id}/lot-planning`,
  );
  return unwrapV1Data(response);
}

export async function createLot(purchaseOrderId: string, payload: CreateLotPayload) {
  const response = await apiClient.post<V1Response<PoLot>>(`/v1/purchase-orders/${purchaseOrderId}/lots`, payload);
  return unwrapV1Data(response);
}

export async function updatePoLot(lotId: string, payload: LotPayload) {
  const response = await apiClient.patch<V1Response<PoLot>>(`/v1/po-lots/${lotId}`, payload);
  return unwrapV1Data(response);
}

export async function deletePoLot(lotId: string) {
  const response = await apiClient.delete<V1Response<PoLot>>(`/v1/po-lots/${lotId}`);
  return unwrapV1Data(response);
}

export async function movePoLotLine(lineId: string, payload: MovePoLotLinePayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/po-lot-lines/${lineId}/move`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function splitPoLotLine(lineId: string, payload: SplitPoLotLinePayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/po-lot-lines/${lineId}/split`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function reorderPoLots(payload: ReorderLotsPayload) {
  const response = await apiClient.patch<V1Response<PurchaseOrderLotPlanning>>(
    '/v1/po-lots/reorder',
    payload,
  );
  return unwrapV1Data(response);
}

export async function reorderPoLotLines(payload: ReorderLotLinesPayload) {
  const response = await apiClient.patch<V1Response<PurchaseOrderLotPlanning>>(
    '/v1/po-lot-lines/reorder',
    payload,
  );
  return unwrapV1Data(response);
}
