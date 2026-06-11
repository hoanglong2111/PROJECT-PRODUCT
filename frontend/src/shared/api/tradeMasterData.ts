import { apiClient } from './axiosConfig';

export type ApiDecimal = number | string;

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
  search?: string;
  q?: string;
  is_active?: boolean;
};

export type Currency = {
  id: string;
  currency_code: string;
  currency_name: string;
  symbol: string | null;
  decimal_places: number;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type CurrencyPayload = {
  currency_code?: string;
  currency_name?: string;
  symbol?: string | null;
  decimal_places?: number;
  is_active?: boolean;
};

export type Incoterm = {
  id: string;
  incoterm_code: string;
  incoterm_name: string;
  description: string | null;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type IncotermPayload = {
  incoterm_code?: string;
  incoterm_name?: string;
  description?: string | null;
  is_active?: boolean;
};

export type TransportMode = {
  id: string;
  mode_code: string;
  mode_name: string;
  mode_type: string;
  description: string | null;
  is_international: boolean;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type TransportModePayload = {
  mode_code?: string;
  mode_name?: string;
  mode_type?: string;
  description?: string | null;
  is_international?: boolean;
  is_active?: boolean;
};

export type Supplier = {
  id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_roles: string[];
  country: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_term: string | null;
  default_currency_code: string | null;
  default_incoterm_code: string | null;
  default_currency_id: string | null;
  default_incoterm_id: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  default_currency?: Currency | null;
  default_incoterm?: Incoterm | null;
  supplier_transport_modes?: SupplierTransportMode[];
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type SupplierTransportMode = {
  id: string;
  supplier_id: string;
  transport_mode_id: string;
  is_default: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  transport_mode?: TransportMode | null;
};

export type SupplierPayload = {
  supplier_code?: string;
  supplier_name?: string;
  supplier_roles?: string[];
  country?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  payment_term?: string | null;
  default_currency_code?: string | null;
  default_incoterm_code?: string | null;
  default_currency_id?: string | null;
  default_incoterm_id?: string | null;
  transport_mode_ids?: string[];
  default_transport_mode_id?: string | null;
  lead_time_days?: number;
  is_active?: boolean;
};

export type SupplierListParams = ListParams & {
  role?: string;
  country?: string;
};

export type TransportModeListParams = ListParams & {
  mode_type?: string;
  is_international?: boolean;
};

export type MasterDataOption = {
  label: string;
  value: string;
};

export type MasterDataOptions = {
  currencies?: MasterDataOption[];
  incoterms?: MasterDataOption[];
  transport_modes?: MasterDataOption[];
  suppliers?: MasterDataOption[];
};

export type MasterDataOptionsParams = {
  role?: string;
  types?: Array<'currencies' | 'incoterms' | 'transport_modes' | 'suppliers'>;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

export async function fetchCurrencies(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Currency>>('/currencies', { params });
  return response.data;
}

export async function fetchCurrency(id: string) {
  const response = await apiClient.get<{ data: Currency }>(`/currencies/${id}`);
  return unwrapData(response);
}

export async function createCurrency(payload: Required<Pick<CurrencyPayload, 'currency_code' | 'currency_name'>> & CurrencyPayload) {
  const response = await apiClient.post<ApiMessageResponse<Currency>>('/currencies', payload);
  return unwrapData(response);
}

export async function updateCurrency(id: string, payload: CurrencyPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Currency>>(`/currencies/${id}`, payload);
  return unwrapData(response);
}

export async function deleteCurrency(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Currency>>(`/currencies/${id}`);
  return unwrapData(response);
}

export async function fetchIncoterms(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Incoterm>>('/incoterms', { params });
  return response.data;
}

export async function fetchIncoterm(id: string) {
  const response = await apiClient.get<{ data: Incoterm }>(`/incoterms/${id}`);
  return unwrapData(response);
}

export async function createIncoterm(payload: Required<Pick<IncotermPayload, 'incoterm_code' | 'incoterm_name'>> & IncotermPayload) {
  const response = await apiClient.post<ApiMessageResponse<Incoterm>>('/incoterms', payload);
  return unwrapData(response);
}

export async function updateIncoterm(id: string, payload: IncotermPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Incoterm>>(`/incoterms/${id}`, payload);
  return unwrapData(response);
}

export async function deleteIncoterm(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Incoterm>>(`/incoterms/${id}`);
  return unwrapData(response);
}

export async function fetchTransportModes(params: TransportModeListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<TransportMode>>('/transport-modes', { params });
  return response.data;
}

export async function fetchTransportMode(id: string) {
  const response = await apiClient.get<{ data: TransportMode }>(`/transport-modes/${id}`);
  return unwrapData(response);
}

export async function createTransportMode(
  payload: Required<Pick<TransportModePayload, 'mode_code' | 'mode_name' | 'mode_type'>> & TransportModePayload,
) {
  const response = await apiClient.post<ApiMessageResponse<TransportMode>>('/transport-modes', payload);
  return unwrapData(response);
}

export async function updateTransportMode(id: string, payload: TransportModePayload) {
  const response = await apiClient.patch<ApiMessageResponse<TransportMode>>(`/transport-modes/${id}`, payload);
  return unwrapData(response);
}

export async function deleteTransportMode(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<TransportMode>>(`/transport-modes/${id}`);
  return unwrapData(response);
}

export async function fetchSuppliers(params: SupplierListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params });
  return response.data;
}

export async function fetchSupplier(id: string) {
  const response = await apiClient.get<{ data: Supplier }>(`/suppliers/${id}`);
  return unwrapData(response);
}

export async function createSupplier(payload: Required<Pick<SupplierPayload, 'supplier_code' | 'supplier_name'>> & SupplierPayload) {
  const response = await apiClient.post<ApiMessageResponse<Supplier>>('/suppliers', payload);
  return unwrapData(response);
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Supplier>>(`/suppliers/${id}`, payload);
  return unwrapData(response);
}

export async function deleteSupplier(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Supplier>>(`/suppliers/${id}`);
  return unwrapData(response);
}

export async function fetchMasterDataOptions(params: MasterDataOptionsParams = {}) {
  const response = await apiClient.get<{ data: MasterDataOptions }>('/options', {
    params: {
      role: params.role,
      types: params.types?.join(','),
    },
  });

  return unwrapData(response);
}
