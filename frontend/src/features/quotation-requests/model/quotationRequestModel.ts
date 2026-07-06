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

export function rfqTotalWeight(lines: { gross_weight_kg?: QuotationRequestLineV1['gross_weight_kg'] }[] = []): number {
  return lines.reduce((total, line) => {
    const next = Number(line.gross_weight_kg ?? 0);
    return Number.isFinite(next) ? total + next : total;
  }, 0);
}
