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
export type PoDeliverySlotStatus = 'PLANNED' | 'CONFIRMED' | 'CANCELLED';
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
  supplier?: Supplier | null;
  currency?: Currency | null;
  incoterm?: Incoterm | null;
  transport_mode?: TransportMode | null;
  lines?: PurchaseOrderLineV1[];
  confirmations?: PurchaseOrderConfirmation[];
  delivery_slots?: PoDeliverySlot[];
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

export type PoDeliverySlot = {
  id: string;
  purchase_order_id: string;
  slot_no: string;
  slot_name: string | null;
  planned_cargo_ready_date: string | null;
  planned_etd: string | null;
  planned_eta: string | null;
  delivery_address: string | null;
  warehouse_name: string | null;
  status: PoDeliverySlotStatus;
  sort_order: number;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  lots?: PoLot[];
};

export type PoLot = {
  id: string;
  purchase_order_id: string;
  delivery_slot_id: string;
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
  delivery_slot?: PoDeliverySlot | null;
  lot_lines?: PoLotLine[];
};

export type PoLotLine = {
  id: string;
  po_lot_id: string;
  purchase_order_line_id: string;
  item_id: string;
  qty_lotted: ApiDecimal;
  unit: string | null;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  purchase_order_line?: PurchaseOrderLineV1 | null;
  item?: Item | null;
};

export type PurchaseOrderLotPlanning = PurchaseOrderV1 & {
  lines: PurchaseOrderLineV1[];
  delivery_slots: PoDeliverySlot[];
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
  expected_eta_line?: string | null;
  notes?: string | null;
};

export type CreatePurchaseOrderV1Payload = {
  po_no: string;
  supplier_id: string;
  contract_no?: string | null;
  currency_id?: string | null;
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

export type DeliverySlotPayload = Partial<Omit<PoDeliverySlot, 'create_at' | 'delete_at' | 'id' | 'is_delete' | 'lots' | 'purchase_order_id' | 'update_at'>> & {
  slot_no?: string;
};

export type CreateDeliverySlotPayload = DeliverySlotPayload & {
  slot_no: string;
};

export type LotPayload = Partial<Omit<PoLot, 'create_at' | 'delete_at' | 'delivery_slot' | 'id' | 'is_delete' | 'lot_lines' | 'purchase_order_id' | 'update_at'>>;

export type CreateEmptyLotPayload = LotPayload & {
  delivery_slot_id: string;
  lot_no: string;
};

export type SplitLotPayload = {
  new_lot_no: string;
  new_lot_name?: string | null;
  target_slot_id: string;
  status?: PoLotStatus;
  planned_cargo_ready_date?: string | null;
  planned_etd?: string | null;
  planned_eta?: string | null;
  sort_order?: number;
  notes?: string | null;
  lines: Array<{
    purchase_order_line_id: string;
    split_qty: number;
    notes?: string | null;
  }>;
};

export type MergeLotPayload = {
  source_lot_ids: string[];
  delete_empty_source_lots?: boolean;
};

export type MergeLotBackDefaultPayload = {
  delete_empty_source_lots?: boolean;
};

export type TransferLotLinesPayload = {
  target_lot_id: string;
  lines: Array<{
    purchase_order_line_id: string;
    transfer_qty: number;
  }>;
};

export type MoveLotPayload = {
  target_slot_id: string;
  new_sort_order?: number;
};

export type ReorderLotsPayload = {
  lots: Array<{
    lot_id: string;
    delivery_slot_id: string;
    sort_order: number;
  }>;
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
  const response = await apiClient.post<V1Response<PurchaseOrderV1>>('/v1/purchase-orders', payload);
  return unwrapV1Data(response);
}

export async function updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderV1Payload) {
  const response = await apiClient.patch<V1Response<PurchaseOrderV1>>(`/v1/purchase-orders/${id}`, payload);
  return unwrapV1Data(response);
}

export async function deletePurchaseOrder(id: string) {
  const response = await apiClient.delete<V1Response<PurchaseOrderV1>>(`/v1/purchase-orders/${id}`);
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
  const response = await apiClient.post<V1Response<PurchaseOrderV1>>(
    `/v1/purchase-orders/${id}/mark-in-production`,
  );
  return unwrapV1Data(response);
}

export async function markPurchaseOrderReadyToShip(id: string) {
  const response = await apiClient.post<V1Response<PurchaseOrderV1>>(
    `/v1/purchase-orders/${id}/mark-ready-to-ship`,
  );
  return unwrapV1Data(response);
}

export async function confirmPurchaseOrder(id: string, payload: ConfirmPurchaseOrderPayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderConfirmation>>(
    `/v1/purchase-orders/${id}/confirm`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchPurchaseOrderLines(id: string) {
  const response = await apiClient.get<V1Response<PurchaseOrderLineV1[]>>(`/v1/purchase-orders/${id}/lines`);
  return unwrapV1Data(response);
}

export async function createPurchaseOrderLine(id: string, payload: PurchaseOrderLinePayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLineV1>>(
    `/v1/purchase-orders/${id}/lines`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updatePurchaseOrderLine(lineId: string, payload: Partial<PurchaseOrderLinePayload>) {
  const response = await apiClient.patch<V1Response<PurchaseOrderLineV1>>(
    `/v1/purchase-order-lines/${lineId}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deletePurchaseOrderLine(lineId: string) {
  const response = await apiClient.delete<V1Response<PurchaseOrderLineV1>>(
    `/v1/purchase-order-lines/${lineId}`,
  );
  return unwrapV1Data(response);
}

export async function fetchPurchaseOrderLotPlanning(id: string) {
  const response = await apiClient.get<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/purchase-orders/${id}/lot-planning`,
  );
  return unwrapV1Data(response);
}

export async function resetPurchaseOrderLotPlanning(id: string) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/purchase-orders/${id}/lot-planning/reset-default`,
  );
  return unwrapV1Data(response);
}

export async function createDeliverySlot(purchaseOrderId: string, payload: CreateDeliverySlotPayload) {
  const response = await apiClient.post<V1Response<PoDeliverySlot>>(
    `/v1/purchase-orders/${purchaseOrderId}/delivery-slots`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateDeliverySlot(slotId: string, payload: DeliverySlotPayload) {
  const response = await apiClient.patch<V1Response<PoDeliverySlot>>(`/v1/po-delivery-slots/${slotId}`, payload);
  return unwrapV1Data(response);
}

export async function deleteDeliverySlot(slotId: string) {
  const response = await apiClient.delete<V1Response<PoDeliverySlot>>(`/v1/po-delivery-slots/${slotId}`);
  return unwrapV1Data(response);
}

export async function createEmptyLot(purchaseOrderId: string, payload: CreateEmptyLotPayload) {
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

export async function splitPoLot(lotId: string, payload: SplitLotPayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(`/v1/po-lots/${lotId}/split`, payload);
  return unwrapV1Data(response);
}

export async function mergePoLot(lotId: string, payload: MergeLotPayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(`/v1/po-lots/${lotId}/merge`, payload);
  return unwrapV1Data(response);
}

export async function mergePoLotBackToDefault(lotId: string, payload: MergeLotBackDefaultPayload = {}) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/po-lots/${lotId}/merge-back-default`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function transferPoLotLines(lotId: string, payload: TransferLotLinesPayload) {
  const response = await apiClient.post<V1Response<PurchaseOrderLotPlanning>>(
    `/v1/po-lots/${lotId}/transfer-lines`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function movePoLotSlot(lotId: string, payload: MoveLotPayload) {
  const response = await apiClient.patch<V1Response<PoLot>>(`/v1/po-lots/${lotId}/move-slot`, payload);
  return unwrapV1Data(response);
}

export async function reorderPoLots(payload: ReorderLotsPayload) {
  const response = await apiClient.patch<V1Response<PoLot[]>>('/v1/po-lots/reorder', payload);
  return unwrapV1Data(response);
}
