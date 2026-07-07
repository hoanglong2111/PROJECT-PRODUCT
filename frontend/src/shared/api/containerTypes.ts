import { apiClient } from './axiosConfig';
import type { ListParams, PaginatedResponse } from './tradeMasterData';

type ApiMessageResponse<T> = {
  data: T;
  message?: string;
};

export type ContainerType = {
  id: string;
  cont_code: string;
  iso_code: string;
  name_en: string;
  name_vn: string;
  category: string;
  size_ft: number | null;
  teu: number | null;
  tare_kg: number | null;
  payload_kg: number | null;
  gross_kg: number | null;
  capacity_cbm: number | null;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ContainerTypePayload = {
  cont_code?: string;
  iso_code?: string;
  name_en?: string;
  name_vn?: string;
  category?: string;
  size_ft?: number | null;
  teu?: number | null;
  tare_kg?: number | null;
  payload_kg?: number | null;
  gross_kg?: number | null;
  capacity_cbm?: number | null;
  is_active?: boolean;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeContainerType(containerType: ContainerType): ContainerType {
  return {
    ...containerType,
    iso_code: containerType.iso_code ?? '',
    name_vn: containerType.name_vn ?? '',
    category: containerType.category ?? '',
    size_ft: numberOrNull(containerType.size_ft),
    teu: numberOrNull(containerType.teu),
    tare_kg: numberOrNull(containerType.tare_kg),
    payload_kg: numberOrNull(containerType.payload_kg),
    gross_kg: numberOrNull(containerType.gross_kg),
    capacity_cbm: numberOrNull(containerType.capacity_cbm),
    is_active: containerType.is_active !== false,
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

export function containerTypeSelectOptions(list: ContainerType[]) {
  return list.map((containerType) => ({
    value: containerType.cont_code,
    label: `${containerType.cont_code} - ${containerType.name_en}`,
  }));
}

export function findContainerType(list: ContainerType[], code: string | null | undefined) {
  return list.find((containerType) => containerType.cont_code === code) ?? null;
}

export async function fetchContainerTypes(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<ContainerType>>('/container-types', { params });
  return normalizePaginatedResponse(response.data, normalizeContainerType);
}

export async function fetchContainerType(id: string) {
  const response = await apiClient.get<{ data: ContainerType }>(`/container-types/${id}`);
  return normalizeContainerType(unwrapData(response));
}

export async function createContainerType(
  payload: Required<Pick<ContainerTypePayload, 'cont_code' | 'name_en'>> & ContainerTypePayload,
) {
  const response = await apiClient.post<ApiMessageResponse<ContainerType>>('/container-types', payload);
  return normalizeContainerType(unwrapData(response));
}

export async function updateContainerType(id: string, payload: ContainerTypePayload) {
  const response = await apiClient.patch<ApiMessageResponse<ContainerType>>(`/container-types/${id}`, payload);
  return normalizeContainerType(unwrapData(response));
}

export async function deleteContainerType(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<ContainerType>>(`/container-types/${id}`);
  return normalizeContainerType(unwrapData(response));
}
