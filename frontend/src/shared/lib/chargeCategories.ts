import type { MessageKey } from '@shared/i18n';

export const CHARGE_GROUPS: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: 'ORIGIN_EXPORT', labelKey: 'masterData.chargeGroupOriginExport' },
  { value: 'MAIN_FREIGHT', labelKey: 'masterData.chargeGroupMainFreight' },
  { value: 'FREIGHT_SURCHARGE', labelKey: 'masterData.chargeGroupFreightSurcharge' },
  { value: 'DOCUMENTATION_FILING', labelKey: 'masterData.chargeGroupDocumentationFiling' },
  { value: 'DESTINATION_IMPORT', labelKey: 'masterData.chargeGroupDestinationImport' },
  { value: 'ANCILLARY_ACCESSORIAL', labelKey: 'masterData.chargeGroupAncillaryAccessorial' },
  { value: 'SERVICE_OTHER', labelKey: 'masterData.chargeGroupServiceOther' },
] as const;

export const CHARGE_CATEGORIES: ReadonlyArray<{ value: string; labelKey: MessageKey }> = [
  { value: 'ORIGIN', labelKey: 'masterData.chargeCategoryOrigin' },
  { value: 'CUSTOMS', labelKey: 'masterData.chargeCategoryCustoms' },
  { value: 'DOCUMENTATION', labelKey: 'masterData.chargeCategoryDocumentation' },
  { value: 'FREIGHT', labelKey: 'masterData.chargeCategoryFreight' },
  { value: 'SURCHARGE', labelKey: 'masterData.chargeCategorySurcharge' },
  { value: 'DESTINATION', labelKey: 'masterData.chargeCategoryDestination' },
  { value: 'DISBURSEMENT', labelKey: 'masterData.chargeCategoryDisbursement' },
  { value: 'ANCILLARY', labelKey: 'masterData.chargeCategoryAncillary' },
  { value: 'SERVICE', labelKey: 'masterData.chargeCategoryService' },
] as const;

/** @deprecated use CHARGE_CATEGORIES for row categories or CHARGE_GROUPS for macro sections. */
export const CHARGE_CATEGORY_GROUPS = CHARGE_CATEGORIES;
