import { apiClient } from './axiosConfig';
import type { Item } from './items';
import type { ShipmentLineV1, ShipmentV1 } from './shipments';
import type {
  ApiDecimal,
  PaginationMeta,
  PoLot,
  PurchaseOrderLineV1,
  PurchaseOrderV1,
  V1Response,
} from './purchaseOrders';
import type { TransportMode } from './tradeMasterData';

export type DeliveryOrderStatusV1 =
  | 'DRAFT'
  | 'CREATED'
  | 'READY_FOR_QUOTATION'
  | 'QUOTATION_CONFIRMED'
  | 'ASSIGNED_TO_SHIPMENT'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_PROCESSING'
  | 'CUSTOMS_CLEARED'
  | 'WAREHOUSE_PENDING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'CLOSED';

export type DeliveryOrderListMeta = {
  total: number;
  pagination: PaginationMeta;
};

export type DeliveryOrderV1 = {
  id: string;
  do_no?: string;
  delivery_order_no?: string;
  purchase_order_id: string;
  transport_mode_id?: string | null;
  status: DeliveryOrderStatusV1;
  requested_pickup_date?: string | null;
  planned_cargo_ready_date?: string | null;
  planned_etd?: string | null;
  planned_eta?: string | null;
  origin_address?: string | null;
  destination_address?: string | null;
  warehouse_name?: string | null;
  requested_by: string | null;
  handled_by: string | null;
  notes: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  purchase_order?: PurchaseOrderV1 | null;
  transport_mode?: TransportMode | null;
  linked_shipment_number?: string | null;
  shipments?: ShipmentV1[];
  lots?: DeliveryOrderLotV1[];
  lines?: DeliveryOrderLineV1[];
};

export type DeliveryOrderLotV1 = {
  id: string;
  delivery_order_id: string;
  po_lot_id: string;
  lot_no?: string;
  lot_name?: string | null;
  planned_cargo_ready_date?: string | null;
  planned_etd?: string | null;
  planned_eta?: string | null;
  notes: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  po_lot?: PoLot | null;
  lot?: PoLot | null;
  lines?: DeliveryOrderLineV1[];
};

export type DeliveryOrderLineV1 = {
  id: string;
  delivery_order_id: string;
  delivery_order_lot_id?: string;
  po_lot_id?: string;
  purchase_order_line_id: string;
  item_id: string;
  item_code?: string | null;
  item_name?: string | null;
  hs_code?: string | null;
  item_description: string | null;
  qty: ApiDecimal;
  qty_ordered?: ApiDecimal | null;
  gross_weight_kg?: ApiDecimal | null;
  unit: string;
  notes: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  delivery_order_lot?: DeliveryOrderLotV1 | null;
  purchase_order_line?: PurchaseOrderLineV1 | null;
  item?: Item | null;
  lot?: PoLot | null;
  lot_no?: string | null;
  shipment?: ShipmentV1 | null;
  shipment_line?: ShipmentLineV1 | null;
  shipment_number?: string | null;
  container_no?: string | null;
  route_origin?: string | null;
  route_destination?: string | null;
  etd?: string | null;
  eta?: string | null;
};

export type ListDeliveryOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  status?: DeliveryOrderStatusV1 | '';
  purchase_order_id?: string;
  transport_mode_id?: string;
};

export type DeliveryOrderPayload = {
  do_no?: string;
  purchase_order_id?: string;
  transport_mode_id?: string | null;
  planned_cargo_ready_date?: string | null;
  planned_etd?: string | null;
  planned_eta?: string | null;
  origin_address?: string | null;
  destination_address?: string | null;
  warehouse_name?: string | null;
  requested_by?: string | null;
  handled_by?: string | null;
  notes?: string | null;
};

export type CreateDeliveryOrderPayload = Required<
  Pick<DeliveryOrderPayload, 'do_no' | 'purchase_order_id'>
> &
  DeliveryOrderPayload;

export type CreateDeliveryOrderFromLotsPayload = {
  lot_ids: string[];
  delivery_order_no?: string;
  requested_pickup_date?: string | null;
  notes?: string | null;
};

function unwrapV1Data<T, TMeta>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    throw new Error(apiResponse.errors[0]?.message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], DeliveryOrderListMeta> }) {
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || 'Request failed');
  }
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function fetchDeliveryOrdersV1(params: ListDeliveryOrdersParams = {}) {
  const response = await apiClient.get<V1Response<DeliveryOrderV1[], DeliveryOrderListMeta>>(
    '/v1/delivery-orders',
    { params },
  );
  return unwrapV1List(response);
}

export async function fetchDeliveryOrderV1(id: string) {
  const response = await apiClient.get<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}`);
  return unwrapV1Data(response);
}

export async function createDeliveryOrderV1(payload: CreateDeliveryOrderPayload) {
  const response = await apiClient.post<V1Response<DeliveryOrderV1>>('/v1/mock/delivery_orders', {
    delivery_order_no: payload.do_no,
    purchase_order_id: payload.purchase_order_id,
    status: 'DRAFT',
    requested_pickup_date: payload.planned_cargo_ready_date ?? null,
    notes: payload.notes ?? null,
  });
  return unwrapV1Data(response);
}

export async function createDeliveryOrderFromLots(payload: CreateDeliveryOrderFromLotsPayload) {
  const response = await apiClient.post<V1Response<DeliveryOrderV1>>(
    '/v1/delivery-orders/from-lots',
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateDeliveryOrderV1(id: string, payload: DeliveryOrderPayload) {
  const response = await apiClient.patch<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}`, {
    delivery_order_no: payload.do_no,
    purchase_order_id: payload.purchase_order_id,
    transport_mode_id: payload.transport_mode_id,
    requested_pickup_date: payload.planned_cargo_ready_date,
    planned_cargo_ready_date: payload.planned_cargo_ready_date,
    planned_etd: payload.planned_etd,
    planned_eta: payload.planned_eta,
    origin_address: payload.origin_address,
    destination_address: payload.destination_address,
    warehouse_name: payload.warehouse_name,
    notes: payload.notes,
  });
  return unwrapV1Data(response);
}

export async function deleteDeliveryOrderV1(id: string) {
  const response = await apiClient.delete<V1Response<DeliveryOrderV1>>(`/v1/mock/delivery_orders/${id}`);
  return unwrapV1Data(response);
}

export async function markDeliveryOrderReadyForQuotation(id: string) {
  const response = await apiClient.post<V1Response<DeliveryOrderV1>>(
    `/v1/delivery-orders/${id}/ready-for-quotation`,
  );
  return unwrapV1Data(response);
}

export async function confirmDeliveryOrderQuotation(id: string) {
  const response = await apiClient.patch<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}`, {
    status: 'QUOTATION_CONFIRMED',
  });
  return unwrapV1Data(response);
}

export async function assignDeliveryOrderToShipment(id: string) {
  const response = await apiClient.patch<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}`, {
    status: 'ASSIGNED_TO_SHIPMENT',
  });
  return unwrapV1Data(response);
}

export async function cancelDeliveryOrderV1(id: string) {
  const response = await apiClient.post<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}/cancel`);
  return unwrapV1Data(response);
}

export async function closeDeliveryOrderV1(id: string) {
  const response = await apiClient.patch<V1Response<DeliveryOrderV1>>(`/v1/delivery-orders/${id}`, {
    status: 'CLOSED',
  });
  return unwrapV1Data(response);
}

export async function fetchPurchaseOrderDeliveryOrders(purchaseOrderId: string) {
  const response = await apiClient.get<V1Response<DeliveryOrderV1[]>>(
    `/v1/purchase-orders/${purchaseOrderId}/delivery-orders`,
  );
  return unwrapV1Data(response);
}

export async function fetchDeliveryOrderLots(id: string) {
  const response = await apiClient.get<V1Response<DeliveryOrderLotV1[]>>(`/v1/delivery-orders/${id}/lots`);
  return unwrapV1Data(response);
}

export async function fetchDeliveryOrderLines(id: string) {
  const response = await apiClient.get<V1Response<DeliveryOrderLineV1[]>>(`/v1/delivery-orders/${id}/lines`);
  return unwrapV1Data(response);
}
