/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AnchoredWorkflowRail,
  useAnchoredWorkflowSections,
  type AnchoredWorkflowStep,
} from '../AnchoredWorkflow';

const steps: AnchoredWorkflowStep[] = [
  { id: 'first-section', label: 'First', description: 'Initial details' },
  { id: 'second-section', label: 'Second', description: 'Review details' },
];

function Demo() {
  const { activeSectionId, scrollToSection } = useAnchoredWorkflowSections(steps.map((step) => step.id));

  return (
    <div>
      <AnchoredWorkflowRail
        activeStepId={activeSectionId}
        steps={steps}
        title="Workflow"
        onStepSelect={scrollToSection}
      />
      <section id="first-section">First section</section>
      <section id="second-section">Second section</section>
    </div>
  );
}

describe('AnchoredWorkflow', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    window.cancelAnimationFrame = vi.fn();
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
    vi.restoreAllMocks();
  });

  async function render() {
    await act(async () => {
      root.render(
        <MantineProvider>
          <Demo />
        </MantineProvider>,
      );
    });
  }

  it('scrolls to the selected section and marks it active', async () => {
    await render();

    const secondSection = container.querySelector('#second-section') as HTMLElement;
    secondSection.getBoundingClientRect = vi.fn(() => ({
      bottom: 440,
      height: 240,
      left: 0,
      right: 800,
      top: 200,
      width: 800,
      x: 0,
      y: 200,
      toJSON: () => undefined,
    }));
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons[0].getAttribute('aria-current')).toBe('step');

    await act(async () => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 288 });
    expect(buttons[1].getAttribute('aria-current')).toBe('step');
  });
});
