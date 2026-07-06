import { describe, expect, it } from 'vitest';

import { QUOTATION_CHARGE_GROUPS } from '../quotationChargeGroups';

describe('QUOTATION_CHARGE_GROUPS', () => {
  it('is exactly Freight, Origin, Destination in order', () => {
    expect(QUOTATION_CHARGE_GROUPS.map((group) => group.value)).toEqual(['FREIGHT', 'ORIGIN', 'DESTINATION']);
  });
});
