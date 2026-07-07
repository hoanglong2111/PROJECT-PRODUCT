/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderLineItemsEditor } from '../OrderLineItemsEditor';
import { newOrderLine } from '../types';

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const line = newOrderLine(0);

const baseProps = {
  lines: [line],
  activeId: line.clientId,
  onActiveChange: vi.fn(),
  onChange: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  items: [],
  itemOptions: [],
};

function unitInput(container: HTMLElement): HTMLInputElement | null {
  const label = Array.from(container.querySelectorAll('label')).find(
    (node) => node.textContent === 'forms.unit',
  );
  const id = label?.getAttribute('for');
  return id ? (container.querySelector(`#${id}`) as HTMLInputElement | null) : null;
}

describe('OrderLineItemsEditor unit field', () => {
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
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(<MantineProvider>{ui}</MantineProvider>);
    });
  }

  it('renders the unit field as a Select when unitOptions is provided', async () => {
    await render(
      <OrderLineItemsEditor {...baseProps} unitOptions={[{ value: 'CTN', label: 'CTN - Carton' }]} />,
    );
    expect(unitInput(container)?.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('renders the unit field as a plain TextInput when unitOptions is absent', async () => {
    await render(<OrderLineItemsEditor {...baseProps} />);
    expect(unitInput(container)?.getAttribute('aria-haspopup')).toBeNull();
  });
});
