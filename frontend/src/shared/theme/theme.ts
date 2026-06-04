import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';
import { rem } from '@mantine/core';
import { colorPresets, defaultColorPresetId } from './colorPresets';
import { eventThemes, defaultEventThemeId } from './eventThemes';
import type { ColorPresetId } from './colorPresets';
import type { EventThemeId } from './eventThemes';

const baseThemeOptions = {
  fontFamily:
    '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  headings: {
    fontFamily:
      '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
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

export function buildTheme(colorPresetId?: ColorPresetId, eventThemeId?: EventThemeId) {
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;

  const preset = colorPresets[presetId];
  const event = eventThemes[eventId];

  // Event theme can override the color preset (except 'none' which uses the user's preset)
  const effectivePreset = eventId !== 'none' && event.colorPresetId !== presetId
    ? colorPresets[event.colorPresetId]
    : preset;

  // Build light and dark color tuples
  const lightColors = [...effectivePreset.colors.light];
  const darkColors = [...effectivePreset.colors.dark];

  // Apply event accent override if present
  if (event.accentOverride) {
    if (event.accentOverride.primaryLight) {
      lightColors[6] = event.accentOverride.primaryLight;
    }
    if (event.accentOverride.primaryDark) {
      darkColors[7] = event.accentOverride.primaryDark;
    }
  }

  const primaryColor = effectivePreset.primaryColor;

  return createTheme({
    ...baseThemeOptions,
    primaryColor,
    colors: {
      [primaryColor]: toTuple(lightColors),
    },
  });
}

export function buildCssVariablesResolver(
  colorPresetId?: ColorPresetId,
  eventThemeId?: EventThemeId,
) {
  const presetId = colorPresetId ?? defaultColorPresetId;
  const eventId = eventThemeId ?? defaultEventThemeId;
  const preset = colorPresets[presetId];
  const event = eventThemes[eventId];
  const effectivePreset = eventId !== 'none' && event.colorPresetId !== presetId
    ? colorPresets[event.colorPresetId]
    : preset;

  const lightColors = [...effectivePreset.colors.light];
  const darkColors = [...effectivePreset.colors.dark];

  if (event.accentOverride) {
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

export const theme = buildTheme();
