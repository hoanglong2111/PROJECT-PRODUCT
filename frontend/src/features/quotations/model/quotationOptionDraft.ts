import type { ChargeCode } from '@shared/api/chargeCodes';
import type {
  CreateQuotationOptionPayload,
  QuotationChargeGroup,
  QuotationChargeLinePayload,
} from '@shared/api/quotations';
import { chargeCodeToChargeType } from '@shared/lib/quotationCharges';

import type { QuotationDraftGroupLine } from './quotationDraftLines';
import type { QuotationDraftGroupLines } from './quotationDraftLines';
import { computeQuotationMoneyTotals, type QuotationMoneyTotals } from './quotationMoney';

export type DraftQuotationOption = Omit<CreateQuotationOptionPayload, 'carrier_code'> & {
  id: string;
  option_no: number;
  carrier_code: string | null;
  mode: string | null;
  is_selected: boolean;
  groupLines: QuotationDraftGroupLines;
};

export type DraftBuildContext = {
  shippingMode: string | null;
  language: 'en' | 'vi';
  findChargeCode: (code: string | null | undefined) => ChargeCode | null;
  rateToVndOrNull: (code: string | null | undefined) => number | null;
};

function isPriced(line: QuotationDraftGroupLine): boolean {
  return Boolean(line.chargeCode) && Number(line.unitPrice) > 0 && Boolean(line.currency);
}

function describe(ctx: DraftBuildContext, line: QuotationDraftGroupLine): string {
  const code = ctx.findChargeCode(line.chargeCode);
  if (!code) return line.chargeCode ?? '';
  return ctx.language === 'vi' && code.charge_name_vn ? code.charge_name_vn : code.charge_name_en;
}

function toPayload(
  ctx: DraftBuildContext,
  line: QuotationDraftGroupLine,
  group: QuotationChargeGroup,
  optionNo: number | null,
  lineNo: number,
): QuotationChargeLinePayload {
  const code = ctx.findChargeCode(line.chargeCode);
  return {
    line_no: lineNo,
    charge_type: code ? chargeCodeToChargeType(code, ctx.shippingMode) : 'OTHER',
    charge_code: line.chargeCode,
    charge_group: group,
    option_no: optionNo,
    currency_code: line.currency,
    description: describe(ctx, line),
    quantity: Number(line.quantity) || 1,
    unit: line.unit ?? code?.default_uom ?? 'SET',
    unit_price: Number(line.unitPrice),
    tax_rate: 0,
    tax_amount: 0,
    note: code ? `Rev/Cost: ${code.rev_cost}` : null,
  };
}

export function buildQuotationChargeLinePayloads(
  options: DraftQuotationOption[],
  ctx: DraftBuildContext,
): QuotationChargeLinePayload[] {
  const payloads: QuotationChargeLinePayload[] = [];
  let lineNo = 1;

  for (const option of options) {
    for (const group of ['FREIGHT', 'ORIGIN', 'DESTINATION'] as const) {
      for (const line of option.groupLines[group]) {
        if (!isPriced(line)) continue;
        payloads.push(toPayload(ctx, line, group, option.option_no, lineNo));
        lineNo += 1;
      }
    }
  }

  return payloads;
}

// Customer-pays total for a single draft option, in the quotation's payment currency —
// mirrors the "Khách trả" total in QuotationChargeBreakdown so the option card estimate
// (and the submitted `headline_amount`) always matches the persisted charge detail.
export function computeOptionMoneyTotals(
  option: DraftQuotationOption,
  paymentCurrency: string | null | undefined,
  ctx: DraftBuildContext,
): QuotationMoneyTotals {
  const lines = [
    ...option.groupLines.FREIGHT,
    ...option.groupLines.ORIGIN,
    ...option.groupLines.DESTINATION,
  ].filter(isPriced);

  return computeQuotationMoneyTotals(
    lines.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice, currency: line.currency })),
    paymentCurrency,
    ctx.rateToVndOrNull,
  );
}

export function computeOptionCustomerPayAmount(
  option: DraftQuotationOption,
  paymentCurrency: string | null | undefined,
  ctx: DraftBuildContext,
): number | null {
  return computeOptionMoneyTotals(option, paymentCurrency, ctx).customerPayTotal;
}
