import type { ChargeCode } from '@shared/api/chargeCodes';
import type {
  CreateQuotationOptionPayload,
  QuotationChargeGroup,
  QuotationChargeLinePayload,
  QuotationChargeLineV1,
} from '@shared/api/quotations';
import {
  chargeCodeToChargeType,
  computeQuotationLineVnd,
  summarizeQuotationVndLines,
} from '@shared/lib/quotationCharges';

import type { QuotationDraftGroupLine } from './quotationDraftLines';
import type { QuotationDraftGroupLines } from './quotationDraftLines';

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

function vndTotal(lines: QuotationDraftGroupLine[], ctx: DraftBuildContext): number {
  const breakdowns = lines.filter(isPriced).map((line) =>
    computeQuotationLineVnd(
      {
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        currency: line.currency,
        endpointCurrency: line.endpointCurrency,
      },
      ctx.rateToVndOrNull,
    ),
  );

  return summarizeQuotationVndLines(breakdowns).totalVnd;
}

export function computeOptionHeadlineVnd(
  option: DraftQuotationOption,
  ctx: DraftBuildContext,
): number {
  return vndTotal(
    [
      ...option.groupLines.FREIGHT,
      ...option.groupLines.ORIGIN,
      ...option.groupLines.DESTINATION,
    ],
    ctx,
  );
}

export function selectOptionChargeLines(
  lines: QuotationChargeLineV1[],
  optionNo: number | null,
): QuotationChargeLineV1[] {
  return lines.filter((line) => line.option_no == null || line.option_no === optionNo);
}
