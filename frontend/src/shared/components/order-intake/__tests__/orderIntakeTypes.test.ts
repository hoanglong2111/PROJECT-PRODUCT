import { describe, expect, it } from 'vitest';

import { newOrderLine, orderLinesTotal } from '../types';

describe('order-intake line helpers', () => {
  it('creates a blank line with a unique clientId and 1-based line_no', () => {
    const line = newOrderLine(0);

    expect(line.line_no).toBe(1);
    expect(line.qty).toBe(1);
    expect(line.clientId).toMatch(/^line-/);
  });

  it('sums qty x unit_price across lines', () => {
    const lines = [
      newOrderLine(0, { qty: 2, unit_price: 10 }),
      newOrderLine(1, { qty: 3, unit_price: 5 }),
    ];

    expect(orderLinesTotal(lines)).toBe(35);
  });
});
