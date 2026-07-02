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
  incoterm_name_vn: string;
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
  incoterm_name_vn?: string;
  description?: string | null;
  is_active?: boolean;
};

export type TransportMode = {
  id: string;
  mode_code: string;
  mode_name: string;
  mode_type: string;
  description: string | null;
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
  is_active?: boolean;
};

export type SupplierType = 'OVERSEAS_SEA' | 'OVERSEAS_AIR' | 'DOMESTIC';

export type Supplier = {
  id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_name_en?: string | null;
  supplier_type?: SupplierType | string | null;
  supplier_roles: string[];
  country: string | null;
  city?: string | null;
  address: string | null;
  contact_person?: string | null;
  /** @deprecated use contact_person */
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_term: string | null;
  default_currency_code: string | null;
  default_incoterm_code: string | null;
  default_currency_id: string | null;
  default_incoterm_id: string | null;
  lead_time_production_days?: number | null;
  /** @deprecated use lead_time_production_days */
  lead_time_days: number | null;
  bank_info?: string | null;
  note?: string | null;
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
  supplier_name_en?: string | null;
  supplier_type?: SupplierType | string | null;
  supplier_roles?: string[];
  country?: string | null;
  city?: string | null;
  address?: string | null;
  contact_person?: string | null;
  /** @deprecated use contact_person */
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
  lead_time_production_days?: number;
  /** @deprecated use lead_time_production_days */
  lead_time_days?: number;
  bank_info?: string | null;
  note?: string | null;
  is_active?: boolean;
};

export type SupplierListParams = ListParams & {
  role?: string;
  country?: string;
};

export type TransportModeListParams = ListParams & {
  mode_type?: string;
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
  charge_codes?: MasterDataOption[];
  uoms?: MasterDataOption[];
};

export type MasterDataOptionsParams = {
  role?: string;
  types?: Array<'currencies' | 'incoterms' | 'transport_modes' | 'suppliers' | 'charge_codes' | 'uoms'>;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
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

function normalizeCurrency(currency: Currency): Currency {
  return {
    ...currency,
    decimal_places:
      currency.decimal_places ?? (currency.currency_code === 'VND' ? 0 : 2),
    is_active: currency.is_active !== false,
  };
}

function normalizeTransportMode(mode: TransportMode): TransportMode {
  const modeType = mode.mode_type ?? inferTransportModeType(mode.mode_code);

  return {
    ...mode,
    mode_type: modeType,
    description: mode.description ?? null,
    is_active: mode.is_active !== false,
  };
}

function normalizeIncoterm(incoterm: Incoterm): Incoterm {
  return {
    ...incoterm,
    incoterm_name_vn: incoterm.incoterm_name_vn ?? '',
    description: incoterm.description ?? null,
    is_active: incoterm.is_active !== false,
  };
}

export function normalizeSupplier(supplier: Supplier): Supplier {
  const legacySupplier = supplier as Supplier & {
    email?: string | null;
    phone?: string | null;
    contact_name?: string | null;
    lead_time_days?: number | null;
    supplier_type?: string | null;
    transport_mode_ids?: string[];
    default_transport_mode_id?: string | null;
  };
  const transportModes = supplier.supplier_transport_modes ?? legacySupplier.transport_mode_ids?.map((transportModeId) => ({
    id: `${supplier.id}_${transportModeId}`,
    supplier_id: supplier.id,
    transport_mode_id: transportModeId,
    is_default: transportModeId === legacySupplier.default_transport_mode_id,
    transport_mode: null,
  })) ?? [];
  const contactPerson = supplier.contact_person ?? legacySupplier.contact_name ?? null;
  const leadTimeProductionDays = supplier.lead_time_production_days ?? legacySupplier.lead_time_days ?? null;

  return {
    ...supplier,
    supplier_name_en: supplier.supplier_name_en ?? null,
    supplier_type: normalizeSupplierType(supplier),
    supplier_roles: normalizeSupplierRoles(supplier.supplier_roles, legacySupplier.supplier_type),
    country: supplier.country ?? null,
    city: supplier.city ?? null,
    address: supplier.address ?? null,
    contact_person: contactPerson,
    contact_name: contactPerson,
    contact_email: supplier.contact_email ?? legacySupplier.email ?? null,
    contact_phone: supplier.contact_phone ?? legacySupplier.phone ?? null,
    payment_term: supplier.payment_term ?? null,
    default_currency_code: supplier.default_currency_code ?? supplier.default_currency?.currency_code ?? null,
    default_incoterm_code: supplier.default_incoterm_code ?? supplier.default_incoterm?.incoterm_code ?? null,
    default_currency_id: supplier.default_currency_id ?? supplier.default_currency?.id ?? null,
    default_incoterm_id: supplier.default_incoterm_id ?? supplier.default_incoterm?.id ?? null,
    default_currency: supplier.default_currency ? normalizeCurrency(supplier.default_currency) : null,
    default_incoterm: supplier.default_incoterm ? normalizeIncoterm(supplier.default_incoterm) : null,
    supplier_transport_modes: transportModes.map((mode) => ({
      ...mode,
      is_default: mode.is_default === true,
      transport_mode: mode.transport_mode ? normalizeTransportMode(mode.transport_mode) : null,
    })),
    lead_time_production_days: leadTimeProductionDays,
    lead_time_days: leadTimeProductionDays,
    bank_info: supplier.bank_info ?? null,
    note: supplier.note ?? null,
    is_active: supplier.is_active !== false,
  };
}

function normalizeSupplierRoles(roles: string[] | undefined, supplierType: string | null | undefined) {
  if (roles && roles.length > 0) {
    return Array.from(new Set(roles.map((role) => String(role).toUpperCase())));
  }

  const legacyRole = mapLegacySupplierRole(supplierType);
  return Array.from(
    new Set([legacyRole].filter(Boolean).map((role) => String(role).toUpperCase())),
  );
}

function mapLegacySupplierRole(role: string | null | undefined) {
  const normalized = String(role ?? '').toUpperCase();

  if (normalized === 'MANUFACTURER') {
    return 'SUPPLIER';
  }

  if (normalized === 'TRUCKING') {
    return 'TRUCKING_VENDOR';
  }

  return normalized || null;
}

function normalizeSupplierType(supplier: Supplier) {
  const normalized = String(supplier.supplier_type ?? '').toUpperCase();

  if (['OVERSEAS_SEA', 'OVERSEAS_AIR', 'DOMESTIC'].includes(normalized)) {
    return normalized;
  }

  if (normalized === 'FORWARDER' || normalized === 'TRUCKING') {
    return 'DOMESTIC';
  }

  if (normalized === 'MANUFACTURER') {
    return String(supplier.country ?? '').toUpperCase() === 'VN' ? 'DOMESTIC' : 'OVERSEAS_SEA';
  }

  return normalized || null;
}

function inferTransportModeType(modeCode: string) {
  const normalized = String(modeCode ?? '').toUpperCase();

  if (normalized.includes('AIR')) {
    return 'AIR';
  }

  if (normalized.includes('TRUCK') || normalized.includes('ROAD')) {
    return 'ROAD';
  }

  return 'SEA';
}

export async function fetchCurrencies(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Currency>>('/currencies', { params });
  return normalizePaginatedResponse(response.data, normalizeCurrency);
}

export async function fetchCurrency(id: string) {
  const response = await apiClient.get<{ data: Currency }>(`/currencies/${id}`);
  return normalizeCurrency(unwrapData(response));
}

export async function createCurrency(payload: Required<Pick<CurrencyPayload, 'currency_code' | 'currency_name'>> & CurrencyPayload) {
  const response = await apiClient.post<ApiMessageResponse<Currency>>('/currencies', payload);
  return normalizeCurrency(unwrapData(response));
}

export async function updateCurrency(id: string, payload: CurrencyPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Currency>>(`/currencies/${id}`, payload);
  return normalizeCurrency(unwrapData(response));
}

export async function deleteCurrency(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Currency>>(`/currencies/${id}`);
  return normalizeCurrency(unwrapData(response));
}

export async function fetchIncoterms(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Incoterm>>('/incoterms', { params });
  return normalizePaginatedResponse(response.data, normalizeIncoterm);
}

export async function fetchIncoterm(id: string) {
  const response = await apiClient.get<{ data: Incoterm }>(`/incoterms/${id}`);
  return normalizeIncoterm(unwrapData(response));
}

export async function createIncoterm(payload: Required<Pick<IncotermPayload, 'incoterm_code' | 'incoterm_name'>> & IncotermPayload) {
  const response = await apiClient.post<ApiMessageResponse<Incoterm>>('/incoterms', payload);
  return normalizeIncoterm(unwrapData(response));
}

export async function updateIncoterm(id: string, payload: IncotermPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Incoterm>>(`/incoterms/${id}`, payload);
  return normalizeIncoterm(unwrapData(response));
}

export async function deleteIncoterm(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Incoterm>>(`/incoterms/${id}`);
  return normalizeIncoterm(unwrapData(response));
}

export async function fetchTransportModes(params: TransportModeListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<TransportMode>>('/transport-modes', { params });
  return normalizePaginatedResponse(response.data, normalizeTransportMode);
}

export async function fetchTransportMode(id: string) {
  const response = await apiClient.get<{ data: TransportMode }>(`/transport-modes/${id}`);
  return normalizeTransportMode(unwrapData(response));
}

export async function createTransportMode(
  payload: Required<Pick<TransportModePayload, 'mode_code' | 'mode_name' | 'mode_type'>> & TransportModePayload,
) {
  const response = await apiClient.post<ApiMessageResponse<TransportMode>>('/transport-modes', payload);
  return normalizeTransportMode(unwrapData(response));
}

export async function updateTransportMode(id: string, payload: TransportModePayload) {
  const response = await apiClient.patch<ApiMessageResponse<TransportMode>>(`/transport-modes/${id}`, payload);
  return normalizeTransportMode(unwrapData(response));
}

export async function deleteTransportMode(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<TransportMode>>(`/transport-modes/${id}`);
  return normalizeTransportMode(unwrapData(response));
}

export async function fetchSuppliers(params: SupplierListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params });
  return normalizePaginatedResponse(response.data, normalizeSupplier);
}

export async function fetchSupplier(id: string) {
  const response = await apiClient.get<{ data: Supplier }>(`/suppliers/${id}`);
  return normalizeSupplier(unwrapData(response));
}

export async function createSupplier(payload: Required<Pick<SupplierPayload, 'supplier_code' | 'supplier_name'>> & SupplierPayload) {
  const response = await apiClient.post<ApiMessageResponse<Supplier>>('/suppliers', payload);
  return normalizeSupplier(unwrapData(response));
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  const response = await apiClient.patch<ApiMessageResponse<Supplier>>(`/suppliers/${id}`, payload);
  return normalizeSupplier(unwrapData(response));
}

export async function deleteSupplier(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<Supplier>>(`/suppliers/${id}`);
  return normalizeSupplier(unwrapData(response));
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
