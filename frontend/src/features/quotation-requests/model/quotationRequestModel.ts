import type { QuotationRequestLineV1, QuotationRequestStatusV1 } from '@shared/api/quotationRequests';
import type { MessageKey } from '@shared/i18n';

export type QuotationRequestTab = 'all' | 'submitted' | 'received' | 'quoted' | 'confirmed' | 'cancelled';

export const quotationRequestStatusTabs: Record<Exclude<QuotationRequestTab, 'all'>, QuotationRequestStatusV1[]> = {
  submitted: ['SUBMITTED'],
  received: ['RECEIVED'],
  quoted: ['QUOTED'],
  confirmed: ['CONFIRMED'],
  cancelled: ['CANCELLED'],
};

export const quotationRequestTabItems: { value: QuotationRequestTab; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'quotationRequests.tabAll' },
  { value: 'submitted', labelKey: 'quotationRequests.tabSubmitted' },
  { value: 'received', labelKey: 'quotationRequests.tabReceived' },
  { value: 'quoted', labelKey: 'quotationRequests.tabQuoted' },
  { value: 'confirmed', labelKey: 'quotationRequests.tabConfirmed' },
  { value: 'cancelled', labelKey: 'quotationRequests.tabCancelled' },
];

export function rfqStatusColor(status: QuotationRequestStatusV1): string {
  switch (status) {
    case 'SUBMITTED':
      return 'blue';
    case 'RECEIVED':
      return 'cyan';
    case 'QUOTED':
      return 'orange';
    case 'CONFIRMED':
      return 'green';
    case 'CANCELLED':
      return 'gray';
    default:
      return 'gray';
  }
}

export const rfqModeOptions = [
  { value: 'SEA_FCL', label: 'SEA FCL' },
  { value: 'SEA_LCL', label: 'SEA LCL' },
  { value: 'AIR', label: 'AIR' },
];

type RfqDimensionLine = {
  height_cm?: number | string | null;
  length_cm?: number | string | null;
  qty?: number | string | null;
  width_cm?: number | string | null;
};

export function rfqTotalWeight(lines: { gross_weight_kg?: QuotationRequestLineV1['gross_weight_kg'] }[] = []): number {
  return lines.reduce((total, line) => {
    const next = Number(line.gross_weight_kg ?? 0);
    return Number.isFinite(next) ? total + next : total;
  }, 0);
}

export function isAirMode(mode?: string | null): boolean {
  return (mode ?? '').toUpperCase() === 'AIR';
}

export function rfqDimWeightKg(volumeCbm: number | string | null | undefined): number {
  const cbm = Number(volumeCbm ?? 0);
  if (!Number.isFinite(cbm) || cbm <= 0) return 0;
  return (cbm * 1_000_000) / 6000;
}

export function rfqChargeableWeightKg(
  grossKg: number | string | null | undefined,
  dimKg: number | string | null | undefined,
): number {
  const gross = Number(grossKg ?? 0);
  const dim = Number(dimKg ?? 0);
  return Math.max(Number.isFinite(gross) ? gross : 0, Number.isFinite(dim) ? dim : 0);
}

export function rfqLineCbm(line: RfqDimensionLine): number {
  const qty = Number(line.qty ?? 0);
  const length = Number(line.length_cm ?? 0);
  const width = Number(line.width_cm ?? 0);
  const height = Number(line.height_cm ?? 0);
  if ([qty, length, width, height].some((value) => !Number.isFinite(value) || value <= 0)) return 0;
  return (qty * length * width * height) / 1_000_000;
}

export function rfqTotalCbm(lines: RfqDimensionLine[] = []): number {
  return lines.reduce((total, line) => total + rfqLineCbm(line), 0);
}
