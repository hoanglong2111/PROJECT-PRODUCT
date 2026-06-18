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

export type ItemGroup = {
  id: string;
  group_code?: string | null;
  group_name: string;
  description?: string | null;
  default_hs_code?: string | null;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type ItemGroupSummary = Pick<
  ItemGroup,
  'description' | 'default_hs_code' | 'group_code' | 'group_name' | 'id'
>;

export type CreateItemGroupPayload = {
  group_code?: string;
  group_name: string;
  description?: string;
  default_hs_code?: string;
};

export type UpdateItemGroupPayload = Partial<CreateItemGroupPayload>;

export type ListItemsParams = ListParams & {
  item_group_id?: string;
};

export type ItemCategory = 'NVL' | 'BTP' | 'TP' | 'CCDC' | 'DONG_GOI';

export type ItemType = 'RAW' | 'SEMI' | 'FG' | 'CONSUMABLE' | 'PACKAGING';

export type Item = {
  id: string;
  item_code: string;
  item_name: string;
  item_name_en?: string | null;
  item_category?: ItemCategory | string | null;
  item_description?: string | null;
  item_group_id?: string | null;
  base_uom?: string | null;
  purchase_uom?: string | null;
  uom_conversion?: ApiDecimal | null;
  hs_code?: string | null;
  country_of_origin?: string | null;
  unit_price_usd?: ApiDecimal | null;
  barcode?: string | null;
  note?: string | null;
  /** @deprecated use base_uom for item master records */
  unit?: string | null;
  item_type?: ItemType | string | null;
  /** @deprecated use country_of_origin for item master records */
  origin_country?: string | null;
  /** @deprecated optional legacy item fields kept for old records */
  brand?: string | null;
  /** @deprecated optional legacy item fields kept for old records */
  model?: string | null;
  /** @deprecated optional legacy item fields kept for old records */
  is_new?: boolean;
  /** @deprecated optional legacy item fields kept for old records */
  lead_time_days?: number | null;
  /** @deprecated optional legacy item fields kept for old records */
  moq?: ApiDecimal | null;
  is_active?: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
  item_group?: ItemGroupSummary | null;
  customs_profiles?: ItemTaxProfile[];
};

export type CreateItemPayload = {
  item_code: string;
  item_name: string;
  item_name_en?: string;
  item_category?: ItemCategory | string;
  item_description?: string;
  item_group_id?: string;
  base_uom?: string;
  purchase_uom?: string;
  uom_conversion?: number;
  hs_code?: string;
  country_of_origin?: string;
  unit_price_usd?: ApiDecimal;
  barcode?: string;
  note?: string;
  /** @deprecated use base_uom for item master records */
  unit?: string;
  item_type?: ItemType | string;
  /** @deprecated use country_of_origin for item master records */
  origin_country?: string;
  /** @deprecated optional legacy item fields kept for old records */
  brand?: string;
  /** @deprecated optional legacy item fields kept for old records */
  model?: string;
  /** @deprecated optional legacy item fields kept for old records */
  is_new?: boolean;
  /** @deprecated optional legacy item fields kept for old records */
  lead_time_days?: number;
  /** @deprecated optional legacy item fields kept for old records */
  moq?: number;
  is_active?: boolean;
};

export type UpdateItemPayload = Partial<CreateItemPayload>;

export type DeleteItemResponse = Pick<Item, 'delete_at' | 'id' | 'is_delete'> & {
  deleted_tax_profiles: number;
};

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

export type ItemTaxProfilesResponse = {
  data: ItemTaxProfile[];
  total: number;
};

export type CreateItemTaxProfilePayload = {
  hs_code?: string;
  import_duty_rate?: number;
  vat_rate?: number;
  co_form?: string;
  co_tax_note?: string;
  customs_type?: string;
  customs_note?: string;
  reference_doc_no?: string;
  location_code?: string;
  tax_note?: string;
  preferential_import_duty_rate?: number;
  is_default?: boolean;
};

export type UpdateItemTaxProfilePayload = Partial<CreateItemTaxProfilePayload>;

function normalizePaginatedResponse<T>(
  response: PaginatedResponse<T>,
  mapper: (record: T) => T,
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(mapper),
  };
}

export function normalizeItem(item: Item): Item {
  const legacyItem = item as Item & {
    description?: string | null;
  };
  const baseUom = item.base_uom ?? item.unit ?? null;
  const countryOfOrigin = item.country_of_origin ?? item.origin_country ?? null;
  const note = item.note ?? item.item_description ?? legacyItem.description ?? null;

  return {
    ...item,
    item_name_en: item.item_name_en ?? item.item_name ?? null,
    item_category: item.item_category ?? null,
    item_type: item.item_type ?? null,
    base_uom: baseUom,
    unit: baseUom,
    purchase_uom: item.purchase_uom ?? baseUom,
    uom_conversion: item.uom_conversion ?? 1,
    hs_code: item.hs_code ?? item.customs_profiles?.find((profile) => profile.is_default)?.hs_code ?? item.customs_profiles?.[0]?.hs_code ?? null,
    country_of_origin: countryOfOrigin,
    origin_country: countryOfOrigin,
    unit_price_usd: item.unit_price_usd ?? null,
    barcode: item.barcode ?? null,
    note,
    item_description: note,
    is_new: item.is_new ?? true,
    lead_time_days: item.lead_time_days ?? null,
    moq: item.moq ?? null,
    is_active: item.is_active !== false,
    customs_profiles: item.customs_profiles?.map(normalizeItemTaxProfile) ?? [],
  };
}

function normalizeItemTaxProfile(profile: ItemTaxProfile): ItemTaxProfile {
  const legacyProfile = profile as ItemTaxProfile & {
    preferential_tax_rate?: ApiDecimal | null;
  };

  return {
    ...profile,
    preferential_import_duty_rate:
      profile.preferential_import_duty_rate ?? legacyProfile.preferential_tax_rate ?? null,
    is_default: profile.is_default ?? false,
  };
}

export async function fetchItemGroups(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<ItemGroup>>('/item-groups', { params });
  return response.data;
}

export async function fetchItemGroup(id: string) {
  const response = await apiClient.get<{ data: ItemGroup }>(`/item-groups/${id}`);
  return response.data.data;
}

export async function fetchItemsByGroup(id: string, params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Item>>(`/item-groups/${id}/items`, {
    params,
  });
  return normalizePaginatedResponse(response.data, normalizeItem);
}

export async function createItemGroup(payload: CreateItemGroupPayload) {
  const response = await apiClient.post<ApiMessageResponse<ItemGroup>>('/item-groups', payload);
  return response.data.data;
}

export async function updateItemGroup(id: string, payload: UpdateItemGroupPayload) {
  const response = await apiClient.put<ApiMessageResponse<ItemGroup>>(`/item-groups/${id}`, payload);
  return response.data.data;
}

export async function deleteItemGroup(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<ItemGroup>>(`/item-groups/${id}`);
  return response.data.data;
}

export async function fetchItems(params: ListItemsParams = {}) {
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

export async function fetchItemTaxProfiles(itemId: string) {
  const response = await apiClient.get<ItemTaxProfilesResponse>(`/items/${itemId}/tax-profile`);
  return response.data.data.map(normalizeItemTaxProfile);
}

export async function createItemTaxProfile(itemId: string, payload: CreateItemTaxProfilePayload) {
  const response = await apiClient.post<ApiMessageResponse<ItemTaxProfile>>(
    `/items/${itemId}/tax-profile`,
    payload,
  );
  return normalizeItemTaxProfile(response.data.data);
}

export async function updateItemTaxProfile(id: string, payload: UpdateItemTaxProfilePayload) {
  const response = await apiClient.put<ApiMessageResponse<ItemTaxProfile>>(
    `/item-tax-profiles/${id}`,
    payload,
  );
  return normalizeItemTaxProfile(response.data.data);
}

export async function deleteItemTaxProfile(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<ItemTaxProfile>>(
    `/item-tax-profiles/${id}`,
  );
  return normalizeItemTaxProfile(response.data.data);
}
