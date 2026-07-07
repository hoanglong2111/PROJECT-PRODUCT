import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationChargeGroup, QuotationV1 } from '@shared/api/quotations';

export type QuotationDraftChargeLineState = {
  chargeCode: string | null;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string;
  currency: string | null;
  endpointCurrency: string | null;
};

export type QuotationDraftGroupLine = QuotationDraftChargeLineState & { uid: string };
export type QuotationDraftGroupLines = Record<QuotationChargeGroup, QuotationDraftGroupLine[]>;

let uidCounter = 0;

export function createDraftLineUid() {
  uidCounter += 1;
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${uidCounter}`;
  return `fee-${randomId}`;
}

export function seedDraftLineState(
  chargeCode: ChargeCode | null | undefined,
  initialCurrency: string | null = null,
): QuotationDraftChargeLineState {
  return {
    chargeCode: chargeCode?.charge_code ?? null,
    quantity: 1,
    unit: chargeCode?.default_uom ?? null,
    unitPrice: '',
    currency: initialCurrency,
    endpointCurrency: 'VND',
  };
}

export function emptyDraftGroups(): QuotationDraftGroupLines {
  return { FREIGHT: [], ORIGIN: [], DESTINATION: [] };
}

export function seedDraftGroupsFromQuotation(quotation: QuotationV1 | undefined): QuotationDraftGroupLines {
  const groups = emptyDraftGroups();

  for (const line of quotation?.charge_lines ?? []) {
    const group = line.charge_group ?? 'FREIGHT';
    groups[group].push({
      uid: createDraftLineUid(),
      chargeCode: line.charge_code ?? null,
      quantity: String(line.quantity ?? 1),
      unit: line.unit ?? null,
      unitPrice: line.unit_price == null ? '' : String(line.unit_price),
      currency: line.currency_code ?? null,
      endpointCurrency: 'VND',
    });
  }

  return groups;
}

function toDraftGroupLine(line: NonNullable<QuotationV1['charge_lines']>[number]): QuotationDraftGroupLine {
  return {
    uid: createDraftLineUid(),
    chargeCode: line.charge_code ?? null,
    quantity: String(line.quantity ?? 1),
    unit: line.unit ?? null,
    unitPrice: line.unit_price == null ? '' : String(line.unit_price),
    currency: line.currency_code ?? null,
    endpointCurrency: 'VND',
  };
}

export function seedDraftGroupsForOption(
  quotation: QuotationV1 | undefined,
  optionNo: number,
): QuotationDraftGroupLines {
  const groups = emptyDraftGroups();

  for (const line of quotation?.charge_lines ?? []) {
    const lineOptionNo = line.option_no ?? null;
    if (lineOptionNo !== optionNo && lineOptionNo !== null) continue;
    const group = line.charge_group ?? 'FREIGHT';
    groups[group].push(toDraftGroupLine(line));
  }

  return groups;
}

export function addDraftChargeLine(
  groups: QuotationDraftGroupLines,
  group: QuotationChargeGroup,
): QuotationDraftGroupLines {
  return {
    ...groups,
    [group]: [...groups[group], { uid: createDraftLineUid(), ...seedDraftLineState(null) }],
  };
}

export function updateDraftChargeLineAt(
  groups: QuotationDraftGroupLines,
  group: QuotationChargeGroup,
  rowIndex: number,
  patch: Partial<QuotationDraftChargeLineState>,
  defaultUnitForChargeCode?: (chargeCode: string | null | undefined) => string | null | undefined,
): QuotationDraftGroupLines {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= groups[group].length) return groups;

  return {
    ...groups,
    [group]: groups[group].map((line, index) => {
      if (index !== rowIndex) return line;
      const updated = { ...line, ...patch };
      if (patch.chargeCode !== undefined && patch.chargeCode !== line.chargeCode) {
        updated.unit = defaultUnitForChargeCode?.(patch.chargeCode) ?? updated.unit;
      }
      return updated;
    }),
  };
}

export function removeDraftChargeLineAt(
  groups: QuotationDraftGroupLines,
  group: QuotationChargeGroup,
  rowIndex: number,
): QuotationDraftGroupLines {
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= groups[group].length) return groups;

  return {
    ...groups,
    [group]: groups[group].filter((_, index) => index !== rowIndex),
  };
}
