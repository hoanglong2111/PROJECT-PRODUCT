import dayjs from 'dayjs';

import type {
  CreateItemPayload,
  CreateItemTaxProfilePayload,
  ItemTaxProfile,
  UpdateItemPayload,
} from '@shared/api/items';
import type {
  CurrencyPayload,
  IncotermPayload,
  SupplierPayload,
  TransportModePayload,
} from '@shared/api/tradeMasterData';

export type SaveItemGroupInput = {
  id?: string;
  payload: {
    group_code?: string;
    group_name: string;
    description?: string;
    default_hs_code?: string;
  };
};

export type SaveItemInput = {
  id?: string;
  payload: CreateItemPayload | UpdateItemPayload;
  taxProfileId?: string | null;
  taxPayload?: CreateItemTaxProfilePayload;
  shouldSaveTaxProfile: boolean;
};

export type SaveCurrencyInput = {
  id?: string;
  payload: CurrencyPayload & {
    currency_code: string;
    currency_name: string;
  };
};

export type SaveIncotermInput = {
  id?: string;
  payload: IncotermPayload & {
    incoterm_code: string;
    incoterm_name: string;
  };
};

export type SaveTransportModeInput = {
  id?: string;
  payload: TransportModePayload & {
    mode_code: string;
    mode_name: string;
    mode_type: string;
  };
};

export type SaveSupplierInput = {
  id?: string;
  payload: SupplierPayload & {
    supplier_code: string;
    supplier_name: string;
  };
};

export function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function formatRate(value: number | string | null | undefined) {
  const formatted = formatDecimal(value);
  return formatted === '-' ? formatted : `${formatted}%`;
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

export function getPrimaryTaxProfile(profiles: ItemTaxProfile[]) {
  return profiles.find((profile) => profile.is_default) ?? profiles[0] ?? null;
}
