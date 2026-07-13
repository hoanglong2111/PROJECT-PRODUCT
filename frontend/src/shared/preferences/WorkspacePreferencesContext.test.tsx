import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspacePreferences, WorkspacePreferencesProvider } from './WorkspacePreferencesContext';
import type { FineTuneLevel } from './fineTune';

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

afterEach(() => {
  document.documentElement.removeAttribute('data-kbfe-color-intensity');
  document.documentElement.removeAttribute('data-kbfe-dim-level');
  document.documentElement.removeAttribute('data-kbfe-contrast-level');
  document.documentElement.removeAttribute('data-kbfe-transparency');
});

describe('Fine Tune preferences', () => {
  it('migrates the legacy aggregate level and transparency before rendering', async () => {
    window.localStorage.setItem('kbfe.preferences.fine-tune-level', 'extra-high');
    window.localStorage.setItem('kbfe.preferences.surface-transparency', 'reduced');
    const host = document.createElement('div');
    const root = createRoot(host);
    function Probe() {
      const p = useWorkspacePreferences();
      return <span>{p.colorIntensityLevel}/{p.dimLevel}/{p.contrastLevel}/{p.surfaceTransparency}</span>;
    }
    await act(async () => root.render(<WorkspacePreferencesProvider><Probe /></WorkspacePreferencesProvider>));
    expect(host.textContent).toBe('extra-high/light/light/low');
    expect(window.localStorage.getItem('kbfe.preferences.color-intensity-level')).toBe('extra-high');
    expect(window.localStorage.getItem('kbfe.preferences.surface-transparency')).toBe('low');
    await act(async () => root.unmount());
  });

  it('updates each selector independently and persists it', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    let setters: undefined | Record<string, (level: FineTuneLevel) => void>;
    function Probe() {
      const p = useWorkspacePreferences();
      setters = { color: p.setColorIntensityLevel, dim: p.setDimLevel, contrast: p.setContrastLevel };
      return <span>{p.colorIntensityLevel}/{p.dimLevel}/{p.contrastLevel}</span>;
    }
    await act(async () => root.render(<WorkspacePreferencesProvider><Probe /></WorkspacePreferencesProvider>));
    await act(async () => setters?.color('ultra'));
    expect(host.textContent).toBe('ultra/light/light');
    await act(async () => setters?.dim('high'));
    expect(host.textContent).toBe('ultra/high/light');
    await act(async () => setters?.contrast('max'));
    expect(host.textContent).toBe('ultra/high/max');
    expect(window.localStorage.getItem('kbfe.preferences.color-intensity-level')).toBe('ultra');
    expect(document.documentElement.dataset.kbfeContrastLevel).toBe('max');
    await act(async () => root.unmount());
  });
});
