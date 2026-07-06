import { describe, expect, it } from 'vitest';

import { hasMinimumOptions } from '../QuotationOptionsTable';

describe('hasMinimumOptions', () => {
  it('is false with fewer than two options', () => {
    expect(hasMinimumOptions([{ id: 'a' }] as never)).toBe(false);
  });

  it('is true with two or more options', () => {
    expect(hasMinimumOptions([{ id: 'a' }, { id: 'b' }] as never)).toBe(true);
  });
});
