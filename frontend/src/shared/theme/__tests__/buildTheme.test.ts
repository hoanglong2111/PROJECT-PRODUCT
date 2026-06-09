import { describe, expect, it } from 'vitest';
import { buildTheme, buildCssVariablesResolver } from '../theme';
import { colorPresets } from '../colorPresets';
import { eventThemes } from '../eventThemes';

describe('buildTheme', () => {
  it('returns a valid theme with default options', () => {
    const theme = buildTheme();
    expect(theme).toBeDefined();
    expect(theme.primaryColor).toBe('teal');
  });

  it('sets primaryColor to pink for rose preset', () => {
    const theme = buildTheme('rose');
    expect(theme.primaryColor).toBe('pink');
  });

  it('sets primaryColor to blue for ocean preset', () => {
    const theme = buildTheme('ocean');
    expect(theme.primaryColor).toBe('blue');
  });

  it('sets primaryColor to green for forest preset', () => {
    const theme = buildTheme('forest');
    expect(theme.primaryColor).toBe('green');
  });

  it('sets primaryColor to orange for sunset preset', () => {
    const theme = buildTheme('sunset');
    expect(theme.primaryColor).toBe('orange');
  });

  it('sets primaryColor to indigo for midnight preset', () => {
    const theme = buildTheme('midnight');
    expect(theme.primaryColor).toBe('indigo');
  });

  it('sets primaryColor to violet for lavender preset', () => {
    const theme = buildTheme('lavender');
    expect(theme.primaryColor).toBe('violet');
  });

  it('sets primaryColor to yellow for amber preset', () => {
    const theme = buildTheme('amber');
    expect(theme.primaryColor).toBe('yellow');
  });

  it('sets primaryColor to gray for slate preset', () => {
    const theme = buildTheme('slate');
    expect(theme.primaryColor).toBe('gray');
  });

  it('event theme overrides color preset', () => {
    // Tet event uses rose preset (pink)
    const theme = buildTheme('teal', 'tet');
    expect(theme.primaryColor).toBe('pink');
  });

  it('event theme accent override modifies colors', () => {
    const theme = buildTheme('teal', 'tet');
    // Tet has accentOverride.primaryLight that modifies shade 6
    const primaryColor = theme.primaryColor!;
    const colors = (theme.colors as unknown as Record<string, string[]>)[primaryColor];
    expect(colors?.[6]).toBe(eventThemes.tet.accentOverride?.primaryLight);
  });

  it('all 9 color presets produce valid themes', () => {
    const presetIds = Object.keys(colorPresets) as Array<keyof typeof colorPresets>;
    for (const presetId of presetIds) {
      const theme = buildTheme(presetId);
      expect(theme).toBeDefined();
      expect(theme.primaryColor).toBe(colorPresets[presetId].primaryColor);
    }
  });

  it('all 9 event themes produce valid themes', () => {
    const eventIds = Object.keys(eventThemes) as Array<keyof typeof eventThemes>;
    for (const eventId of eventIds) {
      const theme = buildTheme('teal', eventId);
      expect(theme).toBeDefined();
    }
  });

  it('falls back safely for invalid preset or event theme IDs', () => {
    const theme = buildTheme('invalid-preset' as any, 'invalid-event' as any);
    expect(theme).toBeDefined();
    expect(theme.primaryColor).toBe('teal');
  });
});

describe('buildCssVariablesResolver', () => {
  it('returns a function', () => {
    const resolver = buildCssVariablesResolver('teal', 'none');
    expect(typeof resolver).toBe('function');
  });

  it('returns variables with --mantine-primary-color-filled', () => {
    const resolver = buildCssVariablesResolver('rose', 'none');
    const result = resolver();
    expect(result.variables['--mantine-primary-color-filled']).toBe('var(--kbfe-primary-color)');
  });

  it('returns light and dark color mappings', () => {
    const resolver = buildCssVariablesResolver('ocean', 'none');
    const result = resolver();
    expect(Object.keys(result.light).length).toBe(10);
    expect(Object.keys(result.dark).length).toBe(10);
  });

  it('dark mode uses dark tuple colors', () => {
    const resolver = buildCssVariablesResolver('teal', 'none');
    const result = resolver();
    // Dark tuple index 0 for teal is #1d4044
    expect(result.dark['--mantine-color-teal-0']).toBe('#1d4044');
  });

  it('event theme accent override modifies dark shade 7', () => {
    const resolver = buildCssVariablesResolver('teal', 'tet');
    const result = resolver();
    // Tet accentOverride.primaryDark is #fc8181
    expect(result.dark['--mantine-color-pink-7']).toBe('#fc8181');
  });

  it('falls back safely for invalid preset or event theme IDs', () => {
    const resolver = buildCssVariablesResolver('invalid-preset' as any, 'invalid-event' as any);
    const result = resolver();
    expect(result.light).toBeDefined();
    expect(result.dark).toBeDefined();
  });
});
