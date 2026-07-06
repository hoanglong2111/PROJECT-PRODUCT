import { describe, expect, it } from 'vitest';

import type { QuotationV1 } from '@shared/api/quotations';

import { quotationDisplayTotalInCurrency, quotationTotalInCurrency } from '../quotationModel';

const rateToVnd = (code: string | null | undefined) => {
  const map: Record<string, number> = { USD: 25_000, VND: 1 };
  return map[(code ?? '').toUpperCase()] ?? 1;
};

describe('quotation currency totals', () => {
  it('converts each charge line before summing in quotation currency', () => {
    const quotation = {
      currency_code: 'USD',
      charge_lines: [
        { total_amount: 10, currency_code: 'USD' },
        { total_amount: 250_000, currency_code: 'VND' },
      ],
    } as Pick<QuotationV1, 'charge_lines' | 'currency_code'>;

    expect(quotationTotalInCurrency(quotation, rateToVnd)).toBe(20);
    expect(quotationTotalInCurrency(quotation, rateToVnd, 'VND')).toBe(500000);
  });

  it('falls back to API total when no charge lines exist', () => {
    const quotation = {
      currency_code: 'USD',
      charge_lines: [],
      grand_total_amount: 10,
      total_amount: 0,
    } as Pick<QuotationV1, 'charge_lines' | 'currency_code' | 'grand_total_amount' | 'total_amount'>;

    expect(quotationDisplayTotalInCurrency(quotation, rateToVnd, 'VND')).toBe(250000);
  });
});
