import { ApiError } from '../errors';
import {
  ADVANCE_SETTLEMENT_STATUSES,
  CHARGE_TYPES,
  CUSTOMS_CHANNELS,
  CUSTOMS_LANE_STATUSES,
  CUSTOMS_STATUSES,
  MBL_TYPES,
  QUOTATION_ACTIONS,
  SHIPPING_MODES,
  TASK_ROLE_BY_APP_ROLE,
  type AdvanceSettlementStatus,
  type ChargeType,
  type CustomsChannel,
  type CustomsLaneStatus,
  type CustomsStatus,
  type MblType,
  type QuotationAction,
  type Row,
  type ShippingMode,
  type SlaStatus,
} from './sopTypes';

export function getSlaStatus(dueAt: string, done: boolean): SlaStatus {
  if (done) return 'DONE';
  return new Date(dueAt).getTime() < Date.now() ? 'OVERDUE' : 'ON_TRACK';
}

export function canDispatch(row: Row, transport?: Row | null) {
  const releaseByMblType = ['SEAWAY_BILL', 'SURRENDERED'].includes(stringValue(transport?.mbl_type));
  return stringValue(row.status) === 'CLEARED' && (row.telex_released === true || releaseByMblType);
}

export function normalizeShippingMode(value: unknown): ShippingMode {
  const normalized = requiredString(value, 'shippingMode').toUpperCase() as ShippingMode;
  if (!SHIPPING_MODES.has(normalized)) {
    throw new ApiError(400, 'shippingMode phải là AIR, FCL hoặc LCL.');
  }
  return normalized;
}

export function normalizeMblType(value: unknown): MblType {
  const normalized = requiredString(value, 'mblType').toUpperCase().replace(/\s+/g, '_') as MblType;
  if (!MBL_TYPES.has(normalized)) {
    throw new ApiError(400, 'mblType phải là COPY, ORIGINAL, SEAWAY_BILL hoặc SURRENDERED.');
  }
  return normalized;
}

export function normalizeQuotationAction(value: unknown): QuotationAction {
  const normalized = requiredString(value, 'action').toUpperCase() as QuotationAction;
  if (!QUOTATION_ACTIONS.has(normalized)) {
    throw new ApiError(400, 'action báo giá không hợp lệ.');
  }
  return normalized;
}

export function normalizeChargeType(value: unknown): ChargeType {
  const normalized = requiredString(value, 'chargeType').toUpperCase() as ChargeType;
  if (!CHARGE_TYPES.has(normalized)) {
    throw new ApiError(400, 'chargeType phải là SELLING, BUYING hoặc OBH.');
  }
  return normalized;
}

export function normalizeCustomsChannel(value: unknown): CustomsChannel {
  const normalized = requiredString(value, 'channel').toUpperCase() as CustomsChannel;
  if (!CUSTOMS_CHANNELS.has(normalized)) {
    throw new ApiError(400, 'channel hải quan phải là GREEN, YELLOW hoặc RED.');
  }
  return normalized;
}

export function normalizeCustomsStatus(value: unknown): CustomsStatus {
  const normalized = requiredString(value, 'status').toUpperCase() as CustomsStatus;
  if (!CUSTOMS_STATUSES.has(normalized)) {
    throw new ApiError(400, 'status hải quan không hợp lệ.');
  }
  return normalized;
}

export function normalizeCustomsLaneStatus(value: unknown): CustomsLaneStatus {
  const normalized = requiredString(value, 'laneStatus').toUpperCase() as CustomsLaneStatus;
  if (!CUSTOMS_LANE_STATUSES.has(normalized)) {
    throw new ApiError(400, 'laneStatus hải quan không hợp lệ.');
  }
  return normalized;
}

export function inferLaneStatus(channel: unknown, status: unknown): CustomsLaneStatus | null {
  const normalizedChannel = optionalString(channel) as CustomsChannel | null;
  const normalizedStatus = optionalString(status) as CustomsStatus | null;
  if (normalizedStatus === 'CLEARED') return 'RELEASE_READY';
  if (normalizedChannel === 'GREEN') return 'GREEN_CLEARANCE';
  if (normalizedChannel === 'YELLOW') return 'YELLOW_NEED_SUPPLEMENT';
  if (normalizedChannel === 'RED' && normalizedStatus === 'VIOLATION_HANDLING') return 'RED_VIOLATION_HANDLING';
  if (normalizedChannel === 'RED') return 'RED_FIELD_INSPECTION';
  return null;
}

export function customsNextAction(laneStatus: string | null, status: string) {
  if (status === 'CLEARED') return 'O.14_RECEIVE_DO_AND_DELIVER';
  if (laneStatus === 'GREEN_CLEARANCE') return 'O.10_NOTIFY_CUSTOMS_CLEARANCE';
  if (laneStatus === 'YELLOW_NEED_SUPPLEMENT') return 'O.11_SUPPLEMENT_DOCUMENTS';
  if (laneStatus === 'RED_FIELD_INSPECTION') return 'O.12_FIELD_INSPECTION';
  if (laneStatus === 'RED_VIOLATION_HANDLING') return 'O.13_HANDLE_INCIDENT';
  return 'O.08_PERFORM_CUSTOMS_DECLARATION';
}

export function normalizeAdvanceSettlementStatus(value: unknown): AdvanceSettlementStatus {
  const normalized = requiredString(value, 'status').toUpperCase() as AdvanceSettlementStatus;
  if (!ADVANCE_SETTLEMENT_STATUSES.has(normalized)) {
    throw new ApiError(400, 'status tạm ứng không hợp lệ.');
  }
  return normalized;
}

export function normalizeTaskOwnerRole(value: unknown) {
  const role = requiredString(value, 'assignedRole');
  if (!Object.values(TASK_ROLE_BY_APP_ROLE).includes(role)) {
    throw new ApiError(400, 'assignedRole không hợp lệ.');
  }
  return role;
}

export function normalizeCurrencyCode(value: unknown, fieldName: string) {
  const code = requiredString(value, fieldName).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new ApiError(400, `${fieldName} phải là mã tiền tệ 3 ký tự.`);
  }
  return code;
}

export function requiredString(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);
  if (!cleaned) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }
  return cleaned;
}

export function optionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function requiredPositiveNumber(value: unknown, fieldName: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn 0.`);
  }
  return numeric;
}

export function optionalDateTime(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);
  if (!cleaned) {
    return null;
  }
  const timestamp = new Date(cleaned).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new ApiError(400, `${fieldName} không hợp lệ.`);
  }
  return new Date(timestamp).toISOString();
}

export function optionalNonNegativeNumber(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn hoặc bằng 0.`);
  }
  return numeric;
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function stringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

export function toCamelObject(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [snakeToCamel(key), value])) as Row;
}

export function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());
}
