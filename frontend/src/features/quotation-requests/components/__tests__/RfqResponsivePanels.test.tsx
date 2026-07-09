/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../../model/quotationRequestModel';
import { ContainersPanel } from '../RfqContainersPanel';
import { LinkedQuotationsPanel } from '../RfqLinkedQuotationsPanel';
import { PackagesPanel } from '../RfqPackagesPanel';

const t: TFn = (key) => key;

const request = {
  packages: [
    {
      id: 'package-1',
      package_no: 1,
      package_type: 'PKG-ALPHA',
      length_cm: 120,
      width_cm: 80,
      height_cm: 65,
      qty: 2,
      gross_weight_per_package_kg: 45,
      cbm: 1.25,
      lines: [
        {
          id: 'package-line-1',
          item: { item_code: 'ITEM-P' },
          qty: 12,
          unit: 'PCS',
          unit_price: 9.5,
        },
      ],
    },
  ],
  containers: [
    {
      id: 'container-1',
      container_type: '40HC',
      qty: 1,
      lines: [
        {
          id: 'container-line-1',
          item: { item_code: 'ITEM-C' },
          qty: 20,
          unit: 'CTN',
          unit_price: 18,
          gross_weight_kg: 320,
        },
      ],
    },
  ],
  quotations: [
    {
      id: 'quotation-1',
      quotation_no: 'QT-2026-001',
      status: 'SUBMITTED',
      create_at: '2026-07-08T08:00:00Z',
      grand_total_amount: 2450,
      currency_code: 'USD',
      mode: 'SEA_LCL',
      incoterm_code: 'FOB',
      valid_until: '2026-07-31',
      options: [
        {
          id: 'option-1',
          is_recommended: true,
          is_selected: false,
          carrier_name: 'Oceanic Lines',
          transit_time_days: 18,
          etd: '2026-07-20',
          eta: '2026-08-07',
        },
      ],
    },
  ],
} as unknown as QuotationRequestV1;

describe('RFQ responsive data panels', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
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
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(<MantineProvider>{ui}</MantineProvider>);
    });
  }

  it('keeps package data in both semantic table and responsive cards', async () => {
    await render(<PackagesPanel request={request} t={t} />);

    expect(container.querySelector('.rfq-responsive-table')).toBeTruthy();
    expect(container.querySelector('.rfq-responsive-cards')).toBeTruthy();
    expect(container.textContent).toContain('PKG-ALPHA');
    expect(container.textContent).toContain('ITEM-P');
  });

  it('keeps container data in both semantic table and responsive cards', async () => {
    await render(<ContainersPanel request={request} t={t} />);

    expect(container.querySelector('.rfq-responsive-table')).toBeTruthy();
    expect(container.querySelector('.rfq-responsive-cards')).toBeTruthy();
    expect(container.textContent).toContain('40HC');
    expect(container.textContent).toContain('ITEM-C');
  });

  it('keeps quotation data in both views and preserves the view action', async () => {
    const onView = vi.fn();
    await render(
      <LinkedQuotationsPanel
        request={request}
        t={t}
        statusLabel={(status) => `Status: ${status}`}
        onView={onView}
      />,
    );

    expect(container.querySelector('.rfq-responsive-table')).toBeTruthy();
    expect(container.querySelector('.rfq-responsive-cards')).toBeTruthy();
    expect(container.textContent).toContain('QT-2026-001');
    expect(container.textContent).toContain('Oceanic Lines');

    await act(async () => {
      (container.querySelector('.rfq-data-card-action') as HTMLButtonElement | null)?.click();
    });
    expect(onView).toHaveBeenCalledWith('quotation-1');
  });
});
