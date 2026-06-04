import type {
  CustomsChannel,
  CustomsLaneStatus,
  CustomsStatus,
  DeliveryOrder,
  FinanceChargeType,
  MblType,
  TaskRole,
} from '@shared/api/logistics';

export const shippingModeLabel: Record<DeliveryOrder['logistics_shipping']['shipping_method'], string> = {
  AIR: 'AIR',
  ROAD: 'ROAD',
  SEA: 'SEA',
};

export const documentTypeOptions = [
  'Draft B/L',
  'Final B/L',
  'Commercial Invoice',
  'Packing List',
  'Customs Declaration',
  'Arrival Notice',
  'POD',
  'Debit Note',
  'Credit Note',
  'OBH Note',
  'Quotation',
].map((value) => ({ label: value, value }));

export const chargeTypeOptions: Array<{ label: string; value: FinanceChargeType }> = [
  { label: 'Selling', value: 'SELLING' },
  { label: 'Buying', value: 'BUYING' },
  { label: 'OBH', value: 'OBH' },
];

export const customsChannelOptions: Array<{ label: string; value: CustomsChannel }> = [
  { label: 'Green', value: 'GREEN' },
  { label: 'Yellow', value: 'YELLOW' },
  { label: 'Red', value: 'RED' },
];

export const customsStatusOptions: Array<{ label: string; value: CustomsStatus }> = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Cleared', value: 'CLEARED' },
  { label: 'Needs documents', value: 'NEEDS_DOCUMENTS' },
  { label: 'Inspection', value: 'INSPECTION' },
  { label: 'Violation handling', value: 'VIOLATION_HANDLING' },
];

export const mblTypeOptions: Array<{ label: string; value: MblType }> = [
  { label: 'Copy', value: 'COPY' },
  { label: 'Original', value: 'ORIGINAL' },
  { label: 'Seaway Bill', value: 'SEAWAY_BILL' },
  { label: 'Surrendered', value: 'SURRENDERED' },
];

export const customsLaneStatusOptions: Array<{ label: string; value: CustomsLaneStatus }> = [
  { label: 'Green clearance', value: 'GREEN_CLEARANCE' },
  { label: 'Yellow - supplement docs', value: 'YELLOW_NEED_SUPPLEMENT' },
  { label: 'Red - field inspection', value: 'RED_FIELD_INSPECTION' },
  { label: 'Red - violation handling', value: 'RED_VIOLATION_HANDLING' },
  { label: 'Release ready', value: 'RELEASE_READY' },
];

export const advanceRoleOptions: Array<{ label: string; value: TaskRole }> = [
  { label: 'Port Officer', value: 'Port Officer' },
  { label: 'Customs Officer', value: 'Customs Officer' },
  { label: 'Finance Officer', value: 'Finance Officer' },
];
