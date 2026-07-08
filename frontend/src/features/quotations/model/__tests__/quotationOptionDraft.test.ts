import { describe, expect, it } from 'vitest';

import type { DraftQuotationOption } from '../quotationOptionDraft';
import { buildQuotationChargeLinePayloads, computeOptionMoneyTotals } from '../quotationOptionDraft';
import type { QuotationDraftGroupLine } from '../quotationDraftLines';
import { emptyDraftGroups } from '../quotationDraftLines';

const line = (patch: Partial<QuotationDraftGroupLine>): QuotationDraftGroupLine => ({
  uid: 'u',
  chargeCode: 'OFR',
  quantity: '1',
  unit: 'SET',
  unitPrice: '100',
  currency: 'USD',
  endpointCurrency: 'VND',
  ...patch,
});

const ctx = {
  shippingMode: 'SEA_FCL',
  language: 'en' as const,
  findChargeCode: (code: string | null | undefined) =>
    code
      ? ({
        charge_code: code,
        charge_name_en: code,
        charge_name_vn: '',
        group: 'MAIN_FREIGHT',
        category: null,
        taxable: false,
        rev_cost: 'COST',
        default_uom: 'SET',
      } as never)
      : null,
  rateToVndOrNull: (code: string | null | undefined) => (code === 'USD' ? 25000 : code === 'VND' ? 1 : null),
};

const option = (patch: Partial<DraftQuotationOption>): DraftQuotationOption => ({
  id: 'o1',
  option_no: 1,
  carrier_code: 'COSCO',
  carrier_name: 'COSCO',
  mode: 'SEA_FCL',
  vessel_or_flight: null,
  voyage_flight_no: null,
  etd: null,
  eta: null,
  transit_time_days: null,
  risk_warning: null,
  headline_amount: null,
  is_recommended: true,
  is_selected: false,
  groupLines: emptyDraftGroups(),
  ...patch,
});

describe('buildQuotationChargeLinePayloads', () => {
  it('tags every group with its option_no', () => {
    const options = [
      option({
        option_no: 1,
        groupLines: {
          ...emptyDraftGroups(),
          FREIGHT: [line({ unitPrice: '1000' })],
          ORIGIN: [line({ chargeCode: 'THC', currency: 'VND', unitPrice: '500000' })],
        },
      }),
      option({
        id: 'o2',
        option_no: 2,
        groupLines: {
          ...emptyDraftGroups(),
          FREIGHT: [line({ unitPrice: '1200' })],
          DESTINATION: [line({ chargeCode: 'DOC', currency: 'VND', unitPrice: '100000' })],
        },
      }),
    ];
    const payloads = buildQuotationChargeLinePayloads(options, ctx);
    expect(payloads.filter((payload) => payload.option_no === null)).toHaveLength(0);
    expect(payloads.filter((payload) => payload.option_no === 1)).toHaveLength(2);
    expect(payloads.filter((payload) => payload.option_no === 2)).toHaveLength(2);
    expect(payloads.find((payload) => payload.option_no === 1)?.charge_group).toBe('FREIGHT');
    expect(payloads.map((payload) => payload.charge_group)).toContain('ORIGIN');
    expect(payloads.map((payload) => payload.charge_group)).toContain('DESTINATION');
    expect(payloads.every((payload) => payload.tax_rate === 0 && payload.tax_amount === 0)).toBe(true);
  });

  it('skips lines without a charge code, price, or currency', () => {
    const options = [
      option({
        groupLines: {
          ...emptyDraftGroups(),
          ORIGIN: [line({ chargeCode: null })],
          DESTINATION: [line({ unitPrice: '0' })],
        },
      }),
    ];
    expect(buildQuotationChargeLinePayloads(options, ctx)).toHaveLength(0);
  });
});

describe('computeOptionMoneyTotals', () => {
  it('sums all three groups inside the option as an internal VND total', () => {
    const opt = option({
      groupLines: {
        ...emptyDraftGroups(),
        FREIGHT: [line({ currency: 'USD', unitPrice: '1000' })],
        ORIGIN: [line({ currency: 'VND', unitPrice: '500000' })],
      },
    });
    expect(computeOptionMoneyTotals(opt, 'VND', ctx).totalVnd).toBe(500000 + 25000000);
  });

  it('converts the total into the given customer payment currency', () => {
    const opt = option({
      groupLines: {
        ...emptyDraftGroups(),
        FREIGHT: [line({ currency: 'USD', unitPrice: '1000' })],
      },
    });
    const totals = computeOptionMoneyTotals(opt, 'USD', ctx);
    expect(totals.totalVnd).toBe(25_000_000);
    expect(totals.customerPayTotal).toBe(1000);
  });
});
