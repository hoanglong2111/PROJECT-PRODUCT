import { apiClient } from './axiosConfig';

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  pagination: PaginationMeta;
};

type ApiMessageResponse<T> = {
  data: T;
  message?: string;
};

export type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  is_active?: boolean;
};

export type ForwarderType = 'SEA' | 'AIR' | 'TRUCKING' | 'MULTI';

export type CarrierType = 'SHIPPING_LINE' | 'AIRLINE';

export type Forwarder = {
  id: string;
  forwarder_code: string;
  forwarder_name: string;
  forwarder_type: ForwarderType | string;
  country: string | null;
  contact_person: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_primary: boolean;
  is_active?: boolean;
  note: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ForwarderPayload = {
  forwarder_code?: string;
  forwarder_name?: string;
  forwarder_type?: ForwarderType | string;
  country?: string | null;
  contact_person?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
  note?: string | null;
};

export type Carrier = {
  id: string;
  carrier_code: string;
  carrier_name: string;
  carrier_type: CarrierType | string;
  scac_iata_code: string | null;
  service_route_note: string | null;
  contact_booking: string | null;
  contact_email: string | null;
  is_active?: boolean;
  note: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type CarrierPayload = {
  carrier_code?: string;
  carrier_name?: string;
  carrier_type?: CarrierType | string;
  scac_iata_code?: string | null;
  service_route_note?: string | null;
  contact_booking?: string | null;
  contact_email?: string | null;
  is_active?: boolean;
  note?: string | null;
};

export type ForwarderListParams = ListParams & {
  country?: string;
  forwarder_type?: ForwarderType | string;
  is_primary?: boolean;
};

export type CarrierListParams = ListParams & {
  carrier_type?: CarrierType | string;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

export function normalizeForwarder(forwarder: Forwarder): Forwarder {
  return {
    ...forwarder,
    country: forwarder.country ?? null,
    contact_email: forwarder.contact_email ?? null,
    contact_phone: forwarder.contact_phone ?? null,
    is_primary: forwarder.is_primary === true,
    is_active: forwarder.is_active !== false,
    note: forwarder.note ?? null,
  };
}

export function normalizeCarrier(carrier: Carrier): Carrier {
  return {
    ...carrier,
    scac_iata_code: carrier.scac_iata_code ?? null,
    service_route_note: carrier.service_route_note ?? null,
    contact_booking: carrier.contact_booking ?? null,
    contact_email: carrier.contact_email ?? null,
    is_active: carrier.is_active !== false,
    note: carrier.note ?? null,
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

export async function fetchForwarders(params: ForwarderListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Forwarder>>('/forwarders', { params });
  return normalizePaginatedResponse(response.data, normalizeForwarder);
}

export async function fetchForwarder(id: string) {
  const response = await apiClient.get<{ data: Forwarder }>(`/forwarders/${id}`);
  return normalizeForwarder(unwrapData(response));
}

export async function createForwarder(
  payload: Required<Pick<ForwarderPayload, 'forwarder_code' | 'forwarder_name' | 'forwarder_type'>> & ForwarderPayload,
) {
  const response = await apiClient.post<ApiMessageResponse<Forwarder>>('/forwarders', payload);
  return normalizeForwarder(unwrapData(response));
}

export async function updateForwarder(id: string, payload: ForwarderPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Forwarder>>(`/forwarders/${id}`, payload);
  return normalizeForwarder(unwrapData(response));
}

export async function deleteForwarder(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Forwarder>>(`/forwarders/${id}`);
  return normalizeForwarder(unwrapData(response));
}

export async function fetchCarriers(params: CarrierListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Carrier>>('/carriers', { params });
  return normalizePaginatedResponse(response.data, normalizeCarrier);
}

export async function fetchCarrier(id: string) {
  const response = await apiClient.get<{ data: Carrier }>(`/carriers/${id}`);
  return normalizeCarrier(unwrapData(response));
}

export async function createCarrier(
  payload: Required<Pick<CarrierPayload, 'carrier_code' | 'carrier_name' | 'carrier_type'>> & CarrierPayload,
) {
  const response = await apiClient.post<ApiMessageResponse<Carrier>>('/carriers', payload);
  return normalizeCarrier(unwrapData(response));
}

export async function updateCarrier(id: string, payload: CarrierPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Carrier>>(`/carriers/${id}`, payload);
  return normalizeCarrier(unwrapData(response));
}

export async function deleteCarrier(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Carrier>>(`/carriers/${id}`);
  return normalizeCarrier(unwrapData(response));
}
