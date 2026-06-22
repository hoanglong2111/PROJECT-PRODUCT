import { apiClient } from './axiosConfig';
import type { ApiDecimal, V1ApiError, V1Response } from './purchaseOrders';
import type { ShipmentLineV1, ShipmentV1 } from './shipments';
import type { Supplier } from './tradeMasterData';

export type CustomsDeclarationStatusV1 =
  | 'DRAFT'
  | 'DRAFT_OPENED'
  | 'OFFICIAL_OPENED'
  | 'SUBMITTED'
  | 'INSPECTION'
  | 'CLEARED'
  | 'CANCELLED';

export type CustomsDeclarationTypeV1 = 'IMPORT' | 'TEMP_IMPORT' | 'RE_IMPORT' | 'OTHER';
export type CustomsDeclarationChannelV1 = 'GREEN' | 'YELLOW' | 'RED';

export type CustomsDeclarationLineV1 = {
  id: string;
  customs_declaration_id: string;
  shipment_line_id: string | null;
  purchase_order_line_id: string | null;
  item_id: string | null;
  line_no: number;
  item_description: string | null;
  quantity: ApiDecimal;
  unit: string | null;
  hs_code?: string | null;
  origin_country?: string | null;
  customs_value: ApiDecimal | null;
  currency_id: string | null;
  import_duty_rate?: ApiDecimal | null;
  vat_rate?: ApiDecimal | null;
  excise_tax_rate?: ApiDecimal | null;
  special_consumption_tax_rate?: ApiDecimal | null;
  note: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  shipment_line?: ShipmentLineV1 | null;
};

export type CustomsDeclarationV1 = {
  id: string;
  shipment_id: string;
  declaration_no: string | null;
  customs_type: CustomsDeclarationTypeV1;
  customs_channel: CustomsDeclarationChannelV1 | null;
  broker_id: string | null;
  status: CustomsDeclarationStatusV1;
  submitted_at: string | null;
  draft_opened_at?: string | null;
  official_opened_at?: string | null;
  cleared_at: string | null;
  cancel_reason: string | null;
  note: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  shipment?: ShipmentV1 | null;
  broker?: Supplier | null;
  lines?: CustomsDeclarationLineV1[];
};

export type CreateCustomsDeclarationPayload = {
  declaration_no?: string | null;
  customs_type?: CustomsDeclarationTypeV1;
  customs_channel?: CustomsDeclarationChannelV1 | null;
  broker_id?: string | null;
  note?: string | null;
};

export type UpdateCustomsDeclarationPayload = Partial<
  Pick<
    CustomsDeclarationV1,
    | 'broker_id'
    | 'cancel_reason'
    | 'customs_channel'
    | 'customs_type'
    | 'declaration_no'
    | 'note'
    | 'submitted_at'
  >
>;

export type CreateCustomsDeclarationLinePayload = {
  shipment_line_id?: string | null;
  purchase_order_line_id?: string | null;
  item_id?: string | null;
  line_no: number;
  quantity?: ApiDecimal;
  unit?: string | null;
  item_description?: string | null;
  customs_value?: ApiDecimal | null;
  currency_id?: string | null;
  import_duty_rate?: ApiDecimal | null;
  vat_rate?: ApiDecimal | null;
  excise_tax_rate?: ApiDecimal | null;
  special_consumption_tax_rate?: ApiDecimal | null;
  hs_code?: string | null;
  origin_country?: string | null;
  note?: string | null;
};

export type UpdateCustomsDeclarationLinePayload = Partial<CreateCustomsDeclarationLinePayload>;

export type OpenCustomsDraftPayload = {
  opened_at?: string | null;
};

export type OpenCustomsOfficialPayload = {
  declaration_no: string;
  customs_channel: CustomsDeclarationChannelV1;
  opened_at?: string | null;
};

export type ClearCustomsDeclarationPayload = {
  cleared_at?: string | null;
  note?: string | null;
};

export type CancelCustomsDeclarationPayload = {
  cancel_reason: string;
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

export async function fetchCustomsDeclarationsByShipment(shipmentId: string) {
  const response = await apiClient.get<V1Response<CustomsDeclarationV1[], { total: number }>>(
    `/v1/shipments/${shipmentId}/customs-declarations`,
  );
  return unwrapV1Data(response);
}

export async function createCustomsDeclarationFromShipment(
  shipmentId: string,
  payload: CreateCustomsDeclarationPayload,
) {
  const response = await apiClient.post<V1Response<CustomsDeclarationV1>>(
    `/v1/shipments/${shipmentId}/customs-declarations`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchCustomsDeclaration(id: string) {
  const response = await apiClient.get<V1Response<CustomsDeclarationV1>>(`/v1/customs-declarations/${id}`);
  return unwrapV1Data(response);
}

export async function updateCustomsDeclaration(id: string, payload: UpdateCustomsDeclarationPayload) {
  const response = await apiClient.patch<V1Response<CustomsDeclarationV1>>(
    `/v1/customs-declarations/${id}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchCustomsDeclarationLines(id: string) {
  const response = await apiClient.get<V1Response<CustomsDeclarationLineV1[], { total: number }>>(
    `/v1/customs-declarations/${id}/lines`,
  );
  return unwrapV1Data(response);
}

export async function createCustomsDeclarationLine(
  id: string,
  payload: CreateCustomsDeclarationLinePayload,
) {
  const response = await apiClient.post<V1Response<CustomsDeclarationLineV1>>(
    `/v1/customs-declarations/${id}/lines`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateCustomsDeclarationLine(
  lineId: string,
  payload: UpdateCustomsDeclarationLinePayload,
) {
  const response = await apiClient.patch<V1Response<CustomsDeclarationLineV1>>(
    `/v1/customs-declaration-lines/${lineId}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deleteCustomsDeclarationLine(lineId: string) {
  const response = await apiClient.delete<V1Response<CustomsDeclarationLineV1>>(
    `/v1/customs-declaration-lines/${lineId}`,
  );
  return unwrapV1Data(response);
}

export async function openCustomsDraft(id: string, payload: OpenCustomsDraftPayload = {}) {
  const response = await apiClient.post<V1Response<CustomsDeclarationV1>>(
    `/v1/customs-declarations/${id}/open-draft`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function openCustomsOfficial(id: string, payload: OpenCustomsOfficialPayload) {
  const response = await apiClient.post<V1Response<CustomsDeclarationV1>>(
    `/v1/customs-declarations/${id}/open-official`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function clearCustomsDeclaration(id: string, payload: ClearCustomsDeclarationPayload = {}) {
  const response = await apiClient.post<V1Response<CustomsDeclarationV1>>(
    `/v1/customs-declarations/${id}/clear`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function cancelCustomsDeclaration(id: string, payload: CancelCustomsDeclarationPayload) {
  const response = await apiClient.post<V1Response<CustomsDeclarationV1>>(
    `/v1/customs-declarations/${id}/cancel`,
    payload,
  );
  return unwrapV1Data(response);
}
