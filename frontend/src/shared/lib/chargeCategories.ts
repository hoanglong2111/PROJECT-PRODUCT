import type { MessageKey } from '@shared/i18n';

export const CHARGE_GROUPS: ReadonlyArray<{ value: string; labelKey: MessageKey; docLabel: string }> = [
  { value: 'ORIGIN_EXPORT', labelKey: 'masterData.chargeGroupOriginExport', docLabel: 'Origin / Export' },
  { value: 'MAIN_FREIGHT', labelKey: 'masterData.chargeGroupMainFreight', docLabel: 'Main Freight (Carriage)' },
  { value: 'FREIGHT_SURCHARGE', labelKey: 'masterData.chargeGroupFreightSurcharge', docLabel: 'Freight Surcharges' },
  { value: 'DOCUMENTATION_FILING', labelKey: 'masterData.chargeGroupDocumentationFiling', docLabel: 'Documentation & Filing' },
  { value: 'DESTINATION_IMPORT', labelKey: 'masterData.chargeGroupDestinationImport', docLabel: 'Destination / Import' },
  { value: 'ANCILLARY_ACCESSORIAL', labelKey: 'masterData.chargeGroupAncillaryAccessorial', docLabel: 'Ancillary / Accessorial' },
  { value: 'SERVICE_OTHER', labelKey: 'masterData.chargeGroupServiceOther', docLabel: 'Service / Other' },
] as const;

export const CHARGE_CATEGORIES: ReadonlyArray<{ value: string; labelKey: MessageKey; docLabel: string }> = [
  { value: 'ORIGIN', labelKey: 'masterData.chargeCategoryOrigin', docLabel: 'Origin' },
  { value: 'CUSTOMS', labelKey: 'masterData.chargeCategoryCustoms', docLabel: 'Customs' },
  { value: 'DOCUMENTATION', labelKey: 'masterData.chargeCategoryDocumentation', docLabel: 'Documentation' },
  { value: 'FREIGHT', labelKey: 'masterData.chargeCategoryFreight', docLabel: 'Freight' },
  { value: 'SURCHARGE', labelKey: 'masterData.chargeCategorySurcharge', docLabel: 'Surcharge' },
  { value: 'DESTINATION', labelKey: 'masterData.chargeCategoryDestination', docLabel: 'Destination' },
  { value: 'DISBURSEMENT', labelKey: 'masterData.chargeCategoryDisbursement', docLabel: 'Disbursement' },
  { value: 'ANCILLARY', labelKey: 'masterData.chargeCategoryAncillary', docLabel: 'Ancillary' },
  { value: 'SERVICE', labelKey: 'masterData.chargeCategoryService', docLabel: 'Service' },
] as const;

/** @deprecated use CHARGE_CATEGORIES for row categories or CHARGE_GROUPS for macro sections. */
export const CHARGE_CATEGORY_GROUPS = CHARGE_CATEGORIES;
