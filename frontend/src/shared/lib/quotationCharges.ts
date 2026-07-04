import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationChargeTypeV1 } from '@shared/api/quotations';
import { defaultScopeForIncoterm } from '@shared/lib/incotermChargeScope';
import type { ShippingMode } from '@shared/model/logistics';

/**
 * Doc-grounded quotation charge helpers.
 *
 * Incoterm scope now comes from the Incoterms 2020 seed in incotermChargeScope.ts
 * (or a backend-provided override on the Incoterm record). Actual suggested rows
 * come from Charge Code master data filtered by group, transport-mode flags, and
 * is_active. Prices are never defaulted here.
 */

export type QuotationChargeModeFlag = 'sea_fcl' | 'sea_lcl' | 'air';

export function incotermChargeGroups(incotermCode?: string | null): string[] {
  return defaultScopeForIncoterm(incotermCode).groups;
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
