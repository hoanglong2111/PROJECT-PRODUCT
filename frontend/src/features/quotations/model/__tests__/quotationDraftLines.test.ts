import { describe, expect, it } from 'vitest';

import {
  addDraftChargeLine,
  emptyDraftGroups,
  removeDraftChargeLineAt,
  seedDraftLineState,
  updateDraftChargeLineAt,
  type QuotationDraftGroupLine,
} from '../quotationDraftLines';

function line(uid: string, patch: Partial<QuotationDraftGroupLine> = {}): QuotationDraftGroupLine {
  return {
    uid,
    ...seedDraftLineState(null),
    ...patch,
  };
}

describe('quotation draft fee lines', () => {
  it('updates only the selected row index even when stale dev state has duplicated uids', () => {
    const groups = emptyDraftGroups();
    groups.FREIGHT = [
      line('fee-duplicate', { chargeCode: 'OFR', unitPrice: 120, currency: 'USD', unit: 'CNTR' }),
      line('fee-duplicate', { chargeCode: 'PKG', unitPrice: 1_500_000, currency: 'VND', unit: 'TRIP' }),
    ];

    const next = updateDraftChargeLineAt(
      groups,
      'FREIGHT',
      1,
      { chargeCode: 'DOC', unitPrice: 75, currency: 'CNY' },
      (chargeCode) => (chargeCode === 'DOC' ? 'SET' : null),
    );

    expect(next.FREIGHT[0]).toMatchObject({
      chargeCode: 'OFR',
      unitPrice: 120,
      currency: 'USD',
      unit: 'CNTR',
    });
    expect(next.FREIGHT[1]).toMatchObject({
      chargeCode: 'DOC',
      unitPrice: 75,
      currency: 'CNY',
      unit: 'SET',
    });
  });

  it('removes only the selected row index even when duplicated uids exist', () => {
    const groups = emptyDraftGroups();
    groups.ORIGIN = [
      line('fee-duplicate', { chargeCode: 'OFR' }),
      line('fee-duplicate', { chargeCode: 'DOC' }),
      line('fee-3', { chargeCode: 'CUS' }),
    ];

    const next = removeDraftChargeLineAt(groups, 'ORIGIN', 1);

    expect(next.ORIGIN.map((item) => item.chargeCode)).toEqual(['OFR', 'CUS']);
  });

  it('creates unique draft line ids for newly added rows', () => {
    const first = addDraftChargeLine(emptyDraftGroups(), 'DESTINATION');
    const second = addDraftChargeLine(first, 'DESTINATION');

    expect(new Set(second.DESTINATION.map((item) => item.uid)).size).toBe(2);
  });
});
