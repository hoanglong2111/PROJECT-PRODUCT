import { describe, expect, it } from 'vitest';

import { computeQuotationLineVnd, QUOTATION_VAT_RATE, summarizeQuotationVndLines } from '../quotationCharges';

const rateToVnd = (code: string | null | undefined) => {
  const normalized = code?.trim().toUpperCase();
  if (normalized === 'USD') return 25_450;
  if (normalized === 'CNY') return 3_620;
  if (normalized === 'JPY') return 172;
  if (normalized === 'VND') return 1;
  return null;
};

describe('quotation charge VND breakdown', () => {
  it('converts a non-taxable local-currency line to VND without VAT', () => {
    const line = computeQuotationLineVnd(
      {
        quantity: 1,
        unitPrice: 120,
        currency: 'USD',
        taxable: false,
      },
      rateToVnd,
    );

    expect(line.exchangeRate).toBe(25450);
    expect(line.endpointCurrency).toBe('VND');
    expect(line.conversionRate).toBe(25_450);
    expect(line.localAmount).toBe(120);
    expect(line.amountVnd).toBe(3_054_000);
    expect(line.vatVnd).toBe(0);
    expect(line.totalVnd).toBe(3_054_000);
    expect(line.totalEndpoint).toBe(3_054_000);
  });

  it('computes VAT on the VND equivalent for taxable lines', () => {
    const line = computeQuotationLineVnd(
      {
        quantity: 1,
        unitPrice: 1_500_000,
        currency: 'VND',
        taxable: true,
      },
      rateToVnd,
    );

    expect(QUOTATION_VAT_RATE).toBe(10);
    expect(line.conversionRate).toBe(1);
    expect(line.amountVnd).toBe(1_500_000);
    expect(line.vatVnd).toBe(150_000);
    expect(line.totalVnd).toBe(1_650_000);
  });

  it('summarizes subtotal, VAT, and total from the same line breakdowns', () => {
    const lines = [
      computeQuotationLineVnd({ quantity: 1, unitPrice: 120, currency: 'USD', taxable: false }, rateToVnd),
      computeQuotationLineVnd({ quantity: 1, unitPrice: 1_500_000, currency: 'VND', taxable: true }, rateToVnd),
    ];

    expect(summarizeQuotationVndLines(lines)).toEqual({
      subtotalVnd: 4_554_000,
      taxVnd: 150_000,
      totalVnd: 4_704_000,
      missingRateCount: 0,
      totalsByEndpoint: [{ currency: 'VND', total: 4_704_000 }],
    });
  });

  it('converts the final line total to the selected endpoint currency', () => {
    const line = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 1_720_000, currency: 'VND', endpointCurrency: 'JPY', taxable: true },
      rateToVnd,
    );

    expect(line.totalVnd).toBe(1_892_000);
    expect(line.endpointCurrency).toBe('JPY');
    expect(line.conversionRate).toBeCloseTo(1 / 172, 8);
    expect(line.totalEndpoint).toBe(11_000);
  });

  it('does not treat a non-VND endpoint as rate 1 when the source currency is VND', () => {
    const line = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 25_450_000, currency: 'VND', endpointCurrency: 'USD', taxable: false },
      rateToVnd,
    );

    expect(line.exchangeRate).toBe(1);
    expect(line.endpointRate).toBe(25_450);
    expect(line.conversionRate).toBeCloseTo(1 / 25_450, 8);
    expect(line.amountVnd).toBe(25_450_000);
    expect(line.totalEndpoint).toBe(1_000);
  });

  it('uses a direct conversion rate of 1 when source and endpoint currencies match', () => {
    const line = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 120, currency: 'USD', endpointCurrency: 'USD', taxable: false },
      rateToVnd,
    );

    expect(line.exchangeRate).toBe(25_450);
    expect(line.endpointRate).toBe(25_450);
    expect(line.conversionRate).toBe(1);
    expect(line.amountVnd).toBe(3_054_000);
    expect(line.totalEndpoint).toBe(120);
  });

  it('converts non-VND source to a non-VND endpoint through VND', () => {
    const line = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 120, currency: 'USD', endpointCurrency: 'CNY', taxable: false },
      rateToVnd,
    );

    expect(line.exchangeRate).toBe(25_450);
    expect(line.endpointRate).toBe(3_620);
    expect(line.conversionRate).toBeCloseTo(25_450 / 3_620, 8);
    expect(line.amountVnd).toBe(3_054_000);
    expect(line.totalEndpoint).toBe(843.65);
  });

  it('marks missing source or endpoint rates and excludes them from totals', () => {
    const missingSource = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 120, currency: 'XXX', endpointCurrency: 'VND', taxable: true },
      rateToVnd,
    );
    const missingEndpoint = computeQuotationLineVnd(
      { quantity: 1, unitPrice: 120, currency: 'USD', endpointCurrency: 'XXX', taxable: true },
      rateToVnd,
    );

    expect(missingSource.missingRate).toBe(true);
    expect(missingSource.missingRateCurrency).toBe('XXX');
    expect(missingSource.totalVnd).toBe(0);
    expect(missingEndpoint.missingRate).toBe(true);
    expect(missingEndpoint.missingRateCurrency).toBe('XXX');
    expect(missingEndpoint.conversionRate).toBeNull();
    expect(summarizeQuotationVndLines([missingSource, missingEndpoint])).toEqual({
      subtotalVnd: 0,
      taxVnd: 0,
      totalVnd: 0,
      missingRateCount: 2,
      totalsByEndpoint: [],
    });
  });
});
