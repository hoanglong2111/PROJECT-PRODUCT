import type { QuotationChargeGroup } from '@shared/api/quotations';
import type { MessageKey } from '@shared/i18n';

export const QUOTATION_CHARGE_GROUPS: ReadonlyArray<{ value: QuotationChargeGroup; labelKey: MessageKey }> = [
  { value: 'FREIGHT', labelKey: 'quotations.group.freight' },
  { value: 'ORIGIN', labelKey: 'quotations.group.origin' },
  { value: 'DESTINATION', labelKey: 'quotations.group.destination' },
] as const;
