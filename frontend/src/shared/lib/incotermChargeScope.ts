import { CHARGE_GROUPS } from './chargeCategories';

export type IncotermScope = {
  groups: string[];
  insuranceRequired: boolean;
};

/** First 5 groups (ORIGIN_EXPORT..DESTINATION_IMPORT) = buyer-side primary cost chain. */
const PRIMARY_GROUPS = CHARGE_GROUPS.slice(0, 5).map((group) => group.value);

/**
 * Incoterms 2020 buyer-side cost allocation mapped onto the project's charge-code
 * groups. Only the 6 Incoterms present in kbi-mock-api master data are covered.
 * The parenthetical (A#/B#) refers to the Incoterms 2020 cost-transfer articles.
 */
const INCOTERM_2020_SCOPE: Record<string, IncotermScope> = {
  // EXW (B9): buyer bears cost from seller's premises through the whole chain.
  EXW: {
    groups: ['ORIGIN_EXPORT', 'MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
    insuranceRequired: false,
  },
  // FCA (A4/B4): seller clears export and hands to carrier; buyer bears main carriage onward.
  FCA: {
    groups: ['MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
    insuranceRequired: false,
  },
  // FOB (A4/B4, sea): seller loads on vessel; buyer bears freight onward.
  FOB: {
    groups: ['MAIN_FREIGHT', 'FREIGHT_SURCHARGE', 'DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
    insuranceRequired: false,
  },
  // CFR (A6): seller pays main freight to destination port; buyer bears the import side.
  CFR: {
    groups: ['DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
    insuranceRequired: false,
  },
  // CIF (A6/A5): seller pays freight plus minimum insurance; buyer bears import side.
  CIF: {
    groups: ['DOCUMENTATION_FILING', 'DESTINATION_IMPORT'],
    insuranceRequired: true,
  },
  // DDP (A9): seller bears everything including import clearance and duties.
  DDP: {
    groups: [],
    insuranceRequired: false,
  },
};

export function defaultScopeForIncoterm(code?: string | null): IncotermScope {
  const normalized = (code ?? '').trim().toUpperCase();
  const entry = Object.prototype.hasOwnProperty.call(INCOTERM_2020_SCOPE, normalized)
    ? INCOTERM_2020_SCOPE[normalized]
    : { groups: PRIMARY_GROUPS, insuranceRequired: false };

  return { groups: [...entry.groups], insuranceRequired: entry.insuranceRequired };
}
