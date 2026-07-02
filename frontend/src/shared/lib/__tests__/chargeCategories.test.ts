import { describe, expect, it } from 'vitest';

import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';

describe('charge list docLabels', () => {
  it('maps every group value to its doc English label', () => {
    const byValue = Object.fromEntries(CHARGE_GROUPS.map((group) => [group.value, group.docLabel]));

    expect(byValue.ORIGIN_EXPORT).toBe('Origin / Export');
    expect(byValue.MAIN_FREIGHT).toBe('Main Freight (Carriage)');
    expect(byValue.SERVICE_OTHER).toBe('Service / Other');
  });

  it('maps every category value to its doc English label', () => {
    const byValue = Object.fromEntries(CHARGE_CATEGORIES.map((category) => [category.value, category.docLabel]));

    expect(byValue.FREIGHT).toBe('Freight');
    expect(byValue.DISBURSEMENT).toBe('Disbursement');
  });

  it('keeps a docLabel on every entry', () => {
    for (const entry of [...CHARGE_GROUPS, ...CHARGE_CATEGORIES]) {
      expect(entry.docLabel.length).toBeGreaterThan(0);
    }
  });
});
