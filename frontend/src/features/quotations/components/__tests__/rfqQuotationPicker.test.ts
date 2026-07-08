import { describe, expect, it } from 'vitest';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { QuotationStatusV1, QuotationV1 } from '@shared/api/quotations';

import {
  eligibleRfqs,
  isEligibleRfq,
  rfqMatchesSearch,
  summarizeLinkedQuotations,
} from '../RfqQuotationPickerModal';

function makeRfq(overrides: Partial<QuotationRequestV1>): QuotationRequestV1 {
  return {
    id: overrides.id ?? 'rfq-1',
    rfq_no: overrides.rfq_no ?? 'RFQ-0001',
    status: overrides.status ?? 'SUBMITTED',
    customer_ref: null,
    customer_po_ref: null,
    customer_contract_ref: null,
    supplier_id: null,
    incoterm_code: null,
    mode: null,
    currency_code: null,
    origin_port: null,
    destination_port: null,
    desired_cargo_ready_date: null,
    gross_weight_kg: null,
    volume_cbm: null,
    container_type: null,
    note: null,
    ...overrides,
  };
}

describe('rfqQuotationPicker helpers', () => {
  it('treats only SUBMITTED and RECEIVED as eligible', () => {
    expect(isEligibleRfq(makeRfq({ status: 'SUBMITTED' }))).toBe(true);
    expect(isEligibleRfq(makeRfq({ status: 'RECEIVED' }))).toBe(true);
    expect(isEligibleRfq(makeRfq({ status: 'QUOTED' }))).toBe(false);
    expect(isEligibleRfq(makeRfq({ status: 'CONFIRMED' }))).toBe(false);
    expect(isEligibleRfq(makeRfq({ status: 'CANCELLED' }))).toBe(false);
  });

  it('filters out non-eligible RFQs and sorts newest first by create_at', () => {
    const result = eligibleRfqs([
      makeRfq({ id: 'a', status: 'SUBMITTED', create_at: '2026-01-01T00:00:00Z' }),
      makeRfq({ id: 'b', status: 'QUOTED', create_at: '2026-03-01T00:00:00Z' }),
      makeRfq({ id: 'c', status: 'RECEIVED', create_at: '2026-02-01T00:00:00Z' }),
    ]);
    expect(result.map((r) => r.id)).toEqual(['c', 'a']);
  });

  it('matches search across route, supplier and rfq_no', () => {
    const rfq = makeRfq({
      rfq_no: 'RFQ-2201',
      origin_port: 'SGN',
      destination_port: 'LAX',
      supplier: { supplier_code: 'SUP-9', supplier_name: 'Mekong Freight Co' } as QuotationRequestV1['supplier'],
    });
    expect(rfqMatchesSearch(rfq, '')).toBe(true);
    expect(rfqMatchesSearch(rfq, 'lax')).toBe(true);
    expect(rfqMatchesSearch(rfq, 'mekong')).toBe(true);
    expect(rfqMatchesSearch(rfq, '2201')).toBe(true);
    expect(rfqMatchesSearch(rfq, 'nonexistent')).toBe(false);
  });
});

describe('summarizeLinkedQuotations', () => {
  const withQuotations = (statuses: QuotationStatusV1[]): QuotationRequestV1 =>
    makeRfq({
      quotations: statuses.map((status, index) => ({ id: `qt-${index}`, status }) as QuotationV1),
    });

  it('reports zeros when there are no linked quotations', () => {
    const summary = summarizeLinkedQuotations(makeRfq({}));
    expect(summary).toMatchObject({ draft: 0, inReview: 0, confirmed: 0, rejected: 0, total: 0, active: 0 });
  });

  it('buckets each status and treats PENDING_* as in-review', () => {
    const summary = summarizeLinkedQuotations(
      withQuotations(['DRAFT', 'DRAFT', 'PENDING_APPROVAL', 'PENDING_ADJUSTMENT', 'CONFIRMED', 'REJECTED']),
    );
    expect(summary).toMatchObject({ draft: 2, inReview: 2, confirmed: 1, rejected: 1, total: 6 });
  });

  it('active excludes rejected quotations (drives the duplicate-draft warning)', () => {
    const summary = summarizeLinkedQuotations(withQuotations(['DRAFT', 'REJECTED', 'REJECTED']));
    expect(summary.total).toBe(3);
    expect(summary.active).toBe(1);
  });
});
