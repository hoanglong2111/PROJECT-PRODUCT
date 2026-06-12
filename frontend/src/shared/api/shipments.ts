import { apiClient } from './axiosConfig';
import type { DeliveryOrderV1 } from './deliveryOrders';
import type { ApiDecimal, PaginationMeta, V1ApiError, V1Response } from './purchaseOrders';
import type { QuotationV1 } from './quotations';
import type { Supplier, TransportMode } from './tradeMasterData';

export type ShipmentStatusV1 =
  | 'BOOKING_PENDING'
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICKED_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'CUSTOMS_DRAFT'
  | 'CUSTOMS_CLEARED'
  | 'DELIVERED'
  | 'CANCELLED';

export type ShipmentModeV1 = 'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'MULTIMODAL' | 'TRUCKING' | 'OTHER';
export type ShipmentCustomsChannelV1 = 'GREEN' | 'YELLOW' | 'RED';

export type ShipmentMilestoneCodeV1 =
  | 'BOOKING_CONFIRMED'
  | 'CARGO_READY'
  | 'PICKED_UP'
  | 'BL_ISSUED'
  | 'GATE_IN_POL'
  | 'ATD'
  | 'CUSTOMS_DRAFT'
  | 'ARRIVAL_NOTICE'
  | 'CUSTOMS_CLEARED'
  | 'DELIVERED';

export type ShipmentDocumentTypeV1 =
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'CONTRACT'
  | 'BOOKING_CONFIRMATION'
  | 'BILL_OF_LADING'
  | 'AIR_WAYBILL'
  | 'ARRIVAL_NOTICE'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'INSURANCE'
  | 'CUSTOMS_DECLARATION'
  | 'EDO'
  | 'POD'
  | 'OTHER';

export type ShipmentDocumentStatusV1 = 'DRAFT' | 'RECEIVED' | 'VERIFIED' | 'REJECTED' | 'CANCELLED';

export type ShipmentListMeta = {
  total: number;
  pagination: PaginationMeta;
};

export type ShipmentLineV1 = {
  id: string;
  shipment_id: string;
  delivery_order_line_id: string | null;
  purchase_order_line_id: string | null;
  item_id: string | null;
  item_description: string | null;
  qty: ApiDecimal;
  unit: string | null;
  package_qty?: ApiDecimal | null;
  gross_weight?: ApiDecimal | null;
  net_weight?: ApiDecimal | null;
  cbm?: ApiDecimal | null;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ShipmentMilestoneV1 = {
  id: string;
  shipment_id: string;
  sequence_no: number;
  milestone_code: ShipmentMilestoneCodeV1;
  planned_at?: string | null;
  planned_date?: string | null;
  actual_at?: string | null;
  actual_date?: string | null;
  done_at?: string | null;
  source?: 'MANUAL' | 'API' | 'EMAIL' | string | null;
  notes?: string | null;
  note?: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ShipmentDocumentV1 = {
  id: string;
  shipment_id: string;
  milestone_id: string | null;
  milestone_code?: ShipmentMilestoneCodeV1 | null;
  document_type: ShipmentDocumentTypeV1;
  document_no: string | null;
  file_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  issued_date: string | null;
  received_at: string | null;
  status: ShipmentDocumentStatusV1;
  notes: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ShipmentV1 = {
  id: string;
  shipment_no: string;
  delivery_order_id: string;
  final_quotation_id: string | null;
  transport_mode_id: string | null;
  forwarder_id: string | null;
  carrier: string | null;
  mode: ShipmentModeV1;
  vessel_flight: string | null;
  voyage_no: string | null;
  bl_awb_no: string | null;
  container_no: string[] | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  customs_channel: ShipmentCustomsChannelV1 | null;
  package_qty: ApiDecimal | null;
  gross_weight: ApiDecimal | null;
  net_weight: ApiDecimal | null;
  cbm: ApiDecimal | null;
  notes: string | null;
  status: ShipmentStatusV1;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  delivery_order?: DeliveryOrderV1 | null;
  final_quotation?: QuotationV1 | null;
  transport_mode?: TransportMode | null;
  forwarder?: Supplier | null;
  lines?: ShipmentLineV1[];
  milestones?: ShipmentMilestoneV1[];
  documents?: ShipmentDocumentV1[];
};

export type ListShipmentsParams = {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  status?: ShipmentStatusV1 | '';
  mode?: ShipmentModeV1 | '';
  delivery_order_id?: string;
  purchase_order_id?: string;
  forwarder_id?: string;
  transport_mode_id?: string;
  from_date?: string;
  to_date?: string;
};

export type CreateShipmentFromDeliveryOrderPayload = {
  shipment_no: string;
  delivery_order_id: string;
  final_quotation_id?: string | null;
  transport_mode_id?: string | null;
  forwarder_id?: string | null;
  carrier?: string | null;
  mode?: ShipmentModeV1;
  vessel_flight?: string | null;
  voyage_no?: string | null;
  bl_awb_no?: string | null;
  container_no?: string[] | null;
  pol?: string | null;
  pod?: string | null;
  etd?: string | null;
  eta?: string | null;
  notes?: string | null;
};

export type UpdateShipmentPayload = Partial<
  Pick<
    ShipmentV1,
    | 'atd'
    | 'ata'
    | 'bl_awb_no'
    | 'carrier'
    | 'container_no'
    | 'customs_channel'
    | 'eta'
    | 'etd'
    | 'forwarder_id'
    | 'gross_weight'
    | 'mode'
    | 'net_weight'
    | 'notes'
    | 'package_qty'
    | 'pod'
    | 'pol'
    | 'transport_mode_id'
    | 'vessel_flight'
    | 'voyage_no'
    | 'cbm'
  >
>;

export type CancelShipmentPayload = {
  notes?: string | null;
};

export type MarkShipmentMilestoneDonePayload = {
  actual_at?: string | null;
  notes?: string | null;
};

export type ShipmentDocumentPayload = {
  milestone_id?: string | null;
  milestone_code?: ShipmentMilestoneCodeV1 | null;
  document_type: ShipmentDocumentTypeV1;
  document_no?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  issued_date?: string | null;
  received_at?: string | null;
  status?: ShipmentDocumentStatusV1;
  notes?: string | null;
};

export type UpdateShipmentDocumentPayload = Partial<ShipmentDocumentPayload>;

function unwrapV1Data<T, TMeta>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], ShipmentListMeta> }) {
  if (response.data.errors?.length) {
    const firstError = response.data.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function fetchShipmentsV1(params: ListShipmentsParams = {}) {
  const response = await apiClient.get<V1Response<ShipmentV1[], ShipmentListMeta>>('/v1/shipments', {
    params,
  });
  return unwrapV1List(response);
}

export async function fetchShipmentV1(id: string) {
  const response = await apiClient.get<V1Response<ShipmentV1>>(`/v1/shipments/${id}`);
  return unwrapV1Data(response);
}

export async function createShipmentFromDeliveryOrder(payload: CreateShipmentFromDeliveryOrderPayload) {
  const response = await apiClient.post<V1Response<ShipmentV1>>(
    '/v1/shipments/from-delivery-order',
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateShipmentV1(id: string, payload: UpdateShipmentPayload) {
  const response = await apiClient.patch<V1Response<ShipmentV1>>(`/v1/mock/shipments/${id}`, payload);
  return unwrapV1Data(response);
}

export async function cancelShipmentV1(id: string, payload: CancelShipmentPayload = {}) {
  const response = await apiClient.post<V1Response<ShipmentV1>>(`/v1/shipments/${id}/cancel`, payload);
  return unwrapV1Data(response);
}

export async function fetchShipmentLines(id: string) {
  const response = await apiClient.get<V1Response<ShipmentLineV1[], { total: number }>>(
    `/v1/shipments/${id}/lines`,
  );
  return unwrapV1Data(response);
}

export async function fetchShipmentMilestonesV1(id: string) {
  const response = await apiClient.get<V1Response<ShipmentMilestoneV1[], { total: number }>>(
    `/v1/shipments/${id}/milestones`,
  );
  return unwrapV1Data(response);
}

export async function markShipmentMilestoneDone(
  id: string,
  milestoneCode: ShipmentMilestoneCodeV1,
  payload: MarkShipmentMilestoneDonePayload = {},
) {
  const response = await apiClient.post<V1Response<ShipmentMilestoneV1>>(
    `/v1/shipments/${id}/milestones/${milestoneCode}/done`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchShipmentDocuments(id: string) {
  const response = await apiClient.get<V1Response<ShipmentDocumentV1[], { total: number }>>(
    `/v1/shipments/${id}/documents`,
  );
  return unwrapV1Data(response);
}

export async function createShipmentDocument(id: string, payload: ShipmentDocumentPayload) {
  const response = await apiClient.post<V1Response<ShipmentDocumentV1>>(
    `/v1/shipments/${id}/documents`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateShipmentDocument(
  id: string,
  payload: UpdateShipmentDocumentPayload,
) {
  const response = await apiClient.patch<V1Response<ShipmentDocumentV1>>(
    `/v1/shipment-documents/${id}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deleteShipmentDocument(id: string) {
  const response = await apiClient.delete<V1Response<ShipmentDocumentV1>>(
    `/v1/shipment-documents/${id}`,
  );
  return unwrapV1Data(response);
}
