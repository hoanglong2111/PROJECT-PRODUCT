/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act, useState } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuotationRequestStatusV1, QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../../model/quotationRequestModel';
import {
  QuotationRequestActionPanel,
  resolvePrimaryAction,
  type PrimaryAction,
} from '../RfqActionPanel';
import { RfqCancelConfirmModal } from '../RfqCancelConfirmModal';

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const t: TFn = (key, params) => {
  if (params?.rfqNo) return `${key}:${params.rfqNo}`;
  return key;
};

function actionFor(status: QuotationRequestStatusV1): PrimaryAction {
  return resolvePrimaryAction({
    status,
    canReceive: true,
    canCreateQuotation: true,
    receiveLoading: false,
    onReceive: vi.fn(),
    onCreateQuotation: vi.fn(),
    onViewResponses: vi.fn(),
    t,
  });
}

describe('RFQ action resolution', () => {
  it.each([
    ['SUBMITTED', 'quotationRequests.receive', false],
    ['RECEIVED', 'quotationRequests.createQuotation', false],
    ['QUOTED', 'quotationRequests.viewResponses', false],
    ['CONFIRMED', 'quotationRequests.confirmedLabel', true],
    ['CANCELLED', 'quotationRequests.cancelledLabel', true],
  ] as const)('maps %s to the expected action', (status, label, isTerminal) => {
    const action = actionFor(status);
    expect(action.label).toBe(label);
    expect(action.isTerminal).toBe(isTerminal);
    expect(action.disabled).toBe(isTerminal);
  });
});

describe('RFQ cancel confirmation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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
    vi.clearAllMocks();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(<MantineProvider>{ui}</MantineProvider>);
    });
  }

  it('does not invoke cancellation until the confirmation button is pressed', async () => {
    const confirmCancel = vi.fn();
    const request = {
      rfq_no: 'RFQ-2026-018',
      status: 'SUBMITTED',
    } as QuotationRequestV1;

    function Harness() {
      const [opened, setOpened] = useState(false);
      return (
        <>
          <QuotationRequestActionPanel
            request={request}
            t={t}
            primaryAction={actionFor(request.status)}
            canCancel
            cancelLoading={false}
            onCancel={() => setOpened(true)}
          />
          <RfqCancelConfirmModal
            opened={opened}
            rfqNo={request.rfq_no}
            loading={false}
            t={t}
            onConfirm={confirmCancel}
            onCancel={() => setOpened(false)}
          />
        </>
      );
    }

    await render(<Harness />);
    const cancelButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('quotationRequests.cancel'));
    expect(cancelButton).toBeTruthy();

    await act(async () => {
      cancelButton?.click();
    });

    expect(confirmCancel).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('quotationRequests.cancelConfirmMessage:RFQ-2026-018');

    const confirmButton = Array.from(dialog?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes('quotationRequests.cancel'));
    await act(async () => {
      confirmButton?.click();
    });

    expect(confirmCancel).toHaveBeenCalledTimes(1);
  });

  it('shows an action error and disables dismissal while loading', async () => {
    await render(
      <RfqCancelConfirmModal
        opened
        rfqNo="RFQ-2026-019"
        error="Network unavailable"
        loading
        t={t}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Network unavailable');
    const buttons = Array.from(dialog?.querySelectorAll('button') ?? []);
    expect(buttons.some((button) => button.disabled)).toBe(true);
  });
});

