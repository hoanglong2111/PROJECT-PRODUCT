import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationChargeTypeV1 } from '@shared/api/quotations';
import type { ShippingMode } from '@shared/model/logistics';

export type QuotationChargeModeFlag = 'sea_fcl' | 'sea_lcl' | 'air';

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
