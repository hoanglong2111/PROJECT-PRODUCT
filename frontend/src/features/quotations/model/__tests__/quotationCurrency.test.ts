import { describe, expect, it } from 'vitest';

import { summarizeByCurrency } from '../quotationCurrency';

const rate = (code: string | null | undefined) => (code === 'USD' ? 26301 : code === 'VND' ? 1 : 1);

describe('summarizeByCurrency', () => {
  it('groups subtotals per currency and never merges currencies', () => {
    const summary = summarizeByCurrency(
      [
        { currency: 'USD', amount: 1200, taxable: false },
        { currency: 'USD', amount: 250, taxable: false },
        { currency: 'VND', amount: 3_500_000, taxable: true },
      ],
      rate,
    );

    expect(summary.byCurrency).toEqual([
      { currency: 'USD', subtotal: 1450, tax: 0, total: 1450 },
      { currency: 'VND', subtotal: 3_500_000, tax: 350_000, total: 3_850_000 },
    ]);
  });

  it('computes an internal VND-equivalent across currencies', () => {
    const summary = summarizeByCurrency([{ currency: 'USD', amount: 100, taxable: false }], rate);

    expect(summary.internalVndTotal).toBe(2_630_100);
  });

  it('skips lines with no currency or non-positive amount', () => {
    const summary = summarizeByCurrency(
      [
        { currency: null, amount: 100 },
        { currency: 'USD', amount: 0 },
      ],
      rate,
    );

    expect(summary.byCurrency).toEqual([]);
    expect(summary.internalVndTotal).toBe(0);
  });
});
