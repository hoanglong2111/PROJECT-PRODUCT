import type {
  CreateItemPayload,
  CreateItemTaxProfilePayload,
  ItemTaxProfile,
  UpdateItemPayload,
} from '@shared/api/items';
import type { ChargeCodePayload } from '@shared/api/chargeCodes';
import type {
  CurrencyPayload,
  IncotermPayload,
  SupplierPayload,
  TransportModePayload,
} from '@shared/api/tradeMasterData';
import type { CarrierPayload, ForwarderPayload } from '@shared/api/forwarders';
import type { DepartmentCode, MilestoneCode, TaskTemplatePayload } from '@shared/api/taskTemplates';
import type { UomPayload } from '@shared/api/uoms';

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
    category: string;
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
    group_code: string;
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

export { formatDateTime } from '@shared/utils/date';

export function getPrimaryTaxProfile(profiles: ItemTaxProfile[]) {
  return profiles.find((profile) => profile.is_default) ?? profiles[0] ?? null;
}
