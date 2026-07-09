/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureHeaderShell } from '../FeatureHeaderShell';

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('FeatureHeaderShell', () => {
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

  it('keeps Back outside the hero and preserves its accessible label', async () => {
    const onBack = vi.fn();

    await act(async () => {
      root.render(
        <MantineProvider>
          <FeatureHeaderShell backLabel="Back to list" onBack={onBack}>
            <section className="feature-detail-hero">Hero</section>
          </FeatureHeaderShell>
        </MantineProvider>,
      );
    });

    const hero = container.querySelector('.feature-detail-hero');
    const button = container.querySelector<HTMLButtonElement>('.feature-header-sidecar .kbfe-back-action');

    expect(hero).not.toBeNull();
    expect(button).not.toBeNull();
    expect(hero?.contains(button)).toBe(false);
    expect(button?.textContent).toContain('Back to list');
    expect(container.querySelector('.feature-header-sidecar .kbfe-back-action-label')).not.toBeNull();

    await act(async () => button?.click());
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
