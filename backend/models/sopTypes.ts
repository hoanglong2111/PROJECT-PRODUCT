import type { AppRole } from '../domain/auth';

export type Row = Record<string, unknown>;
export type ShippingMode = 'AIR' | 'FCL' | 'LCL';
export type MblType = 'COPY' | 'ORIGINAL' | 'SEAWAY_BILL' | 'SURRENDERED';
export type QuotationAction =
  | 'SEND_PRELIMINARY'
  | 'SEND_OFFICIAL'
  | 'CUSTOMER_APPROVED'
  | 'CUSTOMER_REJECTED'
  | 'REVISION_REQUESTED';
export type ChargeType = 'SELLING' | 'BUYING' | 'OBH';
export type CustomsChannel = 'GREEN' | 'YELLOW' | 'RED';
export type CustomsStatus = 'DRAFT' | 'SUBMITTED' | 'CLEARED' | 'NEEDS_DOCUMENTS' | 'INSPECTION' | 'VIOLATION_HANDLING';
export type CustomsLaneStatus =
  | 'GREEN_CLEARANCE'
  | 'YELLOW_NEED_SUPPLEMENT'
  | 'RED_FIELD_INSPECTION'
  | 'RED_VIOLATION_HANDLING'
  | 'RELEASE_READY';
export type AdvanceSettlementStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SETTLED';
export type SlaStatus = 'ON_TRACK' | 'OVERDUE' | 'DONE';

export const QUOTATION_STATUSES = new Set([
  'DRAFT',
  'PRELIMINARY_SENT',
  'OFFICIAL_SENT',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
  'BOOKED',
]);
export const SHIPPING_MODES = new Set<ShippingMode>(['AIR', 'FCL', 'LCL']);
export const QUOTATION_ACTIONS = new Set<QuotationAction>([
  'SEND_PRELIMINARY',
  'SEND_OFFICIAL',
  'CUSTOMER_APPROVED',
  'CUSTOMER_REJECTED',
  'REVISION_REQUESTED',
]);
export const CHARGE_TYPES = new Set<ChargeType>(['SELLING', 'BUYING', 'OBH']);
export const MBL_TYPES = new Set<MblType>(['COPY', 'ORIGINAL', 'SEAWAY_BILL', 'SURRENDERED']);
export const CUSTOMS_CHANNELS = new Set<CustomsChannel>(['GREEN', 'YELLOW', 'RED']);
export const CUSTOMS_STATUSES = new Set<CustomsStatus>([
  'DRAFT',
  'SUBMITTED',
  'CLEARED',
  'NEEDS_DOCUMENTS',
  'INSPECTION',
  'VIOLATION_HANDLING',
]);
export const CUSTOMS_LANE_STATUSES = new Set<CustomsLaneStatus>([
  'GREEN_CLEARANCE',
  'YELLOW_NEED_SUPPLEMENT',
  'RED_FIELD_INSPECTION',
  'RED_VIOLATION_HANDLING',
  'RELEASE_READY',
]);
export const ADVANCE_SETTLEMENT_STATUSES = new Set<AdvanceSettlementStatus>([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'SETTLED',
]);
export const DRIVE_REQUIRED_DOCUMENTS = ['Quotation', 'Final B/L', 'Customs Declaration', 'POD', 'OBH Note'];
export const TASK_ROLE_BY_APP_ROLE: Partial<Record<AppRole, string>> = {
  CUSTOMS_OFFICER: 'Customs Officer',
  FINANCE_OFFICER: 'Finance Officer',
  PIC_MANAGER: 'PIC Manager',
  PORT_OFFICER: 'Port Officer',
  SALE_STAFF: 'Sale Staff',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};
