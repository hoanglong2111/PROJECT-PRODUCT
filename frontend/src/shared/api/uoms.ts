import { apiClient } from './axiosConfig';
import type { ListParams, PaginatedResponse } from './tradeMasterData';

type ApiMessageResponse<T> = {
  data: T;
  message?: string;
};

export type Uom = {
  id: string;
  uom_code: string;
  uom_name_en: string;
  uom_name_vn: string;
  description: string | null;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type UomPayload = {
  uom_code?: string;
  uom_name_en?: string;
  uom_name_vn?: string;
  description?: string | null;
  is_active?: boolean;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

function normalizeUom(uom: Uom): Uom {
  return {
    ...uom,
    uom_name_vn: uom.uom_name_vn ?? '',
    description: uom.description ?? null,
    is_active: uom.is_active !== false,
  };
}

function normalizePaginatedResponse<T>(
  response: PaginatedResponse<T>,
  mapper: (record: T) => T,
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(mapper),
  };
}

export async function fetchUoms(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Uom>>('/uoms', { params });
  return normalizePaginatedResponse(response.data, normalizeUom);
}

export async function fetchUom(id: string) {
  const response = await apiClient.get<{ data: Uom }>(`/uoms/${id}`);
  return normalizeUom(unwrapData(response));
}

export async function createUom(
  payload: Required<Pick<UomPayload, 'uom_code' | 'uom_name_en'>> & UomPayload,
) {
  const response = await apiClient.post<ApiMessageResponse<Uom>>('/uoms', payload);
  return normalizeUom(unwrapData(response));
}

export async function updateUom(id: string, payload: UomPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Uom>>(`/uoms/${id}`, payload);
  return normalizeUom(unwrapData(response));
}

export async function deleteUom(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Uom>>(`/uoms/${id}`);
  return normalizeUom(unwrapData(response));
}
