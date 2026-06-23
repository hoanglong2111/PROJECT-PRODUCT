import { describe, expect, it } from 'vitest';

import type { ShipmentCost } from '@shared/api/logistics';
import { landedCostTotal } from '../shipmentModel';

function cost(partial: Partial<ShipmentCost>): ShipmentCost {
  return {
    id: 'c',
    cost_type: 'OTHER',
    description: null,
    amount: 0,
    currency_code: 'USD',
    exchange_rate: 1,
    alloc_method: 'BY_VALUE',
    invoice_ref: null,
    notes: null,
    ...partial,
  };
}

describe('landedCostTotal', () => {
  it('returns 0 for no cost lines', () => {
    expect(landedCostTotal([])).toBe(0);
  });

  it('normalizes mixed currencies to the base via exchange_rate', () => {
    const costs = [
      cost({ amount: 2400, currency_code: 'USD', exchange_rate: 25000 }), // 60,000,000
      cost({ amount: 3500000, currency_code: 'VND', exchange_rate: 1 }), //  3,500,000
    ];
    expect(landedCostTotal(costs)).toBe(63_500_000);
  });
});
