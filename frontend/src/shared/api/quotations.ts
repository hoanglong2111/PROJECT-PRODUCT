import { apiClient } from './axiosConfig';
import type { ApiDecimal, PaginationMeta, V1ApiError, V1Response } from './purchaseOrders';
import type { Currency, Supplier } from './tradeMasterData';

export type QuotationStatusV1 =
  | 'DRAFT'
  | 'REQUESTED'
  | 'RECEIVED'
  | 'SUBMITTED_TO_KBI'
  | 'CONFIRMED_BY_KBI'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type QuotationTypeV1 = 'FREIGHT' | 'LOCAL_CHARGE' | 'CUSTOMS' | 'TRUCKING' | 'MIXED';
export type QuotationRefTypeV1 = 'DELIVERY_ORDER' | 'PO' | 'SHIPMENT' | 'CARRIER_DO' | 'DTO';

export type QuotationChargeTypeV1 =
  | 'OCEAN_FREIGHT'
  | 'AIR_FREIGHT'
  | 'BREAKBULK_FREIGHT'
  | 'ORIGIN_CHARGE'
  | 'LOCAL_CHARGE'
  | 'CUSTOMS_FEE'
  | 'TRUCKING'
  | 'DO_FEE'
  | 'HANDLING'
  | 'THC'
  | 'CIC'
  | 'EMC_EMF'
  | 'CLEANING'
  | 'CFS'
  | 'LOWERING_FEE'
  | 'LOADING_FEE'
  | 'DEMURRAGE'
  | 'DETENTION'
  | 'WAREHOUSE'
  | 'DOCUMENT_FEE'
  | 'OTHER';

export type QuotationChargeLineV1 = {
  id: string;
  quotation_id: string;
  line_no: number;
  charge_type: QuotationChargeTypeV1;
  description: string;
  quantity: ApiDecimal;
  unit: string | null;
  unit_price: ApiDecimal;
  tax_rate: ApiDecimal;
  amount: ApiDecimal;
  tax_amount: ApiDecimal;
  total_amount: ApiDecimal;
  note: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationEventV1 = {
  id: string;
  quotation_id: string;
  event_type: string;
  old_status: QuotationStatusV1 | string | null;
  new_status: QuotationStatusV1 | string | null;
  actor_name: string | null;
  event_at: string;
  note: string | null;
  payload: Record<string, unknown> | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationV1 = {
  id: string;
  quotation_group_id: string;
  quotation_no: string;
  version: number;
  ref_type: QuotationRefTypeV1;
  ref_id: string;
  supplier_id: string;
  quotation_type: QuotationTypeV1;
  currency_id?: string;
  currency_code?: string;
  exchange_rate: ApiDecimal;
  status: QuotationStatusV1;
  is_final: boolean;
  quoted_at: string | null;
  valid_until: string | null;
  total_amount: ApiDecimal;
  total_tax_amount: ApiDecimal;
  grand_total_amount: ApiDecimal;
  submitted_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  note: string | null;
  create_at: string;
  update_at: string;
  delete_at?: string | null;
  is_delete?: boolean;
  supplier?: Supplier | null;
  currency?: Currency | null;
  charge_lines?: QuotationChargeLineV1[];
  events?: QuotationEventV1[];
};

export type QuotationListMeta = {
  total: number;
  pagination: PaginationMeta;
};

export type ListQuotationsParams = {
  search?: string;
  ref_type?: QuotationRefTypeV1;
  ref_id?: string;
  status?: QuotationStatusV1 | '';
  supplier_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
};

export type QuotationChargeLinePayload = {
  line_no: number;
  charge_type: QuotationChargeTypeV1;
  description: string;
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  tax_rate?: number;
  note?: string | null;
};

export type CreateDeliveryOrderQuotationPayload = {
  quotation_no: string;
  supplier_id: string;
  quotation_type: QuotationTypeV1;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  quoted_at?: string | null;
  valid_until?: string | null;
  note?: string | null;
  charge_lines?: QuotationChargeLinePayload[];
};

export type UpdateQuotationPayload = Partial<
  Pick<
    CreateDeliveryOrderQuotationPayload,
    'currency_id' | 'exchange_rate' | 'note' | 'quotation_no' | 'quotation_type' | 'quoted_at' | 'supplier_id' | 'valid_until'
  >
>;

export type CreateQuotationVersionPayload = {
  new_quotation_no?: string | null;
  actor_name?: string | null;
  note?: string | null;
};

export type QuotationActionPayload = {
  actor_name?: string | null;
  note?: string | null;
};

function unwrapV1Data<T, TMeta>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    const firstError = apiResponse.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], QuotationListMeta> }) {
  if (response.data.errors?.length) {
    const firstError = response.data.errors[0] as V1ApiError;
    throw new Error(firstError.message || 'Request failed');
  }
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function fetchQuotationsV1(params: ListQuotationsParams = {}) {
  const response = await apiClient.get<V1Response<QuotationV1[], QuotationListMeta>>('/v1/quotations', {
    params,
  });
  return unwrapV1List(response);
}

export async function fetchQuotationV1(id: string) {
  const response = await apiClient.get<V1Response<QuotationV1>>(`/v1/quotations/${id}`);
  return unwrapV1Data(response);
}

export async function fetchDeliveryOrderQuotations(deliveryOrderId: string) {
  const response = await apiClient.get<V1Response<QuotationV1[], { total: number }>>(
    `/v1/delivery-orders/${deliveryOrderId}/quotations`,
  );
  return unwrapV1Data(response);
}

export async function createDeliveryOrderQuotation(
  deliveryOrderId: string,
  payload: CreateDeliveryOrderQuotationPayload,
) {
  const response = await apiClient.post<V1Response<QuotationV1>>(
    `/v1/delivery-orders/${deliveryOrderId}/quotations`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function requestQuotation(id: string) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotations/${id}/request`);
  return unwrapV1Data(response);
}

export async function receiveQuotation(id: string) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotations/${id}/receive`);
  return unwrapV1Data(response);
}

export async function submitQuotationToKbi(id: string) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotations/${id}/submit-to-kbi`);
  return unwrapV1Data(response);
}

export async function confirmQuotationByKbi(id: string, payload: QuotationActionPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(
    `/v1/quotations/${id}/confirm-by-kbi`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function markQuotationFinal(id: string, payload: QuotationActionPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(
    `/v1/quotations/${id}/mark-final`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function rejectQuotation(id: string, payload: QuotationActionPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotations/${id}/reject`, payload);
  return unwrapV1Data(response);
}

export async function cancelQuotation(id: string, payload: QuotationActionPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotations/${id}/cancel`, payload);
  return unwrapV1Data(response);
}

export async function createQuotationVersion(id: string, payload: CreateQuotationVersionPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(
    `/v1/quotations/${id}/create-version`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function fetchQuotationVersions(id: string) {
  const quotation = await fetchQuotationV1(id);
  const response = await fetchQuotationsV1({ page: 1, limit: 100 });
  return response.data.filter((item) => item.quotation_group_id === quotation.quotation_group_id);
}

export async function fetchQuotationChargeLines(id: string) {
  const response = await apiClient.get<V1Response<QuotationChargeLineV1[], { total: number }>>(
    `/v1/quotations/${id}/charge-lines`,
  );
  return unwrapV1Data(response);
}

export async function createQuotationChargeLine(id: string, payload: QuotationChargeLinePayload) {
  const response = await apiClient.post<V1Response<QuotationChargeLineV1>>(
    `/v1/quotations/${id}/charge-lines`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function updateQuotationChargeLine(id: string, payload: Partial<QuotationChargeLinePayload>) {
  const response = await apiClient.patch<V1Response<QuotationChargeLineV1>>(
    `/v1/quotation-charge-lines/${id}`,
    payload,
  );
  return unwrapV1Data(response);
}

export async function deleteQuotationChargeLine(id: string) {
  const response = await apiClient.delete<V1Response<QuotationChargeLineV1>>(
    `/v1/quotation-charge-lines/${id}`,
  );
  return unwrapV1Data(response);
}

export async function fetchQuotationEvents(id: string) {
  const response = await apiClient.get<V1Response<QuotationEventV1[], { total: number }>>(
    `/v1/quotations/${id}/events`,
  );
  return unwrapV1Data(response);
}
