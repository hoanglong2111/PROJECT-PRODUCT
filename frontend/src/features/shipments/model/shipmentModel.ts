import type { ShipmentCost, ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentModeV1 } from '@shared/api/shipments';
import type { DeliveryOrderV1 } from '@shared/api/deliveryOrders';
import type { CustomsDeclarationChannelV1, CustomsDeclarationLineV1, CustomsDeclarationStatusV1 } from '@shared/api/customsDeclarations';
import type { MessageKey } from '@shared/i18n';

export type ShipmentTab = 'all' | 'in_transit' | 'customs' | 'delivered';
export type ShipmentWorkbench = 'list' | 'create' | 'detail';
export type ShipmentChannelFilter = 'all' | 'GREEN' | 'YELLOW' | 'RED';

export const inTransitStatuses = new Set<ShipmentRecord['status']>([
  'BOOKED',
  'BOOKING_PENDING',
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICKED_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'IN_TRANSIT',
  'ARRIVED',
  'ARRIVED_PORT',
]);

export const customsStatuses = new Set<ShipmentRecord['status']>([
  'CUSTOMS_DRAFT',
  'CUSTOMS_CLEARED',
  'CUSTOMS_PROCESSING',
]);

/** Total landed cost normalized to the base currency (VND) via each line's exchange_rate. */
export function landedCostTotal(costs: ShipmentCost[]): number {
  return costs.reduce((sum, cost) => sum + cost.amount * cost.exchange_rate, 0);
}

export const shipmentModeOptions: Array<{ labelKey: MessageKey; value: ShipmentModeV1 }> = [
  { labelKey: 'shipments.modeSea', value: 'SEA' },
  { labelKey: 'shipments.modeAir', value: 'AIR' },
  { labelKey: 'shipments.modeRoad', value: 'ROAD' },
  { labelKey: 'shipments.modeRail', value: 'RAIL' },
  { labelKey: 'shipments.modeMultimodal', value: 'MULTIMODAL' },
  { labelKey: 'shipments.modeTrucking', value: 'TRUCKING' },
  { labelKey: 'shipments.modeOther', value: 'OTHER' },
];

export function inferShipmentModeFromDeliveryOrder(deliveryOrder: DeliveryOrderV1): ShipmentModeV1 {
  const modeType = deliveryOrder.transport_mode?.mode_type?.toUpperCase();
  if (modeType === 'AIR') return 'AIR';
  if (modeType === 'ROAD' || modeType === 'TRUCKING') return 'ROAD';
  if (modeType === 'RAIL') return 'RAIL';
  if (modeType === 'MULTIMODAL') return 'MULTIMODAL';
  return 'SEA';
}

export function channelColor(channel: CustomsDeclarationChannelV1) {
  if (channel === 'GREEN') return 'teal';
  if (channel === 'YELLOW') return 'yellow';
  return 'red';
}

export function channelLabelKey(channel: CustomsDeclarationChannelV1): MessageKey {
  if (channel === 'GREEN') return 'shipments.channelGreen';
  if (channel === 'YELLOW') return 'shipments.channelYellow';
  return 'shipments.channelRed';
}

export function channelHintKey(channel: CustomsDeclarationChannelV1): MessageKey {
  if (channel === 'GREEN') return 'shipments.channelGreenHint';
  if (channel === 'YELLOW') return 'shipments.channelYellowHint';
  return 'shipments.channelRedHint';
}

const STAGE_MAP: Record<CustomsDeclarationStatusV1, number> = {
  DRAFT: 0,
  DRAFT_OPENED: 1,
  OFFICIAL_OPENED: 2,
  SUBMITTED: 2,
  INSPECTION: 2,
  CLEARED: 3,
  CANCELLED: -1,
};

export function customsStageIndex(status: CustomsDeclarationStatusV1): { index: number; cancelled: boolean } {
  if (status === 'CANCELLED') return { index: 3, cancelled: true };
  return { index: STAGE_MAP[status] ?? 0, cancelled: false };
}

export type CustomsNextActionType = 'open-draft' | 'open-official' | 'clear';

export type CustomsNextAction = {
  action: CustomsNextActionType;
  labelKey: MessageKey;
  requires: ('officialNo' | 'officialChannel' | 'clearNote')[];
};

export function customsNextAction(status: CustomsDeclarationStatusV1): CustomsNextAction | null {
  if (status === 'DRAFT') return { action: 'open-draft', labelKey: 'shipments.openDraft', requires: [] };
  if (status === 'DRAFT_OPENED') return { action: 'open-official', labelKey: 'shipments.openOfficial', requires: ['officialNo', 'officialChannel'] };
  if (status === 'OFFICIAL_OPENED' || status === 'SUBMITTED' || status === 'INSPECTION') return { action: 'clear', labelKey: 'shipments.clearCustoms', requires: ['clearNote'] };
  return null;
}

export type CustomsLinesSummary = {
  totalValue: number;
  totalDuty: number;
  totalVat: number;
  taxTotal: number;
};

export type CustomsLineTax = { value: number; duty: number; vat: number; taxTotal: number };

/** Duty and VAT for a single line. VAT is applied on (customs value + duty), matching VN import math. */
export function customsLineTax(input: {
  customs_value?: number | string | null;
  import_duty_rate?: number | string | null;
  vat_rate?: number | string | null;
}): CustomsLineTax {
  const value = Number(input.customs_value ?? 0);
  const duty = value * (Number(input.import_duty_rate ?? 0) / 100);
  const vat = (value + duty) * (Number(input.vat_rate ?? 0) / 100);
  return { value, duty, vat, taxTotal: duty + vat };
}

export function summarizeCustomsLines(lines: CustomsDeclarationLineV1[]): CustomsLinesSummary {
  let totalValue = 0;
  let totalDuty = 0;
  let totalVat = 0;
  for (const line of lines) {
    const { value, duty, vat } = customsLineTax(line);
    totalValue += value;
    totalDuty += duty;
    totalVat += vat;
  }
  return { totalValue, totalDuty, totalVat, taxTotal: totalDuty + totalVat };
}
