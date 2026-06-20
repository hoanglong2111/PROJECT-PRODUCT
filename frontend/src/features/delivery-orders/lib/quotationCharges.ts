import type { QuotationChargeTypeV1 } from '@shared/api/quotations';
import type { MessageKey } from '@shared/i18n';
import type { ShippingMode } from '@shared/model/logistics';

/**
 * Incoterms-aware quotation charge catalog.
 *
 * The set of fees a KBI customer owes depends on the Incoterms group of the
 * originating PO and the shipping mode of the quote. See
 * `kbi-mock-api/docs/quotation/quotation_Incoterms.md` for the source rules.
 */

export type QuotationIncotermGroup = 'EXW_FCA' | 'FOB' | 'CFR' | 'PREPAID' | 'UNKNOWN';

export type QuotationChargeSectionId = 'origin' | 'intlFreight' | 'vnLocal' | 'customsTransport';

export type QuotationChargeField = {
  /** Stable field code, unique within a (group, mode) field set. */
  code: string;
  charge_type: QuotationChargeTypeV1;
  labelKey: MessageKey;
  /** Pricing basis shown to the user and persisted on the charge line. */
  unit: string;
};

export type QuotationChargeSection = {
  id: QuotationChargeSectionId;
  titleKey: MessageKey;
  fields: QuotationChargeField[];
};

const GROUP_LABEL_KEYS: Record<QuotationIncotermGroup, MessageKey> = {
  CFR: 'quotations.groupCfr',
  EXW_FCA: 'quotations.groupExwFca',
  FOB: 'quotations.groupFob',
  PREPAID: 'quotations.groupPrepaid',
  UNKNOWN: 'quotations.groupExwFca',
};

/** Map a raw incoterm code (EXW, FOB, CIF, DDP, ...) to its charge group. */
export function incotermToGroup(code?: string | null): QuotationIncotermGroup {
  const normalized = (code ?? '').trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (['EXW', 'FCA'].includes(normalized)) return 'EXW_FCA';
  if (['FOB', 'FAS'].includes(normalized)) return 'FOB';
  if (['CFR', 'CIF', 'CPT', 'CIP', 'C&F', 'CNF'].includes(normalized)) return 'CFR';
  if (['DDP', 'DAP', 'DPU', 'DDU', 'DAT'].includes(normalized)) return 'PREPAID';
  // Unknown/non-standard term: fall back to the full set so nothing is hidden.
  return 'UNKNOWN';
}

export function groupLabelKey(group: QuotationIncotermGroup): MessageKey {
  return GROUP_LABEL_KEYS[group];
}

/** Pricing basis per shipping mode: FCL → CONT, LCL → RT, AIR → KGS. */
export function unitForMode(mode: ShippingMode): string {
  if (mode === 'AIR') return 'KGS';
  if (mode === 'LCL') return 'RT';
  return 'CONT';
}

function originFields(mode: ShippingMode): QuotationChargeField[] {
  return [
    { charge_type: 'ORIGIN_CHARGE', code: 'ORIGIN_PER_BL', labelKey: 'quotations.feeOriginBl', unit: 'BL' },
    { charge_type: 'ORIGIN_CHARGE', code: 'ORIGIN_MAIN', labelKey: 'quotations.feeOriginMain', unit: unitForMode(mode) },
  ];
}

function intlFreightFields(mode: ShippingMode): QuotationChargeField[] {
  return [
    {
      charge_type: mode === 'AIR' ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT',
      code: 'CARRIER_FREIGHT',
      labelKey: 'quotations.feeCarrierFreight',
      unit: unitForMode(mode),
    },
  ];
}

function vnLocalFields(mode: ShippingMode): QuotationChargeField[] {
  const modeUnit = unitForMode(mode);
  if (mode === 'AIR') {
    return [{ charge_type: 'HANDLING', code: 'HANDLING', labelKey: 'quotations.feeHandling', unit: 'BL' }];
  }
  const shared: QuotationChargeField[] = [
    { charge_type: 'DO_FEE', code: 'DO_FEE', labelKey: 'quotations.feeDo', unit: 'BL' },
    { charge_type: 'HANDLING', code: 'HANDLING', labelKey: 'quotations.feeHandling', unit: 'BL' },
    { charge_type: 'THC', code: 'THC', labelKey: 'quotations.feeThc', unit: modeUnit },
  ];
  if (mode === 'LCL') {
    shared.push({ charge_type: 'CFS', code: 'CFS', labelKey: 'quotations.feeCfs', unit: 'RT' });
  }
  shared.push({ charge_type: 'CIC', code: 'CIC', labelKey: 'quotations.feeCic', unit: modeUnit });
  if (mode === 'FCL') {
    shared.push(
      { charge_type: 'EMC_EMF', code: 'EMC_EMF', labelKey: 'quotations.feeEmcEmf', unit: 'CONT' },
      { charge_type: 'CLEANING', code: 'CLEANING', labelKey: 'quotations.feeCleaning', unit: 'CONT' },
    );
  }
  return shared;
}

function customsTransportFields(mode: ShippingMode): QuotationChargeField[] {
  const fields: QuotationChargeField[] = [
    { charge_type: 'CUSTOMS_FEE', code: 'CUSTOMS', labelKey: 'quotations.feeCustoms', unit: 'DECLARATION' },
    { charge_type: 'TRUCKING', code: 'TRUCKING', labelKey: 'quotations.feeTrucking', unit: 'TRIP' },
  ];
  if (mode === 'FCL') {
    fields.push({ charge_type: 'LOWERING_FEE', code: 'LOWERING', labelKey: 'quotations.feeLowering', unit: 'CONT' });
  }
  if (mode === 'AIR') {
    fields.push({ charge_type: 'LOADING_FEE', code: 'UNLOADING', labelKey: 'quotations.feeUnloading', unit: 'SHIPMENT' });
  }
  return fields;
}

/**
 * Return the ordered charge sections for a given Incoterms group and shipping
 * mode. UNKNOWN behaves like EXW_FCA (full set) so no field is hidden when the
 * DO has no Incoterms.
 */
export function getChargeFields(group: QuotationIncotermGroup, mode: ShippingMode): QuotationChargeSection[] {
  const showOrigin = group === 'EXW_FCA' || group === 'UNKNOWN';
  const showFreight = group === 'EXW_FCA' || group === 'FOB' || group === 'UNKNOWN';
  const showVnLocal = group !== 'PREPAID';

  const sections: QuotationChargeSection[] = [];
  if (showOrigin) {
    sections.push({ fields: originFields(mode), id: 'origin', titleKey: 'quotations.originCharges' });
  }
  if (showFreight) {
    sections.push({ fields: intlFreightFields(mode), id: 'intlFreight', titleKey: 'quotations.intlFreight' });
  }
  if (showVnLocal) {
    sections.push({ fields: vnLocalFields(mode), id: 'vnLocal', titleKey: 'quotations.vnLocalCharges' });
  }
  sections.push({ fields: customsTransportFields(mode), id: 'customsTransport', titleKey: 'quotations.customsTransport' });
  return sections;
}
