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
  return result;
}

export function buildTheme(
  colorPresetId?: ColorPresetId,
  eventThemeId?: EventThemeId,
) {
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;

  const preset = colorPresets[presetId] ?? colorPresets[defaultColorPresetId];
  const event = eventThemes[eventId] ?? eventThemes[defaultEventThemeId];
  const resolvedEventId = event ? event.id : defaultEventThemeId;

  const eventPresetId = event ? event.colorPresetId : defaultColorPresetId;
  const eventPreset = colorPresets[eventPresetId] ?? colorPresets[defaultColorPresetId];

  // Event theme can override the color preset (except 'none' which uses the user's preset)
  const effectivePreset = resolvedEventId !== 'none' && eventPresetId !== presetId
    ? eventPreset
    : preset;

  // Build colors tuple (always use light palette as the base Mantine theme)
  const baseColors = effectivePreset.colors.light;
  const colors = [...baseColors];

  // Apply event accent override if present (using light override since this is the base palette)
  if (event && event.accentOverride && event.accentOverride.primaryLight) {
    colors[6] = event.accentOverride.primaryLight;
  }

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
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;
  const preset = colorPresets[presetId] ?? colorPresets[defaultColorPresetId];
  const event = eventThemes[eventId] ?? eventThemes[defaultEventThemeId];
  const resolvedEventId = event ? event.id : defaultEventThemeId;

  const eventPresetId = event ? event.colorPresetId : defaultColorPresetId;
  const eventPreset = colorPresets[eventPresetId] ?? colorPresets[defaultColorPresetId];

  const effectivePreset = resolvedEventId !== 'none' && eventPresetId !== presetId
    ? eventPreset
    : preset;

  const lightColors = [...effectivePreset.colors.light];
  const darkColors = [...effectivePreset.colors.dark];

  if (event && event.accentOverride) {
    if (event.accentOverride.primaryLight) {
      lightColors[6] = event.accentOverride.primaryLight;
    }
    if (event.accentOverride.primaryDark) {
      darkColors[7] = event.accentOverride.primaryDark;
    }
  }

  const primaryColor = effectivePreset.primaryColor;

  return () => ({
    variables: {
      '--mantine-primary-color-filled': 'var(--kbfe-primary-color)',
      '--mantine-primary-color-filled-hover':
        'color-mix(in srgb, var(--kbfe-primary-color) 88%, #000000 12%)',
    },
    light: buildColorVariables(lightColors, primaryColor),
    dark: buildColorVariables(darkColors, primaryColor),
  });
}
