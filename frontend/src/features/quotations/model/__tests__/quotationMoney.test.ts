import { describe, expect, it } from 'vitest';

import type { QuotationChargeLineV1, QuotationV1 } from '@shared/api/quotations';

import {
  computeOptionCompareTotals,
  computeOptionCustomerPayTotal,
  computeQuotationCustomerPayTotal,
  computeQuotationMoneyTotals,
  selectOptionChargeLines,
  selectQuotationActiveOptionNo,
} from '../quotationMoney';

const rateToVndOrNull = (code: string | null | undefined) => {
  const normalized = code?.trim().toUpperCase();
  if (normalized === 'VND') return 1;
  if (normalized === 'USD') return 25_000;
  if (normalized === 'CNY') return 3_500;
  return null;
};

describe('computeQuotationMoneyTotals', () => {
  it('converts mixed USD/VND lines into the customer payment currency', () => {
    const totals = computeQuotationMoneyTotals(
      [
        { quantity: 1, unitPrice: 100, currency: 'USD' },
        { quantity: 1, unitPrice: 1_000_000, currency: 'VND' },
      ],
      'VND',
      rateToVndOrNull,
    );

    expect(totals.totalVnd).toBe(2_500_000 + 1_000_000);
    expect(totals.customerPayTotal).toBe(3_500_000);
    expect(totals.missingRateCount).toBe(0);
    expect(totals.subtotalsBySourceCurrency).toEqual([
      { currency: 'USD', amount: 100 },
      { currency: 'VND', amount: 1_000_000 },
    ]);
  });

  it('converts the same total into a non-VND customer payment currency', () => {
    const totals = computeQuotationMoneyTotals(
      [{ quantity: 1, unitPrice: 3_500_000, currency: 'VND' }],
      'USD',
      rateToVndOrNull,
    );

    expect(totals.customerPayTotal).toBe(140);
  });

  it('does not silently treat a missing exchange rate as 1', () => {
    const totals = computeQuotationMoneyTotals(
      [{ quantity: 1, unitPrice: 100, currency: 'XXX' }],
      'VND',
      rateToVndOrNull,
    );

    expect(totals.totalVnd).toBe(0);
    expect(totals.missingRateCount).toBe(1);
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

describe('computeOptionCustomerPayTotal', () => {
  it('excludes other options freight lines from the selected option total', () => {
    const lines: QuotationChargeLineV1[] = [
      { option_no: null, currency_code: 'VND', quantity: 1, unit_price: 100_000 } as QuotationChargeLineV1,
      { option_no: 1, currency_code: 'USD', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
      { option_no: 2, currency_code: 'USD', quantity: 1, unit_price: 999 } as QuotationChargeLineV1,
    ];

    const total = computeOptionCustomerPayTotal(lines, 1, 'VND', rateToVndOrNull);
    expect(total).toBe(100_000 + 2_500_000);
  });
});

describe('computeOptionCompareTotals', () => {
  const lines: QuotationChargeLineV1[] = [
    { option_no: null, charge_group: 'ORIGIN', currency_code: 'VND', quantity: 1, unit_price: 100_000 } as QuotationChargeLineV1,
    { option_no: null, charge_group: 'DESTINATION', currency_code: 'VND', quantity: 2, unit_price: 50_000 } as QuotationChargeLineV1,
    { option_no: 1, charge_group: 'FREIGHT', currency_code: 'USD', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
    { option_no: 2, charge_group: 'FREIGHT', currency_code: 'USD', quantity: 1, unit_price: 120 } as QuotationChargeLineV1,
  ];

  it('totals shared + own lines and splits VND totals per charge group', () => {
    const totals = computeOptionCompareTotals(lines, 1, 'VND', rateToVndOrNull);

    expect(totals.lineCount).toBe(3);
    expect(totals.totalVnd).toBe(100_000 + 100_000 + 2_500_000);
    expect(totals.customerPayTotal).toBe(2_700_000);
    expect(totals.groupTotalsVnd).toEqual({ FREIGHT: 2_500_000, ORIGIN: 100_000, DESTINATION: 100_000 });
  });

  it('differs between two options only on their own freight lines', () => {
    const totalsA = computeOptionCompareTotals(lines, 1, 'VND', rateToVndOrNull);
    const totalsB = computeOptionCompareTotals(lines, 2, 'VND', rateToVndOrNull);

    expect(totalsB.totalVnd - totalsA.totalVnd).toBe(20 * 25_000);
    expect(totalsB.groupTotalsVnd.FREIGHT - totalsA.groupTotalsVnd.FREIGHT).toBe(500_000);
    expect(totalsA.groupTotalsVnd.ORIGIN).toBe(totalsB.groupTotalsVnd.ORIGIN);
    expect(totalsA.groupTotalsVnd.DESTINATION).toBe(totalsB.groupTotalsVnd.DESTINATION);
  });

  it('returns equal totals for identical option lines', () => {
    const shared: QuotationChargeLineV1[] = [
      { option_no: 1, charge_group: 'FREIGHT', currency_code: 'USD', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
      { option_no: 2, charge_group: 'FREIGHT', currency_code: 'USD', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
    ];
    const totalsA = computeOptionCompareTotals(shared, 1, 'VND', rateToVndOrNull);
    const totalsB = computeOptionCompareTotals(shared, 2, 'VND', rateToVndOrNull);

    expect(totalsA.totalVnd).toBe(totalsB.totalVnd);
    expect(totalsA.customerPayTotal).toBe(totalsB.customerPayTotal);
  });

  it('reports missing rates instead of computing a wrong money total', () => {
    const withUnknown: QuotationChargeLineV1[] = [
      { option_no: 1, charge_group: 'FREIGHT', currency_code: 'XXX', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
    ];
    const totals = computeOptionCompareTotals(withUnknown, 1, 'VND', rateToVndOrNull);

    expect(totals.missingRateCount).toBe(1);
    expect(totals.totalVnd).toBe(0);
    expect(totals.groupTotalsVnd.FREIGHT).toBe(0);
  });

  it('bucket lines with unknown charge_group under FREIGHT', () => {
    const unknownGroup: QuotationChargeLineV1[] = [
      { option_no: 1, charge_group: null, currency_code: 'VND', quantity: 1, unit_price: 5_000 } as QuotationChargeLineV1,
    ];
    const totals = computeOptionCompareTotals(unknownGroup, 1, 'VND', rateToVndOrNull);
    expect(totals.groupTotalsVnd.FREIGHT).toBe(5_000);
  });
});

describe('computeQuotationCustomerPayTotal', () => {
  const baseQuotation: Pick<QuotationV1, 'charge_lines' | 'currency_code' | 'options' | 'selected_option_id'> = {
    currency_code: 'VND',
    selected_option_id: null,
    options: [
      { id: 'opt-1', option_no: 1, is_recommended: true, is_selected: false } as never,
      { id: 'opt-2', option_no: 2, is_recommended: false, is_selected: false } as never,
    ],
    charge_lines: [
      { option_no: null, currency_code: 'VND', quantity: 1, unit_price: 100_000 } as QuotationChargeLineV1,
      { option_no: 1, currency_code: 'USD', quantity: 1, unit_price: 100 } as QuotationChargeLineV1,
      { option_no: 2, currency_code: 'USD', quantity: 1, unit_price: 999 } as QuotationChargeLineV1,
    ],
  };

  it('defaults to the recommended option and includes shared lines', () => {
    const totals = computeQuotationCustomerPayTotal(baseQuotation, rateToVndOrNull);
    expect(totals.customerPayTotal).toBe(100_000 + 2_500_000);
  });

  it('follows an explicit selected_option_id over the recommended option', () => {
    const selected = { ...baseQuotation, selected_option_id: 'opt-2' };
    expect(selectQuotationActiveOptionNo(selected)).toBe(2);
    const totals = computeQuotationCustomerPayTotal(selected, rateToVndOrNull);
    expect(totals.customerPayTotal).toBe(100_000 + 999 * 25_000);
  });
});
