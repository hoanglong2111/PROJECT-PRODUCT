import { describe, expect, it } from 'vitest';

import type { Currency, Incoterm, TransportMode } from '@shared/api/tradeMasterData';

import { applyQuotationPrefill, createInitialPoDraft, type PoFormDraft } from '../purchaseOrderModel';

const masterData = {
  currencies: [
    currency({ id: 'cur_usd', currency_code: 'USD' }),
    currency({ id: 'cur_vnd', currency_code: 'VND' }),
  ],
  incoterms: [
    incoterm({ id: 'inc_fob', incoterm_code: 'FOB' }),
    incoterm({ id: 'inc_cif', incoterm_code: 'CIF' }),
  ],
  transportModes: [
    transportMode({ id: 'tm_sea', mode_code: 'SEA' }),
    transportMode({ id: 'tm_air', mode_code: 'AIR' }),
    transportMode({ id: 'tm_road', mode_code: 'ROAD' }),
  ],
};

describe('applyQuotationPrefill', () => {
  it('sets supplier, quotation, incoterm, currency, mode, and exchange rate from the quotation', () => {
    const draft = draftWith({
      supplier_id: 'existing_supplier',
      incoterm_id: 'existing_incoterm',
      currency_id: 'existing_currency',
      transport_mode_id: 'existing_mode',
      exchange_rate: 1,
    });

    const nextDraft = applyQuotationPrefill(draft, quotation({
      supplier_id: 'sup_quotation',
      incoterm_code: 'FOB',
      currency_code: 'USD',
      mode: 'AIR',
      exchange_rate: 25_000,
    }), masterData);

    expect(nextDraft).toMatchObject({
      quotation_id: 'quo_001',
      supplier_id: 'sup_quotation',
      incoterm_id: 'inc_fob',
      currency_id: 'cur_usd',
      transport_mode_id: 'tm_air',
      exchange_rate: 25_000,
    });
  });

  it('maps AIR quotations to the AIR transport mode', () => {
    const nextDraft = applyQuotationPrefill(draftWith(), quotation({ mode: 'AIR' }), masterData);

    expect(nextDraft.transport_mode_id).toBe('tm_air');
  });

  it('maps SEA_FCL quotations to the SEA transport mode', () => {
    const nextDraft = applyQuotationPrefill(draftWith(), quotation({ mode: 'SEA_FCL' }), masterData);

    expect(nextDraft.transport_mode_id).toBe('tm_sea');
  });

  it('maps SEA_LCL quotations to the SEA transport mode', () => {
    const nextDraft = applyQuotationPrefill(draftWith(), quotation({ mode: 'SEA_LCL' }), masterData);

    expect(nextDraft.transport_mode_id).toBe('tm_sea');
  });

  it('keeps the existing transport mode when the quotation mode is unknown', () => {
    const nextDraft = applyQuotationPrefill(
      draftWith({ transport_mode_id: 'tm_road' }),
      quotation({ mode: 'SPACE_RAIL' }),
      masterData,
    );

    expect(nextDraft.transport_mode_id).toBe('tm_road');
  });

  it('keeps the existing supplier when the quotation has no supplier', () => {
    const nextDraft = applyQuotationPrefill(
      draftWith({ supplier_id: 'existing_supplier' }),
      quotation({ supplier_id: '' }),
      masterData,
    );

    expect(nextDraft.supplier_id).toBe('existing_supplier');
  });

  it('copies only finite positive exchange rates', () => {
    expect(applyQuotationPrefill(draftWith({ exchange_rate: 1 }), quotation({ exchange_rate: '24500.5' }), masterData).exchange_rate)
      .toBe(24_500.5);
    expect(applyQuotationPrefill(draftWith({ exchange_rate: 1 }), quotation({ exchange_rate: 0 }), masterData).exchange_rate)
      .toBe(1);
    expect(applyQuotationPrefill(draftWith({ exchange_rate: 1 }), quotation({ exchange_rate: 'nope' }), masterData).exchange_rate)
      .toBe(1);
  });
});

function draftWith(patch: Partial<PoFormDraft> = {}): PoFormDraft {
  return {
    ...createInitialPoDraft(),
    ...patch,
  };
}

function quotation(patch: {
  currency_code?: string;
  exchange_rate?: number | string;
  incoterm_code?: string;
  mode?: string | null;
  supplier_id?: string;
} = {}) {
  return {
    id: 'quo_001',
    supplier_id: 'sup_001',
    incoterm_code: 'CIF',
    currency_code: 'VND',
    mode: 'SEA_FCL',
    exchange_rate: 1,
    ...patch,
  };
}

function currency(patch: Partial<Currency>): Currency {
  return {
    id: 'cur',
    currency_code: 'USD',
    currency_name: 'US Dollar',
    symbol: '$',
    decimal_places: 2,
    is_active: true,
    ...patch,
  };
}

function incoterm(patch: Partial<Incoterm>): Incoterm {
  return {
    id: 'inc',
    incoterm_code: 'FOB',
    incoterm_name: 'Free on Board',
    incoterm_name_vn: '',
    description: null,
    is_active: true,
    ...patch,
  };
}

function transportMode(patch: Partial<TransportMode>): TransportMode {
  return {
    id: 'tm',
    mode_code: 'SEA',
    mode_name: 'Sea freight',
    mode_type: 'SEA',
    description: null,
    is_active: true,
    ...patch,
  };
}
