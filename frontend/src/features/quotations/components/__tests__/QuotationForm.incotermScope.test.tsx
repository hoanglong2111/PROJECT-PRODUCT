/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { QuotationV1 } from '@shared/api/quotations';
import type { Incoterm } from '@shared/api/tradeMasterData';

import { QuotationForm } from '../QuotationForm';

const chargeCodes: ChargeCode[] = [
  chargeCode('DOC', 'Documentation fee', 'DOCUMENTATION_FILING'),
  chargeCode('DST', 'Destination fee', 'DESTINATION_IMPORT'),
  chargeCode('FRT', 'Ocean freight', 'MAIN_FREIGHT'),
];

const incoterms: Incoterm[] = [
  incoterm('CIF', ['DOCUMENTATION_FILING', 'DESTINATION_IMPORT'], true),
  incoterm('DDP', [], false),
];

vi.mock('@shared/hooks/useTradeMasterDataOptions', () => ({
  useTradeMasterDataOptions: () => ({
    currencyOptions: [{ label: 'USD - US Dollar', value: 'USD' }],
    incotermOptions: incoterms.map((record) => ({
      label: `${record.incoterm_code} - ${record.incoterm_name}`,
      value: record.incoterm_code,
    })),
    incoterms,
  }),
}));

vi.mock('@shared/api/chargeCodes', () => ({
  fetchChargeCodes: vi.fn(async () => ({ data: chargeCodes, total: chargeCodes.length })),
}));

vi.mock('@shared/api/uoms', () => ({
  fetchUoms: vi.fn(async () => ({
    data: [{ id: 'uom_shpt', uom_code: 'SHPT', uom_name_en: 'Shipment', uom_name_vn: '', description: null, is_active: true }],
    total: 1,
  })),
}));

vi.mock('@shared/api/quotations', () => ({
  createQuotation: vi.fn(),
  createQuotationVersion: vi.fn(),
}));

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

describe('QuotationForm Incoterm suggested fee scope', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    vi.clearAllMocks();
  });

  it('uses the CIF record scope and renders the seller-insurance note', async () => {
    await render(<QuotationForm onCancel={vi.fn()} onCreated={vi.fn()} sourceQuotation={quotation('CIF')} />);
    await flushQueries();

    const suggestedGroups = suggestedGroupText();
    expect(container.textContent).toContain('quotations.insuranceIncludedNote:{"incoterm":"CIF"}');
    expect(suggestedGroups).toHaveLength(2);
    expect(suggestedGroups.join(' ')).toContain('masterData.chargeGroupDocumentationFiling');
    expect(suggestedGroups.join(' ')).toContain('masterData.chargeGroupDestinationImport');
    expect(suggestedGroups.join(' ')).not.toContain('masterData.chargeGroupMainFreight');
  });

  it('uses the DDP record scope as an empty suggested-fee board', async () => {
    await render(<QuotationForm onCancel={vi.fn()} onCreated={vi.fn()} sourceQuotation={quotation('DDP')} />);
    await flushQueries();

    expect(container.textContent).not.toContain('quotations.insuranceIncludedNote');
    expect(suggestedGroupText()).toEqual([]);
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MantineProvider>{ui}</MantineProvider>
        </QueryClientProvider>,
      );
    });
  }

  function suggestedGroupText() {
    return Array.from(container.querySelectorAll('.rfq-charge-group')).map((element) => element.textContent ?? '');
  }
});

async function flushQueries() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function chargeCode(charge_code: string, charge_name_en: string, group: string): ChargeCode {
  return {
    id: `chg_${charge_code}`,
    charge_code,
    charge_name_en,
    charge_name_vn: '',
    group,
    category: 'SERVICE',
    default_uom: 'SHPT',
    sea_fcl: true,
    sea_lcl: true,
    air: true,
    road: false,
    rail: false,
    rev_cost: 'BOTH',
    taxable: false,
    description: null,
    is_active: true,
  };
}

function incoterm(incoterm_code: string, charge_group_scope: string[], insurance_required: boolean): Incoterm {
  return {
    id: `inc_${incoterm_code.toLowerCase()}`,
    incoterm_code,
    incoterm_name: incoterm_code,
    incoterm_name_vn: '',
    description: null,
    charge_group_scope,
    insurance_required,
    is_active: true,
  };
}

function quotation(incoterm_code: string): QuotationV1 {
  return {
    id: `quo_${incoterm_code.toLowerCase()}`,
    quotation_group_id: 'qg_1',
    quotation_no: 'Q-001',
    version: 1,
    ref_type: null,
    ref_id: null,
    customer_ref: null,
    incoterm_code,
    mode: 'SEA_FCL',
    supplier_id: 'sup_1',
    quotation_type: 'FREIGHT',
    currency_code: 'USD',
    exchange_rate: 1,
    status: 'DRAFT',
    is_final: false,
    quoted_at: null,
    valid_until: null,
    total_amount: 0,
    total_tax_amount: 0,
    grand_total_amount: 0,
    submitted_at: null,
    confirmed_at: null,
    rejected_at: null,
    cancelled_at: null,
    note: null,
    create_at: '2026-07-04T00:00:00.000Z',
    update_at: '2026-07-04T00:00:00.000Z',
    charge_lines: [],
  } as QuotationV1;
}
