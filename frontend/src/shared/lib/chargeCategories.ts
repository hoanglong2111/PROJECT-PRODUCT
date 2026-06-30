import type { MessageKey } from '@shared/i18n';

export const CHARGE_CATEGORY_GROUPS: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: 'ORIGIN_EXPORT', labelKey: 'masterData.chargeCategoryOriginExport' },
  { value: 'MAIN_FREIGHT', labelKey: 'masterData.chargeCategoryMainFreight' },
  { value: 'FREIGHT_SURCHARGE', labelKey: 'masterData.chargeCategoryFreightSurcharge' },
  { value: 'DOCUMENTATION', labelKey: 'masterData.chargeCategoryDocumentation' },
  { value: 'DESTINATION_IMPORT', labelKey: 'masterData.chargeCategoryDestinationImport' },
  { value: 'ANCILLARY', labelKey: 'masterData.chargeCategoryAncillary' },
  { value: 'SERVICE_OTHER', labelKey: 'masterData.chargeCategoryServiceOther' },
] as const;
