import type { Item } from './items';
import type { ApiDecimal, PaginationMeta, PoLot, PurchaseOrderLineV1, V1ApiError, V1Response } from './purchaseOrders';
import type { ShipmentLineV1, ShipmentV1 } from './shipments';
import { apiClient } from './axiosConfig';
import { parseContract, domesticTransportOrderListSchema } from './contracts';
import type { Forwarder } from './forwarders';

export type DomesticTransportOrderStatusV1 =
  | 'DRAFT'
  | 'QUOTE_PENDING'
  | 'QUOTED'
  | 'QUOTE_CONFIRMED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'POD_RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type CarrierDeliveryOrderV1 = {
  id: string;
  shipment_id: string;
  carrier_do_no: string;
  forwarder_id: string | null;
  issued_date: string | null;
  expired_date: string | null;
  release_location: string | null;
  container_no: string[] | string | null;
  local_charge_amount: ApiDecimal | null;
  currency_code: string | null;
  status: string;
  note: string | null;
};

export type DomesticTransportOrderLineV1 = {
  id: string;
  domestic_transport_order_id: string;
  purchase_order_line_id: string | null;
  po_lot_id: string | null;
  item_id: string | null;
  qty: ApiDecimal;
  unit: string | null;
  sort_order?: number | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  item?: Item | null;
  item_code?: string | null;
  item_name?: string | null;
  item_description?: string | null;
  hs_code?: string | null;
  gross_weight_kg?: ApiDecimal | null;
  qty_ordered?: ApiDecimal | null;
  purchase_order_line?: PurchaseOrderLineV1 | null;
  lot?: PoLot | null;
  lot_no?: string | null;
  shipment_line?: ShipmentLineV1 | null;
};

export type DomesticTransportOrderV1 = {
  id: string;
  dto_no: string;
  shipment_id: string;
  carrier_delivery_order_id: string | null;
  truck_vendor_id: string | null;
  origin: string | null;
  destination: string | null;
  warehouse: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_identity_no?: string | null;
  scheduled_pickup_at: string | null;
  actual_pickup_at: string | null;
  scheduled_delivery_at: string | null;
  actual_delivery_at: string | null;
  pod_document_ref: string | null;
  quote_amount: ApiDecimal | null;
  quote_currency: string | null;
  status: DomesticTransportOrderStatusV1;
  note: string | null;
  delayed_days?: number | null;
  total_qty?: ApiDecimal | null;
  total_gross_weight_kg?: ApiDecimal | null;
  container_no?: string[] | string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  shipment?: ShipmentV1 | null;
  shipments?: ShipmentV1[];
  carrier_delivery_order?: CarrierDeliveryOrderV1 | null;
  truck_vendor?: Forwarder | null;
  lines?: DomesticTransportOrderLineV1[];
};

export type ListDomesticTransportOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  status?: DomesticTransportOrderStatusV1 | '';
  shipment_id?: string;
  truck_vendor_id?: string;
};

export type DomesticTransportOrderListMeta = {
  total: number;
  pagination: PaginationMeta;
};

export type CreateDomesticTransportOrderPayload = {
  dto_no?: string | null;
  carrier_delivery_order_id?: string | null;
  truck_vendor_id?: string | null;
  origin?: string | null;
  destination?: string | null;
  warehouse?: string | null;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_identity_no?: string | null;
  container_ids?: string[];
  container_no?: string[] | string | null;
  scheduled_pickup_at?: string | null;
  scheduled_delivery_at?: string | null;
  note?: string | null;
};

export type UpdateDomesticTransportOrderPayload = Partial<
  Pick<
    DomesticTransportOrderV1,
    | 'actual_delivery_at'
    | 'actual_pickup_at'
    | 'carrier_delivery_order_id'
    | 'destination'
    | 'driver_name'
    | 'driver_phone'
    | 'driver_identity_no'
    | 'note'
    | 'origin'
    | 'pod_document_ref'
    | 'quote_amount'
    | 'quote_currency'
    | 'scheduled_delivery_at'
    | 'scheduled_pickup_at'
    | 'status'
    | 'truck_vendor_id'
    | 'vehicle_plate'
    | 'vehicle_type'
    | 'warehouse'
  >
>;

export type DomesticTransportOrderAction =
  | 'quote-pending'
  | 'confirm-quote'
  | 'dispatch'
  | 'start-transit'
  | 'deliver'
  | 'pod-received'
  | 'close'
  | 'cancel';

function unwrapV1Data<T, TMeta = Record<string, unknown>>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], DomesticTransportOrderListMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return {
    data: apiResponse.data,
    meta: apiResponse.meta,
  };
}

export async function fetchDomesticTransportOrders(params: ListDomesticTransportOrdersParams = {}) {
  const response = await apiClient.get<V1Response<DomesticTransportOrderV1[], DomesticTransportOrderListMeta>>(
    '/v1/domestic-transport-orders',
    { params },
  );
  const result = unwrapV1List(response);
  parseContract(domesticTransportOrderListSchema, result.data, 'fetchDomesticTransportOrders');
  return result;
}

export async function fetchDomesticTransportOrder(id: string) {
  const response = await apiClient.get<V1Response<DomesticTransportOrderV1>>(
    `/v1/domestic-transport-orders/${id}`,
  );
  return unwrapV1Data(response);
}

export async function createDomesticTransportOrderFromShipment(
  shipmentId: string,
  payload: CreateDomesticTransportOrderPayload,
) {
  const response = await apiClient.post<V1Response<DomesticTransportOrderV1>>(
    `/v1/shipments/${shipmentId}/domestic-transport-orders`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateDomesticTransportOrder(
  id: string,
  payload: UpdateDomesticTransportOrderPayload,
) {
  const response = await apiClient.patch<V1Response<DomesticTransportOrderV1>>(
    `/v1/domestic-transport-orders/${id}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function runDomesticTransportOrderAction(
  id: string,
  action: DomesticTransportOrderAction,
) {
  const response = await apiClient.post<V1Response<DomesticTransportOrderV1>>(
    `/v1/domestic-transport-orders/${id}/${action}`,
  );
  return unwrapV1Data(response);
}

export async function fetchShipmentDomesticTransportOrders(
  shipmentId: string,
  params: ListDomesticTransportOrdersParams = {},
) {
  const response = await apiClient.get<V1Response<DomesticTransportOrderV1[], DomesticTransportOrderListMeta>>(
    `/v1/shipments/${shipmentId}/domestic-transport-orders`,
    { params },
  );
  return unwrapV1List(response);
}

export async function linkDtoToShipment(shipmentId: string, dtoId: string) {
  const response = await apiClient.post<V1Response<DomesticTransportOrderV1>>(
    `/v1/shipments/${shipmentId}/domestic-transport-orders/link`,
    { dto_id: dtoId },
  );
  return unwrapV1Data(response);
}

export async function unlinkDtoFromShipment(shipmentId: string, dtoId: string) {
  const response = await apiClient.delete<V1Response<DomesticTransportOrderV1>>(
    `/v1/shipments/${shipmentId}/domestic-transport-orders/${dtoId}/unlink`,
  );
  return unwrapV1Data(response);
}

export type ConsolidateDomesticTransportOrderPayload = {
  shipment_ids: string[];
  primary_shipment_id?: string;
  container_ids?: string[];
  truck_vendor_id?: string;
  warehouse?: string;
  scheduled_pickup_at?: string;
  note?: string;
};

/** Atomically create one DTO that serves multiple customs-cleared shipments sharing a POD. */
export async function consolidateDomesticTransportOrder(payload: ConsolidateDomesticTransportOrderPayload) {
  const response = await apiClient.post<V1Response<DomesticTransportOrderV1>>(
    '/v1/domestic-transport-orders/consolidate',
    payload,
  );
  return unwrapV1Data(response);
}
