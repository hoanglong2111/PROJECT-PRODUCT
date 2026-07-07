import { apiClient } from './axiosConfig';
import { parseContract, quotationRequestListSchema } from './contracts';
import type { Item } from './items';
import type { ApiDecimal, PaginationMeta, V1ApiError, V1Response } from './purchaseOrders';
import type { QuotationChargeLinePayload, QuotationV1 } from './quotations';
import type { Supplier } from './tradeMasterData';

export type QuotationRequestStatusV1 = 'SUBMITTED' | 'RECEIVED' | 'QUOTED' | 'CONFIRMED' | 'CANCELLED';

export type QuotationRequestLineV1 = {
  id: string;
  quotation_request_id: string;
  line_no: number;
  item_id: string | null;
  item_description: string | null;
  qty: ApiDecimal;
  unit: string | null;
  unit_price: ApiDecimal | null;
  gross_weight_kg: ApiDecimal | null;
  length_cm?: ApiDecimal | null;
  width_cm?: ApiDecimal | null;
  height_cm?: ApiDecimal | null;
  cbm?: ApiDecimal | null;
  note: string | null;
  item?: Item | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationRequestPackageLineV1 = {
  id: string;
  package_id: string;
  line_no: number;
  item_id: string | null;
  item_description: string | null;
  qty: ApiDecimal;
  unit: string | null;
  unit_price: ApiDecimal | null;
  note: string | null;
  item?: Item | null;
};

export type QuotationRequestPackageV1 = {
  id: string;
  quotation_request_id: string;
  package_no: number;
  package_type: string | null;
  length_cm: ApiDecimal | null;
  width_cm: ApiDecimal | null;
  height_cm: ApiDecimal | null;
  qty: ApiDecimal;
  gross_weight_per_package_kg: ApiDecimal | null;
  cbm?: ApiDecimal | null;
  lines?: QuotationRequestPackageLineV1[];
  note?: string | null;
  parent_package_no?: number | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationRequestContainerLineV1 = {
  id: string;
  container_id: string;
  line_no: number;
  item_id: string | null;
  item_description: string | null;
  qty: ApiDecimal;
  unit: string | null;
  unit_price: ApiDecimal | null;
  gross_weight_kg: ApiDecimal | null;
  note: string | null;
  item?: Item | null;
};

export type QuotationRequestContainerV1 = {
  id: string;
  quotation_request_id: string;
  container_no: number;
  container_type: string | null;
  qty: ApiDecimal;
  lines?: QuotationRequestContainerLineV1[];
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationRequestV1 = {
  id: string;
  rfq_no: string;
  status: QuotationRequestStatusV1;
  customer_ref: string | null;
  customer_po_ref: string | null;
  customer_contract_ref: string | null;
  supplier_id: string | null;
  incoterm_code: string | null;
  mode: string | null;
  currency_code: string | null;
  origin_port: string | null;
  destination_port: string | null;
  desired_cargo_ready_date: string | null;
  gross_weight_kg: ApiDecimal | null;
  volume_cbm: ApiDecimal | null;
  dim_weight_kg?: ApiDecimal | null;
  chargeable_weight_kg?: ApiDecimal | null;
  chargeable_revenue_ton?: ApiDecimal | null;
  container_type: string | null;
  note: string | null;
  supplier?: Supplier | null;
  lines?: QuotationRequestLineV1[];
  packages?: QuotationRequestPackageV1[];
  containers?: QuotationRequestContainerV1[];
  quotations?: QuotationV1[];
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type QuotationRequestListMeta = { total: number; pagination: PaginationMeta };

export type ListQuotationRequestsParams = {
  search?: string;
  status?: QuotationRequestStatusV1 | '';
  page?: number;
  limit?: number;
};

export type CreateQuotationRequestLinePayload = {
  line_no: number;
  item_id?: string | null;
  item_description?: string | null;
  qty?: number;
  unit?: string | null;
  unit_price?: number | null;
  gross_weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  cbm?: number | null;
  note?: string | null;
};

export type CreateQuotationRequestPackageLinePayload = {
  line_no: number;
  item_id?: string | null;
  item_description?: string | null;
  qty?: number;
  unit?: string | null;
  unit_price?: number | null;
  note?: string | null;
};

export type CreateQuotationRequestPackagePayload = {
  package_no: number;
  package_type?: string | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  qty?: number;
  gross_weight_per_package_kg?: number | null;
  cbm?: number | null;
  lines?: CreateQuotationRequestPackageLinePayload[];
  note?: string | null;
  parent_package_no?: number | null;
};

export type CreateQuotationRequestContainerLinePayload = {
  line_no: number;
  item_id?: string | null;
  item_description?: string | null;
  qty?: number;
  unit?: string | null;
  unit_price?: number | null;
  gross_weight_kg?: number | null;
  note?: string | null;
};

export type CreateQuotationRequestContainerPayload = {
  container_no: number;
  container_type?: string | null;
  qty?: number;
  lines?: CreateQuotationRequestContainerLinePayload[];
};

export type CreateQuotationRequestPayload = {
  customer_ref?: string | null;
  customer_po_ref?: string | null;
  customer_contract_ref?: string | null;
  supplier_id?: string | null;
  incoterm_code?: string | null;
  mode?: string | null;
  currency_code?: string | null;
  origin_port?: string | null;
  destination_port?: string | null;
  desired_cargo_ready_date?: string | null;
  gross_weight_kg?: number | null;
  volume_cbm?: number | null;
  dim_weight_kg?: number | null;
  chargeable_weight_kg?: number | null;
  chargeable_revenue_ton?: number | null;
  container_type?: string | null;
  note?: string | null;
  lines?: CreateQuotationRequestLinePayload[];
  packages?: CreateQuotationRequestPackagePayload[];
  containers?: CreateQuotationRequestContainerPayload[];
};

export type CreateQuotationFromRequestPayload = {
  currency_code?: string | null;
  valid_until?: string | null;
  charge_lines?: QuotationChargeLinePayload[];
};

export function buildRfqRouteLabel(rfq: Pick<QuotationRequestV1, 'origin_port' | 'destination_port'>): string {
  return `${rfq.origin_port ?? '—'} → ${rfq.destination_port ?? '—'}`;
}

function unwrapV1Data<T, TMeta = Record<string, unknown>>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) {
    throw new Error((apiResponse.errors[0] as V1ApiError).message || 'Request failed');
  }
  return apiResponse.data;
}

function unwrapV1List<T>(response: { data: V1Response<T[], QuotationRequestListMeta> }) {
  if (response.data.errors?.length) {
    throw new Error((response.data.errors[0] as V1ApiError).message || 'Request failed');
  }
  return { data: response.data.data, meta: response.data.meta };
}

export async function fetchQuotationRequests(params: ListQuotationRequestsParams = {}) {
  const response = await apiClient.get<V1Response<QuotationRequestV1[], QuotationRequestListMeta>>(
    '/v1/quotation-requests',
    { params },
  );
  const result = unwrapV1List(response);
  parseContract(quotationRequestListSchema, result.data, 'fetchQuotationRequests');
  return result;
}

export async function fetchQuotationRequest(id: string) {
  const response = await apiClient.get<V1Response<QuotationRequestV1>>(`/v1/quotation-requests/${id}`);
  return unwrapV1Data(response);
}

export async function createQuotationRequest(payload: CreateQuotationRequestPayload) {
  const response = await apiClient.post<V1Response<QuotationRequestV1>>('/v1/quotation-requests', payload);
  return unwrapV1Data(response);
}

export async function receiveQuotationRequest(id: string) {
  const response = await apiClient.post<V1Response<QuotationRequestV1>>(`/v1/quotation-requests/${id}/receive`);
  return unwrapV1Data(response);
}

export async function cancelQuotationRequest(id: string) {
  const response = await apiClient.post<V1Response<QuotationRequestV1>>(`/v1/quotation-requests/${id}/cancel`);
  return unwrapV1Data(response);
}

export async function createQuotationFromRequest(id: string, payload: CreateQuotationFromRequestPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotation-requests/${id}/quotations`, payload);
  return unwrapV1Data(response);
}
