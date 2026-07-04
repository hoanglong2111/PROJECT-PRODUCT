import { apiClient } from './axiosConfig';
import type { ApiDecimal, V1ApiError, V1Response } from './purchaseOrders';
import type { ShipmentV1 } from './shipments';
import type { Forwarder } from './forwarders';

export type CarrierDeliveryOrderStatusV1 = 'PENDING' | 'ISSUED' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';

export type CarrierDeliveryOrderV1 = {
  id: string;
  shipment_id: string;
  carrier_do_no: string | null;
  forwarder_id: string | null;
  issued_date: string | null;
  expired_date: string | null;
  release_location: string | null;
  container_no: string | null;
  local_charge_amount: ApiDecimal | null;
  currency_code: string | null;
  status: CarrierDeliveryOrderStatusV1;
  note: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  shipment?: ShipmentV1 | null;
  forwarder?: Forwarder | null;
};

export type CreateCarrierDeliveryOrderPayload = {
  carrier_do_no?: string | null;
  forwarder_id?: string | null;
  issued_date?: string | null;
  expired_date?: string | null;
  release_location?: string | null;
  container_no?: string | null;
  local_charge_amount?: ApiDecimal | null;
  currency_code?: string | null;
  note?: string | null;
};

function unwrapV1Data<T, TMeta = Record<string, unknown>>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return apiResponse.data;
}

export async function fetchShipmentCarrierDeliveryOrders(shipmentId: string) {
  const response = await apiClient.get<V1Response<CarrierDeliveryOrderV1[]>>(
    `/v1/shipments/${shipmentId}/carrier-delivery-orders`,
  );
  return unwrapV1Data(response);
}

export async function createCarrierDeliveryOrderForShipment(
  shipmentId: string,
  payload: CreateCarrierDeliveryOrderPayload,
) {
  const response = await apiClient.post<V1Response<CarrierDeliveryOrderV1>>(
    `/v1/shipments/${shipmentId}/carrier-delivery-orders`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function issueCarrierDeliveryOrder(id: string) {
  const response = await apiClient.post<V1Response<CarrierDeliveryOrderV1>>(
    `/v1/carrier-delivery-orders/${id}/issue`,
  );
  return unwrapV1Data(response);
}

export async function releaseCarrierDeliveryOrder(id: string) {
  const response = await apiClient.post<V1Response<CarrierDeliveryOrderV1>>(
    `/v1/carrier-delivery-orders/${id}/release`,
  );
  return unwrapV1Data(response);
}

export async function cancelCarrierDeliveryOrder(id: string) {
  const response = await apiClient.post<V1Response<CarrierDeliveryOrderV1>>(
    `/v1/carrier-delivery-orders/${id}/cancel`,
  );
  return unwrapV1Data(response);
}
