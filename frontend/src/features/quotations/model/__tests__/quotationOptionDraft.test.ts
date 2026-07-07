import { describe, expect, it } from 'vitest';

import type { QuotationChargeLineV1 } from '@shared/api/quotations';

import type { DraftQuotationOption } from '../quotationOptionDraft';
import {
  buildQuotationChargeLinePayloads,
  computeOptionHeadlineVnd,
  selectOptionChargeLines,
} from '../quotationOptionDraft';
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

describe('computeOptionHeadlineVnd', () => {
  it('sums all three groups inside the option', () => {
    const opt = option({
      groupLines: {
        ...emptyDraftGroups(),
        FREIGHT: [line({ currency: 'USD', unitPrice: '1000' })],
        ORIGIN: [line({ currency: 'VND', unitPrice: '500000' })],
      },
    });
    expect(computeOptionHeadlineVnd(opt, ctx)).toBe(500000 + 25000000);
  });
});

describe('selectOptionChargeLines', () => {
  const lines: QuotationChargeLineV1[] = [
    { option_no: null, charge_group: 'ORIGIN' } as QuotationChargeLineV1,
    { option_no: 1, charge_group: 'FREIGHT' } as QuotationChargeLineV1,
    { option_no: 2, charge_group: 'FREIGHT' } as QuotationChargeLineV1,
  ];

  it('returns shared lines plus the selected option freight', () => {
    expect(selectOptionChargeLines(lines, 1)).toHaveLength(2);
    expect(selectOptionChargeLines(lines, 2).map((row) => row.option_no)).toEqual([null, 2]);
  });

  it('returns only shared lines when optionNo is null', () => {
    expect(selectOptionChargeLines(lines, null)).toHaveLength(1);
  });
});
