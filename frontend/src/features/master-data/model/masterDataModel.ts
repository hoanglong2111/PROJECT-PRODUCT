import type { CreateItemPayload, UpdateItemPayload } from '@shared/api/items';
import type { ChargeCodePayload } from '@shared/api/chargeCodes';
import type { SupplierPayload } from '@shared/api/tradeMasterData';
import type { CarrierPayload, ForwarderPayload } from '@shared/api/forwarders';
import type { TaskTemplatePayload } from '@shared/api/taskTemplates';
import type { UomPayload } from '@shared/api/uoms';

export type SaveItemInput = {
  id?: string;
  payload: CreateItemPayload | UpdateItemPayload;
};

export type SaveChargeCodeInput = {
  id?: string;
  payload: ChargeCodePayload & {
    charge_code: string;
    charge_name_en: string;
    category: string;
    default_uom: string;
  };
};

export type SaveUomInput = {
  id?: string;
  payload: UomPayload & {
    uom_code: string;
    uom_name_en: string;
  };
};

export type SaveSupplierInput = {
  id?: string;
  payload: SupplierPayload & {
    supplier_code: string;
    supplier_name: string;
  };
};

export type SaveForwarderInput = {
  id?: string;
  payload: ForwarderPayload & {
    forwarder_code: string;
    forwarder_name: string;
    forwarder_type: string;
  };
};

export type SaveCarrierInput = {
  id?: string;
  payload: CarrierPayload & {
    carrier_code: string;
    carrier_name: string;
    carrier_type: string;
  };
};

export type SaveTaskTemplateInput = {
  id?: string;
  payload: TaskTemplatePayload & {
    group_code?: string;
    group_name: string;
    task_name: string;
    task_description: string;
  };
};

const MILESTONE_DOC_LABELS: Record<string, string> = {
  PRE_SHIPMENT: 'Pre-shipment',
  MS1_BOOKING_CONFIRMED: 'MS-1 Booking confirmed',
  MS2_CARGO_READY: 'MS-2 Cargo ready',
  MS3_LOADED: 'MS-3 Loaded',
  MS4_IN_TRANSIT: 'MS-4 In transit',
  MS5_ARRIVED_PORT: 'MS-5 Arrived port',
  MS6_CUSTOMS_SUBMITTED: 'MS-6 Customs submitted',
  MS7_CUSTOMS_CLEARED: 'MS-7 Customs cleared',
  MS8_DELIVERED_GATE: 'MS-8 Delivered to gate',
};

const DEPARTMENT_DOC_LABELS: Record<string, string> = {
  FDS_SALES: 'FDS Sales',
  FDS_OPS: 'FDS Ops',
  FDS_OPS_CUSTOMS: 'FDS Ops (Customs)',
  FDS_ACCOUNTING: 'FDS Kế toán',
  KBI_PURCHASING: 'KBI – Mua hàng',
  KBI_WAREHOUSE: 'KBI Kho',
};

const REV_COST_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  COST: 'Cost',
  BOTH: 'Both',
};

export function getMilestoneLabel(code: string | null | undefined, _t: (key: string) => string) {
  if (!code) return '—';
  return MILESTONE_DOC_LABELS[code] ?? code;
}

export function getDepartmentLabel(code: string | null | undefined, _t: (key: string) => string) {
  if (!code) return '-';
  return DEPARTMENT_DOC_LABELS[code] ?? code;
}

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

export const SUPPLIER_TYPE_VALUES = ['OVERSEAS_SEA', 'OVERSEAS_AIR', 'DOMESTIC'];
export const ITEM_CATEGORY_VALUES = ['NVL', 'BTP', 'TP', 'CCDC', 'DONG_GOI'];
export const ITEM_TYPE_VALUES = ['RAW', 'SEMI', 'FG', 'CONSUMABLE', 'PACKAGING'];
export const FORWARDER_TYPE_VALUES = ['SEA', 'AIR', 'TRUCKING', 'MULTI'];
export const CARRIER_TYPE_VALUES = ['SHIPPING_LINE', 'AIRLINE'];

function rawValue(value: string | null | undefined) {
  return value ? value : '-';
}

export function getSupplierTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

export const STATUS_FILTER_ALL = 'ALL';

export function statusToSelectValue(value: boolean | null | undefined): string {
  return value === true ? 'active' : value === false ? 'inactive' : STATUS_FILTER_ALL;
}

export function selectValueToStatus(value: string | null): boolean | null {
  return value === 'active' ? true : value === 'inactive' ? false : null;
}

export function getItemCategoryLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

export function getItemTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

export function getForwarderTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

export function getCarrierTypeLabel(value: string | null | undefined, _t: (key: string) => string) {
  return rawValue(value);
}

export function getRevCostLabel(value: string): string {
  return REV_COST_LABELS[value] ?? value;
}

export { formatDateTime } from '@shared/utils/date';
