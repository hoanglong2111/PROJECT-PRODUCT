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

export type ApiMessageResponse<T> = {
  data: T;
  message: string;
};

export type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type ItemCategory = 'NVL' | 'BTP' | 'TP' | 'CCDC' | 'DONG_GOI';

export type ItemType = 'RAW' | 'SEMI' | 'FG' | 'CONSUMABLE' | 'PACKAGING';

export type ItemTaxProfile = {
  id: string;
  item_id: string;
  hs_code?: string | null;
  import_duty_rate?: ApiDecimal | null;
  vat_rate?: ApiDecimal | null;
  co_form?: string | null;
  co_tax_note?: string | null;
  customs_type?: string | null;
  customs_note?: string | null;
  reference_doc_no?: string | null;
  location_code?: string | null;
  tax_note?: string | null;
  preferential_import_duty_rate?: ApiDecimal | null;
  is_default?: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type Item = {
  id: string;
  item_code: string;
  item_name: string;
  item_name_en?: string | null;
  item_category?: ItemCategory | string | null;
  item_type?: ItemType | string | null;
  base_uom?: string | null;
  purchase_uom?: string | null;
  uom_conversion?: ApiDecimal | null;
  hs_code?: string | null;
  country_of_origin?: string | null;
  unit_price_usd?: ApiDecimal | null;
  barcode?: string | null;
  note?: string | null;
  is_active?: boolean;
  customs_profiles?: ItemTaxProfile[];
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type CreateItemPayload = {
  item_code: string;
  item_name: string;
  item_name_en?: string;
  item_category?: ItemCategory | string;
  item_type?: ItemType | string;
  base_uom?: string;
  purchase_uom?: string;
  uom_conversion?: number;
  hs_code?: string;
  country_of_origin?: string;
  unit_price_usd?: ApiDecimal;
  barcode?: string;
  note?: string;
  is_active?: boolean;
};

export type UpdateItemPayload = Partial<CreateItemPayload>;

export type DeleteItemResponse = Pick<Item, 'delete_at' | 'id' | 'is_delete'>;

function normalizePaginatedResponse<T>(
  response: PaginatedResponse<T>,
  mapper: (record: T) => T,
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(mapper),
  };
}

function normalizeItemTaxProfile(profile: ItemTaxProfile): ItemTaxProfile {
  return {
    ...profile,
    is_default: profile.is_default ?? false,
  };
}

export function normalizeItem(item: Item): Item {
  return {
    ...item,
    item_name_en: item.item_name_en ?? item.item_name ?? null,
    item_category: item.item_category ?? null,
    item_type: item.item_type ?? null,
    base_uom: item.base_uom ?? null,
    purchase_uom: item.purchase_uom ?? item.base_uom ?? null,
    uom_conversion: item.uom_conversion ?? 1,
    hs_code: item.hs_code ?? item.customs_profiles?.find((p) => p.is_default)?.hs_code ?? item.customs_profiles?.[0]?.hs_code ?? null,
    country_of_origin: item.country_of_origin ?? null,
    unit_price_usd: item.unit_price_usd ?? null,
    barcode: item.barcode ?? null,
    note: item.note ?? null,
    is_active: item.is_active !== false,
    customs_profiles: item.customs_profiles?.map(normalizeItemTaxProfile) ?? [],
  };
}

export async function fetchItems(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Item>>('/items', { params });
  return normalizePaginatedResponse(response.data, normalizeItem);
}

export async function fetchItem(id: string) {
  const response = await apiClient.get<{ data: Item }>(`/items/${id}`);
  return normalizeItem(response.data.data);
}

export async function createItem(payload: CreateItemPayload) {
  const response = await apiClient.post<ApiMessageResponse<Item>>('/items', payload);
  return normalizeItem(response.data.data);
}

export async function updateItem(id: string, payload: UpdateItemPayload) {
  const response = await apiClient.put<ApiMessageResponse<Item>>(`/items/${id}`, payload);
  return normalizeItem(response.data.data);
}

export async function deleteItem(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<DeleteItemResponse>>(`/items/${id}`);
  return response.data.data;
}
