import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationChargeTypeV1 } from '@shared/api/quotations';
import { CHARGE_GROUPS } from '@shared/lib/chargeCategories';
import type { ShippingMode } from '@shared/model/logistics';

/**
 * Doc-grounded quotation charge helpers.
 *
 * Incoterm only decides which charge-code master groups are in buyer scope.
 * Actual suggested rows come from Charge Code master data filtered by group,
 * transport-mode flags, and is_active. Prices are never defaulted here.
 */

export type QuotationChargeModeFlag = 'sea_fcl' | 'sea_lcl' | 'air';

const PRIMARY_CHARGE_GROUPS = CHARGE_GROUPS.slice(0, 5).map((group) => group.value);

const INCOTERM_GROUP_SCOPE: Record<string, string[]> = {
  EXW: ['ORIGIN_EXPORT', 'MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
  FCA: ['MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
  FOB: ['MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
  CFR: ['DESTINATION_IMPORT'],
  CIF: ['DESTINATION_IMPORT'],
  DDP: [],
};

export function incotermChargeGroups(incotermCode?: string | null): string[] {
  const normalized = (incotermCode ?? '').trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(INCOTERM_GROUP_SCOPE, normalized)) {
    return INCOTERM_GROUP_SCOPE[normalized];
  }
  return PRIMARY_CHARGE_GROUPS;
}

export function modeToChargeFlag(mode?: ShippingMode | string | null): QuotationChargeModeFlag {
  const normalized = (mode ?? '').trim().toUpperCase();
  if (normalized.includes('AIR')) return 'air';
  if (normalized.includes('LCL')) return 'sea_lcl';
  return 'sea_fcl';
}

export function chargeCodeToChargeType(code: ChargeCode, mode?: ShippingMode | string | null): QuotationChargeTypeV1 {
  if (code.group === 'MAIN_FREIGHT') {
    return modeToChargeFlag(mode) === 'air' ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT';
  }
  if (code.group === 'ORIGIN_EXPORT') {
    return 'ORIGIN_CHARGE';
  }
  if (code.group === 'DOCUMENTATION_FILING') {
    return 'DOCUMENT_FEE';
  }
  if (code.group === 'DESTINATION_IMPORT') {
    return code.category === 'CUSTOMS' ? 'CUSTOMS_FEE' : 'LOCAL_CHARGE';
  }
  if (code.group === 'ANCILLARY_ACCESSORIAL') {
    if (code.charge_code === 'DEM') return 'DEMURRAGE';
    if (code.charge_code === 'DET') return 'DETENTION';
    if (code.charge_code === 'STO') return 'WAREHOUSE';
  }
  return 'OTHER';
}
