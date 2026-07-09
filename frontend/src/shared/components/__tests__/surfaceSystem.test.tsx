/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmptyState } from '../EmptyState';
import { Metric } from '../Metric';
import { PageError } from '../PageFeedback';

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('ambient surface system adoption', () => {
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
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(<MantineProvider>{ui}</MantineProvider>);
    });
  }

  it('maps Metric colors to the emphasis tier with the right semantic tone', async () => {
    const cases: Array<[string, string]> = [
      ['blue', 'blue'],
      ['teal', 'teal'],
      ['orange', 'orange'],
      ['red', 'red'],
      ['gray', 'gray'],
    ];

    for (const [color, expectedTone] of cases) {
      await render(<Metric label="X" value={1} color={color} />);
      const card = container.querySelector('.metric-card');
      expect(card?.classList.contains('kbfe-surface-wash')).toBe(true);
      expect(card?.classList.contains('kbfe-surface-wash--emphasis')).toBe(true);
      expect(card?.getAttribute('data-surface-tone')).toBe(expectedTone);
    }
  });

  it('passes an unknown Metric color straight through (CSS falls back to primary)', async () => {
    await render(<Metric label="X" value={1} color="chartreuse" />);
    const card = container.querySelector('.metric-card');
    // No semantic tone rule matches → --kbfe-surface-accent stays primary.
    expect(card?.getAttribute('data-surface-tone')).toBe('chartreuse');
  });

  it('never gives a skeleton-style neutral Metric a semantic emphasis tone', async () => {
    await render(<Metric label="X" value={0} color="gray" />);
    const card = container.querySelector('.metric-card');
    expect(card?.getAttribute('data-surface-tone')).toBe('gray');
  });

  it('renders a standalone EmptyState as a soft surface but a nested one flat', async () => {
    await render(<EmptyState title="t" description="d" standalone />);
    let empty = container.querySelector('.empty-state');
    expect(empty?.classList.contains('kbfe-surface-wash--soft')).toBe(true);
    expect(empty?.classList.contains('empty-state--standalone')).toBe(true);

    await render(<EmptyState title="t" description="d" />);
    empty = container.querySelector('.empty-state');
    expect(empty?.classList.contains('kbfe-surface-wash')).toBe(false);
    expect(empty?.classList.contains('empty-state--standalone')).toBe(false);
  });

  it('gives PageError a danger-toned soft surface', async () => {
    await render(<PageError title="t" description="d" />);
    const panel = container.querySelector('.page-state-panel-error');
    expect(panel?.classList.contains('kbfe-surface-wash--soft')).toBe(true);
    expect(panel?.getAttribute('data-surface-tone')).toBe('danger');
  });
});
