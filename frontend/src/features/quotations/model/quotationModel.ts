import type { QuotationChargeLineV1, QuotationStatusV1, QuotationTypeV1, QuotationV1 } from '@shared/api/quotations';
import type { MessageKey } from '@shared/i18n';
import type { ShippingMode } from '@shared/model/logistics';

export type QuotationTab = 'all' | 'rfq' | 'draft' | 'pending' | 'confirmed' | 'rejected';

/** Map each non-"all" tab to the quotation statuses it contains. */
export const quotationStatusTabs: Record<Exclude<QuotationTab, 'all'>, QuotationStatusV1[]> = {
  rfq: ['REQUEST_FOR_QUOTATION'],
  draft: ['DRAFT'],
  pending: ['PENDING_APPROVAL'],
  confirmed: ['CONFIRMED'],
  rejected: ['REJECTED'],
};

export const quotationTabItems: { value: QuotationTab; labelKey: MessageKey }[] = [
  { value: 'all', labelKey: 'quotations.tabAll' },
  { value: 'rfq', labelKey: 'quotations.tabRfq' },
  { value: 'draft', labelKey: 'quotations.tabDraft' },
  { value: 'pending', labelKey: 'quotations.tabPending' },
  { value: 'confirmed', labelKey: 'quotations.tabConfirmed' },
  { value: 'rejected', labelKey: 'quotations.tabRejected' },
];

/** Shipping-mode options offered by the quotation form (stored on the quotation). */
export const quotationModeOptions: { value: string; label: string }[] = [
  { value: 'SEA_FCL', label: 'SEA FCL' },
  { value: 'SEA_LCL', label: 'SEA LCL' },
  { value: 'AIR', label: 'AIR' },
];

/**
 * Normalize a stored quotation mode (e.g. 'SEA_FCL', 'SEA_LCL', 'AIR' — or the bare
 * 'FCL'/'LCL'/'AIR') to the ShippingMode the charge catalog expects.
 */
export function toShippingMode(mode?: string | null): ShippingMode {
  const normalized = (mode ?? '').toUpperCase();
  if (normalized.includes('AIR')) return 'AIR';
  if (normalized.includes('LCL')) return 'LCL';
  return 'FCL';
}

/** Sum the charge-line totals of a quotation (its grand total in its own currency). */
export function quotationTotal(quotation: Pick<QuotationV1, 'charge_lines'>): number {
  return (quotation.charge_lines ?? []).reduce((sum, line: QuotationChargeLineV1) => {
    const value = Number(line.total_amount ?? line.amount ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/** Prefer charge-line totals, then fall back to list/detail API totals. */
export function quotationDisplayTotal(
  quotation: Pick<QuotationV1, 'charge_lines' | 'grand_total_amount' | 'total_amount'>,
): number {
  const lineTotal = quotationTotal(quotation);
  if (lineTotal > 0) return lineTotal;
  const apiTotal = Number(quotation.grand_total_amount ?? quotation.total_amount ?? 0);
  return Number.isFinite(apiTotal) ? apiTotal : 0;
}

/** Whether a quotation is confirmed and can therefore seed a PO. */
export function isQuotationConfirmed(quotation: Pick<QuotationV1, 'status'>): boolean {
  return quotation.status === 'CONFIRMED';
}

/** Nhan rut gon hien thi tren badge bang danh sach. */
export const quotationTypeShortLabels: Record<QuotationTypeV1, string> = {
  FREIGHT: 'FREIGHT',
  LOCAL_CHARGE: 'LOCAL',
  CUSTOMS: 'CUSTOMS',
  TRUCKING: 'TRUCK',
  MIXED: 'MIXED',
};

/** i18n key ten day du dung cho tooltip. */
export const quotationTypeFullLabelKeys: Record<QuotationTypeV1, MessageKey> = {
  FREIGHT: 'quotations.type.freight',
  LOCAL_CHARGE: 'quotations.type.localCharge',
  CUSTOMS: 'quotations.type.customs',
  TRUCKING: 'quotations.type.trucking',
  MIXED: 'quotations.type.mixed',
};
