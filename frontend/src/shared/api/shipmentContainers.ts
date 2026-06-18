import type { ApiDecimal, V1ApiError, V1Response } from './purchaseOrders';
import { apiClient } from './axiosConfig';

export type ShipmentContainerStatusV1 =
  | 'PLANNED'
  | 'STUFFED'
  | 'GATED_IN'
  | 'DISCHARGED'
  | 'RETURNED';

export type ShipmentContainerV1 = {
  id: string;
  shipment_id: string;
  dto_id: string | null;
  container_no: string;
  container_type: string | null;
  seal_no: string | null;
  tare_weight_kg: ApiDecimal | null;
  gross_weight_kg: ApiDecimal | null;
  volume_cbm: ApiDecimal | null;
  status: ShipmentContainerStatusV1;
  note: string | null;
  sort_order?: number | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type CreateShipmentContainerPayload = {
  container_no: string;
  container_type?: string | null;
  seal_no?: string | null;
  tare_weight_kg?: ApiDecimal | null;
  gross_weight_kg?: ApiDecimal | null;
  volume_cbm?: ApiDecimal | null;
  status?: ShipmentContainerStatusV1;
  note?: string | null;
};

export type UpdateShipmentContainerPayload = Partial<
  Pick<
    ShipmentContainerV1,
    | 'container_no'
    | 'container_type'
    | 'dto_id'
    | 'gross_weight_kg'
    | 'note'
    | 'seal_no'
    | 'sort_order'
    | 'status'
    | 'tare_weight_kg'
    | 'volume_cbm'
  >
>;

function unwrapV1Data<T>(response: { data: V1Response<T> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return apiResponse.data;
}

export async function fetchShipmentContainers(shipmentId: string) {
  const response = await apiClient.get<V1Response<ShipmentContainerV1[]>>(
    `/v1/shipments/${shipmentId}/containers`,
  );
  return unwrapV1Data(response) ?? [];
}

export async function createShipmentContainer(
  shipmentId: string,
  payload: CreateShipmentContainerPayload,
) {
  const response = await apiClient.post<V1Response<ShipmentContainerV1>>(
    `/v1/shipments/${shipmentId}/containers`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateShipmentContainer(
  containerId: string,
  payload: UpdateShipmentContainerPayload,
) {
  const response = await apiClient.patch<V1Response<ShipmentContainerV1>>(
    `/v1/shipment-containers/${containerId}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deleteShipmentContainer(containerId: string) {
  const response = await apiClient.delete<V1Response<ShipmentContainerV1>>(
    `/v1/shipment-containers/${containerId}`,
  );
  return unwrapV1Data(response);
}
