import { apiClient } from './axiosConfig';
import type { ListParams, PaginatedResponse } from './tradeMasterData';

type ApiMessageResponse<T> = {
  data: T;
  message?: string;
};

export type ChargeCodeCategory =
  | 'ORIGIN'
  | 'CUSTOMS'
  | 'DOCUMENTATION'
  | 'FREIGHT'
  | 'SURCHARGE'
  | 'DESTINATION'
  | 'DISBURSEMENT'
  | 'ANCILLARY'
  | 'SERVICE'
  | string;

export type ChargeGroup =
  | 'ORIGIN_EXPORT'
  | 'MAIN_FREIGHT'
  | 'FREIGHT_SURCHARGE'
  | 'DOCUMENTATION_FILING'
  | 'DESTINATION_IMPORT'
  | 'ANCILLARY_ACCESSORIAL'
  | 'SERVICE_OTHER'
  | string;

export type ChargeRevCost = 'REVENUE' | 'COST' | 'BOTH';

export type ChargeCode = {
  id: string;
  charge_code: string;
  charge_name_en: string;
  charge_name_vn: string;
  group: ChargeGroup;
  category: ChargeCodeCategory;
  default_uom: string;
  sea_fcl: boolean;
  sea_lcl: boolean;
  air: boolean;
  road: boolean;
  rail: boolean;
  rev_cost: ChargeRevCost;
  taxable: boolean;
  description: string | null;
  is_active: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ChargeCodePayload = {
  charge_code?: string;
  charge_name_en?: string;
  charge_name_vn?: string;
  group?: ChargeGroup;
  category?: ChargeCodeCategory;
  default_uom?: string;
  sea_fcl?: boolean;
  sea_lcl?: boolean;
  air?: boolean;
  road?: boolean;
  rail?: boolean;
  rev_cost?: ChargeRevCost;
  taxable?: boolean;
  description?: string | null;
  is_active?: boolean;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

export function normalizeChargeCode(chargeCode: ChargeCode): ChargeCode {
  const group = chargeCode.group ?? legacyGroupFromCategory(chargeCode.category);

  return {
    ...chargeCode,
    charge_name_vn: chargeCode.charge_name_vn ?? '',
    group,
    category: normalizeChargeCategory(chargeCode.category),
    default_uom: chargeCode.default_uom ?? 'SHPT',
    sea_fcl: chargeCode.sea_fcl === true,
    sea_lcl: chargeCode.sea_lcl === true,
    air: chargeCode.air === true,
    road: chargeCode.road === true,
    rail: chargeCode.rail === true,
    rev_cost: chargeCode.rev_cost ?? 'BOTH',
    taxable: chargeCode.taxable === true,
    description: chargeCode.description ?? null,
    is_active: chargeCode.is_active !== false,
  };
}

function normalizeChargeCategory(category: ChargeCodeCategory): ChargeCodeCategory {
  const value = String(category || '').toUpperCase();
  const valid = new Set([
    'ORIGIN',
    'CUSTOMS',
    'DOCUMENTATION',
    'FREIGHT',
    'SURCHARGE',
    'DESTINATION',
    'DISBURSEMENT',
    'ANCILLARY',
    'SERVICE',
  ]);

  return valid.has(value) ? (value as ChargeCodeCategory) : 'SERVICE';
}

function legacyGroupFromCategory(category: ChargeCodeCategory): ChargeGroup {
  const value = String(category || '').toUpperCase();
  const legacyGroups = new Set([
    'ORIGIN_EXPORT',
    'MAIN_FREIGHT',
    'FREIGHT_SURCHARGE',
    'DOCUMENTATION_FILING',
    'DESTINATION_IMPORT',
    'ANCILLARY_ACCESSORIAL',
    'SERVICE_OTHER',
    'DOCUMENTATION',
    'ANCILLARY',
  ]);

  if (!legacyGroups.has(value)) {
    return 'SERVICE_OTHER';
  }

  if (value === 'DOCUMENTATION') {
    return 'DOCUMENTATION_FILING';
  }

  if (value === 'ANCILLARY') {
    return 'ANCILLARY_ACCESSORIAL';
  }

  return value as ChargeGroup;
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

export async function fetchChargeCodes(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<ChargeCode>>('/charge-codes', { params });
  return normalizePaginatedResponse(response.data, normalizeChargeCode);
}

export async function fetchChargeCode(id: string) {
  const response = await apiClient.get<{ data: ChargeCode }>(`/charge-codes/${id}`);
  return normalizeChargeCode(unwrapData(response));
}

export async function createChargeCode(
  payload: Required<Pick<ChargeCodePayload, 'charge_code' | 'charge_name_en' | 'group' | 'category' | 'default_uom'>> & ChargeCodePayload,
) {
  const response = await apiClient.post<ApiMessageResponse<ChargeCode>>('/charge-codes', payload);
  return normalizeChargeCode(unwrapData(response));
}

export async function updateChargeCode(id: string, payload: ChargeCodePayload) {
  const response = await apiClient.patch<ApiMessageResponse<ChargeCode>>(`/charge-codes/${id}`, payload);
  return normalizeChargeCode(unwrapData(response));
}

export async function deleteChargeCode(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<ChargeCode>>(`/charge-codes/${id}`);
  return normalizeChargeCode(unwrapData(response));
}
