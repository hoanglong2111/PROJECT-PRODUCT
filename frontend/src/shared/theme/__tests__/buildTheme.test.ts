import { describe, expect, it } from 'vitest';
import { buildTheme, buildCssVariablesResolver, getEffectivePalette } from '../theme';
import { colorPresets } from '../colorPresets';

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

  it('all 9 color presets produce valid themes', () => {
    const presetIds = Object.keys(colorPresets) as Array<keyof typeof colorPresets>;
    for (const presetId of presetIds) {
      const theme = buildTheme(presetId);
      expect(theme).toBeDefined();
      expect(theme.primaryColor).toBe(colorPresets[presetId].primaryColor);
    }
  });

  it('falls back safely for invalid preset IDs', () => {
    const theme = buildTheme('invalid-preset' as any);
    expect(theme).toBeDefined();
    expect(theme.primaryColor).toBe('teal');
  });
});

describe('buildCssVariablesResolver', () => {
  it('returns a function', () => {
    const resolver = buildCssVariablesResolver('teal');
    expect(typeof resolver).toBe('function');
  });

  it('returns variables with --mantine-primary-color-filled', () => {
    const resolver = buildCssVariablesResolver('rose');
    const result = resolver();
    expect(result.variables['--mantine-primary-color-filled']).toBe('var(--kbfe-primary-color)');
  });

  it('returns light and dark color mappings', () => {
    const resolver = buildCssVariablesResolver('ocean');
    const result = resolver();
    // Each scheme maps the 10 palette shades (--mantine-color-<name>-0..9), plus a
    // handful of primary-variant overrides (-filled/-contrast/-light/-outline...).
    const shadeKeys = (vars: Record<string, string>) =>
      Object.keys(vars).filter((key) => /-\d$/.test(key));
    expect(shadeKeys(result.light).length).toBe(10);
    expect(shadeKeys(result.dark).length).toBe(10);
  });

  it('dark mode uses dark tuple colors', () => {
    const resolver = buildCssVariablesResolver('teal');
    const result = resolver();
    // Dark tuple index 0 for teal is #1d4044
    expect(result.dark['--mantine-color-teal-0']).toBe('#1d4044');
  });

  it('falls back safely for invalid preset IDs', () => {
    const resolver = buildCssVariablesResolver('invalid-preset' as any);
    const result = resolver();
    expect(result.light).toBeDefined();
    expect(result.dark).toBeDefined();
  });
});

describe('getEffectivePalette', () => {
  it('returns preset light colors', () => {
    expect(getEffectivePalette('teal', 'light')).toEqual(colorPresets.teal.colors.light);
  });

  it('returns preset dark colors', () => {
    expect(getEffectivePalette('teal', 'dark')).toEqual(colorPresets.teal.colors.dark);
  });
});
