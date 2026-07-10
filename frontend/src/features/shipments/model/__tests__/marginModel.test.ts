import { describe, expect, it } from 'vitest';

import type { QuotationChargeLineV1, QuotationV1 } from '@shared/api/quotations';
import type { ShipmentCost } from '@shared/model/logistics';

import { chargeTypeToCostBucket, quotedTotalVnd, shipmentMarginSummary } from '../marginModel';

describe('chargeTypeToCostBucket', () => {
  it('maps quotation charge types into shipment cost buckets', () => {
    expect(chargeTypeToCostBucket('OCEAN_FREIGHT')).toBe('FREIGHT');
    expect(chargeTypeToCostBucket('AIR_FREIGHT')).toBe('FREIGHT');
    expect(chargeTypeToCostBucket('BREAKBULK_FREIGHT')).toBe('FREIGHT');
    expect(chargeTypeToCostBucket('ORIGIN_CHARGE')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('LOCAL_CHARGE')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('CUSTOMS_FEE')).toBe('CUSTOMS_DUTY');
    expect(chargeTypeToCostBucket('DEMURRAGE')).toBe('DEMURRAGE');
    expect(chargeTypeToCostBucket('DETENTION')).toBe('DEMURRAGE');
    expect(chargeTypeToCostBucket('DOCUMENT_FEE')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('WAREHOUSE')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('THC')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('DO_FEE')).toBe('LOCAL_CHARGES');
    expect(chargeTypeToCostBucket('cargo_insurance')).toBe('INSURANCE');
    expect(chargeTypeToCostBucket('TRUCKING')).toBe('OTHER');
  });
});

describe('quotedTotalVnd', () => {
  it('normalizes quotation charge totals through the quotation exchange rate', () => {
    const quotation = makeQuotation({
      exchange_rate: 25_000,
      charge_lines: [
        chargeLine({ total_amount: 1000 }),
        chargeLine({ total_amount: 250 }),
      ],
    });

    expect(quotedTotalVnd(quotation)).toBe(31_250_000);
  });

  it('falls back to the quotation display total when charge lines are empty', () => {
    const quotation = makeQuotation({
      exchange_rate: 25_000,
      charge_lines: [],
      grand_total_amount: 300,
    });

    expect(quotedTotalVnd(quotation)).toBe(7_500_000);
  });
});

describe('shipmentMarginSummary', () => {
  it('rolls up mixed actual currencies against quoted sell totals by VND bucket', () => {
    const summary = shipmentMarginSummary({
      final_quotation: makeQuotation({
        exchange_rate: 25_000,
        charge_lines: [
          chargeLine({ charge_type: 'OCEAN_FREIGHT', total_amount: 1000 }),
          chargeLine({ charge_type: 'LOCAL_CHARGE', total_amount: 200 }),
        ],
      }),
      costs: [
        cost({ cost_type: 'FREIGHT', amount: 700, currency_code: 'USD', exchange_rate: 25_000 }),
        cost({ cost_type: 'LOCAL_CHARGES', amount: 5_000_000, currency_code: 'VND', exchange_rate: 1 }),
      ],
    });

    expect(summary.rows).toEqual([
      { bucket: 'FREIGHT', quotedVnd: 25_000_000, actualVnd: 17_500_000, marginVnd: 7_500_000 },
      { bucket: 'LOCAL_CHARGES', quotedVnd: 5_000_000, actualVnd: 5_000_000, marginVnd: 0 },
    ]);
    expect(summary.totals).toEqual({
      quotedVnd: 30_000_000,
      actualVnd: 22_500_000,
      marginVnd: 7_500_000,
    });
  });

  it('returns actual-only rows when there is no linked quotation', () => {
    const summary = shipmentMarginSummary({
      final_quotation: null,
      costs: [cost({ cost_type: 'DEMURRAGE', amount: 4_000_000, currency_code: 'VND', exchange_rate: 1 })],
    });

    expect(summary.rows).toEqual([
      { bucket: 'DEMURRAGE', quotedVnd: 0, actualVnd: 4_000_000, marginVnd: -4_000_000 },
    ]);
    expect(summary.totals).toEqual({
      quotedVnd: 0,
      actualVnd: 4_000_000,
      marginVnd: -4_000_000,
    });
  });

  it('keeps quoted rows when costs are empty', () => {
    const summary = shipmentMarginSummary({
      final_quotation: makeQuotation({
        exchange_rate: 1,
        charge_lines: [chargeLine({ charge_type: 'CUSTOMS_FEE', total_amount: 3_000_000 })],
      }),
      costs: [],
    });

    expect(summary.rows).toEqual([
      { bucket: 'CUSTOMS_DUTY', quotedVnd: 3_000_000, actualVnd: 0, marginVnd: 3_000_000 },
    ]);
    expect(summary.totals).toEqual({
      quotedVnd: 3_000_000,
      actualVnd: 0,
      marginVnd: 3_000_000,
    });
  });

  it('falls back to the quotation display total when bucketed charge lines are zero', () => {
    const summary = shipmentMarginSummary({
      final_quotation: makeQuotation({
        exchange_rate: 25_000,
        grand_total_amount: 400,
        charge_lines: [chargeLine({ charge_type: 'AIR_FREIGHT', total_amount: 0 })],
      }),
      costs: [],
    });

    expect(summary.rows).toEqual([
      { bucket: 'OTHER', quotedVnd: 10_000_000, actualVnd: 0, marginVnd: 10_000_000 },
    ]);
  });

  it('shows a negative margin when actual costs exceed the quote', () => {
    const summary = shipmentMarginSummary({
      final_quotation: makeQuotation({
        exchange_rate: 1,
        charge_lines: [chargeLine({ charge_type: 'AIR_FREIGHT', total_amount: 8_000_000 })],
      }),
      costs: [cost({ cost_type: 'FREIGHT', amount: 11_000_000, currency_code: 'VND', exchange_rate: 1 })],
    });

    expect(summary.rows[0]?.marginVnd).toBe(-3_000_000);
    expect(summary.totals.marginVnd).toBe(-3_000_000);
  });

  it('groups multiple quote charge types into their mapped buckets', () => {
    const summary = shipmentMarginSummary({
      final_quotation: makeQuotation({
        exchange_rate: 1,
        charge_lines: [
          chargeLine({ charge_type: 'ORIGIN_CHARGE', total_amount: 1_000_000 }),
          chargeLine({ charge_type: 'LOCAL_CHARGE', total_amount: 2_000_000 }),
          chargeLine({ charge_type: 'DEMURRAGE', total_amount: 3_000_000 }),
          chargeLine({ charge_type: 'OTHER', total_amount: 4_000_000 }),
        ],
      }),
      costs: [],
    });

    expect(summary.rows).toEqual([
      { bucket: 'LOCAL_CHARGES', quotedVnd: 3_000_000, actualVnd: 0, marginVnd: 3_000_000 },
      { bucket: 'DEMURRAGE', quotedVnd: 3_000_000, actualVnd: 0, marginVnd: 3_000_000 },
      { bucket: 'OTHER', quotedVnd: 4_000_000, actualVnd: 0, marginVnd: 4_000_000 },
    ]);
  });
});

function cost(patch: Partial<ShipmentCost> = {}): ShipmentCost {
  return {
    id: 'cost_001',
    cost_type: 'OTHER',
    description: null,
    amount: 0,
    currency_code: 'VND',
    exchange_rate: 1,
    alloc_method: 'BY_VALUE',
    invoice_ref: null,
    notes: null,
    ...patch,
  };
}

function chargeLine(patch: Partial<QuotationChargeLineV1> & { charge_type?: string } = {}): QuotationChargeLineV1 {
  return {
    id: 'ql_001',
    quotation_id: 'quo_001',
    line_no: 1,
    charge_type: (patch.charge_type ?? 'OTHER') as QuotationChargeLineV1['charge_type'],
    description: 'Charge',
    quantity: 1,
    unit: 'LINE',
    unit_price: 0,
    tax_rate: 0,
    amount: 0,
    tax_amount: 0,
    total_amount: 0,
    note: null,
    ...patch,
  };
}

function makeQuotation(patch: Partial<QuotationV1> = {}): QuotationV1 {
  return {
    id: 'quo_001',
    quotation_group_id: 'qg_001',
    quotation_no: 'QT-001',
    version: 1,
    ref_type: null,
    ref_id: null,
    supplier_id: 'sup_001',
    quotation_type: 'FREIGHT',
    exchange_rate: 1,
    status: 'CONFIRMED',
    is_final: true,
    quoted_at: null,
    valid_until: null,
    total_amount: 0,
    total_tax_amount: 0,
    grand_total_amount: 0,
    submitted_at: null,
    confirmed_at: null,
    rejected_at: null,
    cancelled_at: null,
    note: null,
    create_at: '2026-06-01T00:00:00.000Z',
    update_at: '2026-06-01T00:00:00.000Z',
    charge_lines: [],
    ...patch,
  };
}
