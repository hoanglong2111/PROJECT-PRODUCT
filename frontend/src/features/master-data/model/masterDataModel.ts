import type { CreateItemPayload, UpdateItemPayload } from '@shared/api/items';
import type { ChargeCodePayload } from '@shared/api/chargeCodes';
import type { SupplierPayload } from '@shared/api/tradeMasterData';
import type { CarrierPayload, ForwarderPayload } from '@shared/api/forwarders';
import type { DepartmentCode, MilestoneCode, TaskTemplatePayload } from '@shared/api/taskTemplates';
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

const milestoneLabelKeys: Partial<Record<MilestoneCode | string, string>> = {
  PRE_SHIPMENT: 'masterData.milestonePreShipment',
  MS1_BOOKING_CONFIRMED: 'masterData.milestoneBookingConfirmed',
  MS2_CARGO_READY: 'masterData.milestoneCargoReady',
  MS3_LOADED: 'masterData.milestoneLoaded',
  MS4_IN_TRANSIT: 'masterData.milestoneInTransit',
  MS5_ARRIVED_PORT: 'masterData.milestoneArrivedPort',
  MS6_CUSTOMS_SUBMITTED: 'masterData.milestoneCustomsSubmitted',
  MS7_CUSTOMS_CLEARED: 'masterData.milestoneCustomsCleared',
  MS8_DELIVERED_GATE: 'masterData.milestoneDeliveredGate',
};

const departmentLabelKeys: Partial<Record<DepartmentCode | string, string>> = {
  FDS_SALES: 'masterData.departmentFdsSales',
  KBI_PURCHASING: 'masterData.departmentKbiPurchasing',
  FDS_OPS: 'masterData.departmentFdsOps',
  FDS_OPS_CUSTOMS: 'masterData.departmentFdsOpsCustoms',
  FDS_ACCOUNTING: 'masterData.departmentFdsAccounting',
  KBI_WAREHOUSE: 'masterData.departmentKbiWarehouse',
};

export function getMilestoneLabel(code: string | null | undefined, t: (key: string) => string) {
  if (!code) return t('masterData.noMilestone');

  const labelKey = milestoneLabelKeys[code];
  return labelKey ? t(labelKey) : code;
}

export function getDepartmentLabel(code: string | null | undefined, t: (key: string) => string) {
  if (!code) return '-';

  const labelKey = departmentLabelKeys[code];
  return labelKey ? t(labelKey) : code;
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

const supplierTypeLabelKeys: Record<string, string> = {
  OVERSEAS_SEA: 'masterData.supplierTypeOverseasSea',
  OVERSEAS_AIR: 'masterData.supplierTypeOverseasAir',
  DOMESTIC: 'masterData.supplierTypeDomestic',
};

const itemCategoryLabelKeys: Record<string, string> = {
  NVL: 'masterData.itemCategoryNvl',
  BTP: 'masterData.itemCategoryBtp',
  TP: 'masterData.itemCategoryTp',
  CCDC: 'masterData.itemCategoryCcdc',
  DONG_GOI: 'masterData.itemCategoryDongGoi',
};

const itemTypeLabelKeys: Record<string, string> = {
  RAW: 'masterData.itemTypeRaw',
  SEMI: 'masterData.itemTypeSemi',
  FG: 'masterData.itemTypeFg',
  CONSUMABLE: 'masterData.itemTypeConsumable',
  PACKAGING: 'masterData.itemTypePackaging',
};

export const SUPPLIER_TYPE_VALUES = Object.keys(supplierTypeLabelKeys);
export const ITEM_CATEGORY_VALUES = Object.keys(itemCategoryLabelKeys);
export const ITEM_TYPE_VALUES = Object.keys(itemTypeLabelKeys);

function localizedValue(value: string | null | undefined, labelKeys: Record<string, string>, t: (key: string) => string) {
  if (!value) return '-';
  const labelKey = labelKeys[value];
  return labelKey ? t(labelKey) : value;
}

export function getSupplierTypeLabel(value: string | null | undefined, t: (key: string) => string) {
  return localizedValue(value, supplierTypeLabelKeys, t);
}

// Status filter shared as a labeled Select (All / Active / Inactive), matching the
// other master-data filters so every control reads the same way.
export const STATUS_FILTER_ALL = 'ALL';

export function statusToSelectValue(value: boolean | null | undefined): string {
  return value === true ? 'active' : value === false ? 'inactive' : STATUS_FILTER_ALL;
}

export function selectValueToStatus(value: string | null): boolean | null {
  return value === 'active' ? true : value === 'inactive' ? false : null;
}

export function getStatusFilterOptions(t: (key: string) => string) {
  return [
    { value: STATUS_FILTER_ALL, label: t('common.all') },
    { value: 'active', label: t('masterData.activeStatus') },
    { value: 'inactive', label: t('masterData.inactiveStatus') },
  ];
}

export function getItemCategoryLabel(value: string | null | undefined, t: (key: string) => string) {
  return localizedValue(value, itemCategoryLabelKeys, t);
}

export function getItemTypeLabel(value: string | null | undefined, t: (key: string) => string) {
  return localizedValue(value, itemTypeLabelKeys, t);
}

export { formatDateTime } from '@shared/utils/date';
