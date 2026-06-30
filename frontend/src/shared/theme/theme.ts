import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';
import { rem } from '@mantine/core';
import { colorPresets, defaultColorPresetId } from './colorPresets';
import { eventThemes, defaultEventThemeId } from './eventThemes';
import type { ColorPresetId } from './colorPresets';
import type { EventThemeId } from './eventThemes';

const baseThemeOptions = {
  fontFamily:
    '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace:
    '"Geist Mono Variable", ui-monospace, SFMono-Regular, monospace',
  headings: {
    fontFamily:
      '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
    fontWeight: '600' as const,
  },
  defaultRadius: 'md',
  // Auto-pick black/white text on filled controls by luminance, so light status
  // fills (yellow/teal channel badges, "due today" delay badge, etc.) stop
  // rendering unreadable white-on-light text. Primary filled text still follows
  // our explicit --mantine-primary-color-contrast override in theme.css.
  autoContrast: true,
  luminanceThreshold: 0.3,
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: rem(8),
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius: rem(8),
      },
    },
  },
};

function toTuple(arr: readonly string[]): MantineColorsTuple {
  return arr as unknown as MantineColorsTuple;
}

function buildColorVariables(
  colors: readonly string[],
  colorName: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < colors.length; i++) {
    result[`--mantine-color-${colorName}-${i}`] = colors[i];
  }
  
  // Override Mantine's variant variables for the primary color palette
  // so components that specifically reference this color name (e.g., Button)
  // use our custom theme tokens instead of Mantine's auto-generated ones.
  result[`--mantine-color-${colorName}-filled`] = 'var(--kbfe-primary-color)';
  result[`--mantine-color-${colorName}-filled-hover`] = 'color-mix(in srgb, var(--kbfe-primary-color) 88%, #000000 12%)';
  result[`--mantine-color-${colorName}-contrast`] = 'var(--kbfe-primary-contrast)';
  result[`--mantine-color-${colorName}-light`] = 'color-mix(in srgb, var(--kbfe-primary-color) 12%, transparent)';
  result[`--mantine-color-${colorName}-light-hover`] = 'color-mix(in srgb, var(--kbfe-primary-color) 18%, transparent)';
  // Accent TEXT colours (light-variant label, outline label/border). The raw
  // primary is unreadable as text on a light surface for bright presets
  // (amber/sunset gold ≈ 2.3:1 — e.g. the active NavLink). Mix toward the theme
  // text colour so it stays legible in every preset and scheme while keeping the
  // hue. Filled/tint backgrounds above keep the pure primary.
  result[`--mantine-color-${colorName}-light-color`] =
    'color-mix(in srgb, var(--kbfe-primary-color) 68%, var(--kbfe-text-primary))';
  result[`--mantine-color-${colorName}-outline`] =
    'color-mix(in srgb, var(--kbfe-primary-color) 68%, var(--kbfe-text-primary))';
  result[`--mantine-color-${colorName}-outline-hover`] = 'color-mix(in srgb, var(--kbfe-primary-color) 8%, transparent)';

  return result;
}

export function getEffectivePresetId(
  colorPresetId?: ColorPresetId,
  eventThemeId?: EventThemeId,
): ColorPresetId {
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;
  const event = eventThemes[eventId] ?? eventThemes[defaultEventThemeId];
  const resolvedEventId = event ? event.id : defaultEventThemeId;
  const eventPresetId = event ? event.colorPresetId : defaultColorPresetId;

  return resolvedEventId !== 'none' && eventPresetId !== presetId
    ? eventPresetId
    : presetId;
}

export function getEffectivePalette(
  colorPresetId: ColorPresetId,
  eventThemeId: EventThemeId,
  scheme: 'light' | 'dark',
): string[] {
  const effectivePresetId = getEffectivePresetId(colorPresetId, eventThemeId);
  const effectivePreset = colorPresets[effectivePresetId] ?? colorPresets[defaultColorPresetId];
  const event = eventThemes[eventThemeId] ?? eventThemes[defaultEventThemeId];

  const colors = [...effectivePreset.colors[scheme]];

  if (event && event.accentOverride) {
    if (scheme === 'light' && event.accentOverride.primaryLight) {
      colors[6] = event.accentOverride.primaryLight;
    } else if (scheme === 'dark' && event.accentOverride.primaryDark) {
      colors[7] = event.accentOverride.primaryDark;
    }
  }

  return colors;
}

export function buildTheme(
  colorPresetId?: ColorPresetId,
  eventThemeId?: EventThemeId,
) {
  const effectivePresetId = getEffectivePresetId(colorPresetId, eventThemeId);
  const effectivePreset = colorPresets[effectivePresetId] ?? colorPresets[defaultColorPresetId];
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;

  // Build colors tuple (always use light palette as the base Mantine theme)
  const colors = getEffectivePalette(presetId, eventId, 'light');

  const primaryColor = effectivePreset.primaryColor;

  return createTheme({
    ...baseThemeOptions,
    primaryColor,
    colors: {
      [primaryColor]: toTuple(colors),
    },
  });
}

export function buildCssVariablesResolver(
  colorPresetId?: ColorPresetId,
  eventThemeId?: EventThemeId,
) {
  const effectivePresetId = getEffectivePresetId(colorPresetId, eventThemeId);
  const effectivePreset = colorPresets[effectivePresetId] ?? colorPresets[defaultColorPresetId];
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;

  const lightColors = getEffectivePalette(presetId, eventId, 'light');
  const darkColors = getEffectivePalette(presetId, eventId, 'dark');

  const primaryColor = effectivePreset.primaryColor;

  return () => ({
    variables: {
      '--mantine-primary-color-filled': 'var(--kbfe-primary-color)',
      '--mantine-primary-color-filled-hover':
        'color-mix(in srgb, var(--kbfe-primary-color) 88%, #000000 12%)',
      '--mantine-primary-color-contrast': 'var(--kbfe-primary-contrast)',
      '--mantine-primary-color-light': 'color-mix(in srgb, var(--kbfe-primary-color) 12%, transparent)',
      '--mantine-primary-color-light-hover': 'color-mix(in srgb, var(--kbfe-primary-color) 18%, transparent)',
      '--mantine-primary-color-light-color': 'var(--kbfe-primary-color)',
    },
    light: buildColorVariables(lightColors, primaryColor),
    dark: buildColorVariables(darkColors, primaryColor),
  });
}

