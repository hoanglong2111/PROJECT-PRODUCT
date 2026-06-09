import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ColorPresetId } from '@shared/theme/colorPresets';
import { defaultColorPresetId } from '@shared/theme/colorPresets';
import { defaultEventThemeId, getAutoEventTheme } from '@shared/theme/eventThemes';
import type { EventThemeId } from '@shared/theme/eventThemes';

export type { ColorPresetId, EventThemeId };
export type WorkspaceLanguage = 'vi' | 'en';
export type AppearanceMode = 'light' | 'dark' | 'auto';
export type ResolvedColorScheme = 'light' | 'dark';
export type VisualTheme = 'standard' | 'high-contrast' | 'blue-sight' | 'yellow-sight';
export type DensityPreference = 'standard' | 'compact';

type WorkspacePreferencesContextValue = {
  appearanceMode: AppearanceMode;
  colorPreset: ColorPresetId;
  density: DensityPreference;
  eventTheme: EventThemeId;
  language: WorkspaceLanguage;
  resolvedColorScheme: ResolvedColorScheme;
  setAppearanceMode: (appearanceMode: AppearanceMode) => void;
  setColorPreset: (preset: ColorPresetId) => void;
  setDensity: (density: DensityPreference) => void;
  setEventTheme: (theme: EventThemeId) => void;
  setLanguage: (language: WorkspaceLanguage) => void;
  setVisualTheme: (visualTheme: VisualTheme) => void;
  visualTheme: VisualTheme;
};

const LANGUAGE_STORAGE_KEY = 'kbfe.preferences.language';
const APPEARANCE_MODE_STORAGE_KEY = 'kbfe.preferences.appearance-mode';
const VISUAL_THEME_STORAGE_KEY = 'kbfe.preferences.visual-theme';
const DENSITY_STORAGE_KEY = 'kbfe.preferences.density';
const COLOR_PRESET_STORAGE_KEY = 'kbfe.preferences.color-preset';
const EVENT_THEME_STORAGE_KEY = 'kbfe.preferences.event-theme';
const LEGACY_EVENT_THEME_STORAGE_KEY = 'kbfe.preferences.event-theme-legacy';

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | undefined>(undefined);

function getSystemColorScheme(): ResolvedColorScheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredLanguage(): WorkspaceLanguage {
  if (typeof window === 'undefined') {
    return 'vi';
  }

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'vi';
}

function readStoredAppearanceMode(): AppearanceMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const value = window.localStorage.getItem(APPEARANCE_MODE_STORAGE_KEY);
  return value === 'dark' || value === 'auto' ? value : 'light';
}

function readStoredVisualTheme(): VisualTheme {
  if (typeof window === 'undefined') {
    return 'standard';
  }

  const value = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
  if (value === 'high-contrast' || value === 'blue-sight' || value === 'yellow-sight') {
    return value;
  }

  const legacyValue = window.localStorage.getItem(LEGACY_EVENT_THEME_STORAGE_KEY);
  if (legacyValue === 'high-contrast') {
    return 'high-contrast';
  }
  if (legacyValue === 'night-shift') {
    return 'blue-sight';
  }

  return 'standard';
}

function readStoredDensity(): DensityPreference {
  if (typeof window === 'undefined') {
    return 'standard';
  }

  const value = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  if (value === 'compact') {
    return value;
  }

  const legacyValue = window.localStorage.getItem(LEGACY_EVENT_THEME_STORAGE_KEY);
  if (legacyValue === 'compact') {
    return 'compact';
  }

  return 'standard';
}

const VALID_COLOR_PRESETS: ColorPresetId[] = [
  'teal', 'ocean', 'forest', 'sunset', 'midnight', 'lavender', 'rose', 'amber', 'slate',
];

function readStoredColorPreset(): ColorPresetId {
  if (typeof window === 'undefined') {
    return defaultColorPresetId;
  }

  const value = window.localStorage.getItem(COLOR_PRESET_STORAGE_KEY);
  if (value && VALID_COLOR_PRESETS.includes(value as ColorPresetId)) {
    return value as ColorPresetId;
  }

  return defaultColorPresetId;
}

const VALID_EVENT_THEMES: EventThemeId[] = [
  'none', 'tet', 'valentine', 'mid-autumn', 'christmas', 'new-year', 'halloween', 'womens-day', 'national-day',
];

function readStoredEventTheme(): EventThemeId {
  if (typeof window === 'undefined') {
    return defaultEventThemeId;
  }

  const value = window.localStorage.getItem(EVENT_THEME_STORAGE_KEY);
  if (value && VALID_EVENT_THEMES.includes(value as EventThemeId)) {
    return value as EventThemeId;
  }

  return defaultEventThemeId;
}

export function WorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<WorkspaceLanguage>(readStoredLanguage);
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(readStoredAppearanceMode);
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(readStoredVisualTheme);
  const [density, setDensityState] = useState<DensityPreference>(readStoredDensity);
  const [colorPreset, setColorPresetState] = useState<ColorPresetId>(readStoredColorPreset);
  const [eventTheme, setEventThemeState] = useState<EventThemeId>(readStoredEventTheme);
  const [resolvedColorScheme, setResolvedColorScheme] = useState<ResolvedColorScheme>(() => {
    const storedAppearanceMode = readStoredAppearanceMode();
    return storedAppearanceMode === 'auto' ? getSystemColorScheme() : storedAppearanceMode;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncResolvedScheme = () => {
      setResolvedColorScheme(appearanceMode === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : appearanceMode);
    };

    syncResolvedScheme();
    mediaQuery.addEventListener('change', syncResolvedScheme);

    return () => {
      mediaQuery.removeEventListener('change', syncResolvedScheme);
    };
  }, [appearanceMode]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language === 'vi' ? 'vi-VN' : 'en';
    document.documentElement.dataset.kbfeAppearance = appearanceMode;
    document.documentElement.dataset.kbfeDensity = density;
    document.documentElement.dataset.kbfeResolvedColorScheme = resolvedColorScheme;
    document.documentElement.dataset.kbfeVisualTheme = visualTheme;
    document.documentElement.dataset.kbfeColorPreset = colorPreset;
    document.documentElement.dataset.kbfeEventTheme = eventTheme;
  }, [appearanceMode, colorPreset, density, eventTheme, language, resolvedColorScheme, visualTheme]);

  const setLanguage = (nextLanguage: WorkspaceLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  };

  const setAppearanceMode = (nextAppearanceMode: AppearanceMode) => {
    setAppearanceModeState(nextAppearanceMode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, nextAppearanceMode);
    }
  };

  const setVisualTheme = (nextVisualTheme: VisualTheme) => {
    setVisualThemeState(nextVisualTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, nextVisualTheme);
    }
  };

  const setDensity = (nextDensity: DensityPreference) => {
    setDensityState(nextDensity);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, nextDensity);
    }
  };

  const setColorPreset = (nextPreset: ColorPresetId) => {
    setColorPresetState(nextPreset);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLOR_PRESET_STORAGE_KEY, nextPreset);
    }
  };

  const setEventTheme = (nextTheme: EventThemeId) => {
    setEventThemeState(nextTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EVENT_THEME_STORAGE_KEY, nextTheme);
    }
  };

  const value = useMemo(
    () => ({
      appearanceMode,
      colorPreset,
      density,
      eventTheme,
      language,
      resolvedColorScheme,
      setAppearanceMode,
      setColorPreset,
      setDensity,
      setEventTheme,
      setLanguage,
      setVisualTheme,
      visualTheme,
    }),
    [appearanceMode, colorPreset, density, eventTheme, language, resolvedColorScheme, visualTheme],
  );

  return <WorkspacePreferencesContext.Provider value={value}>{children}</WorkspacePreferencesContext.Provider>;
}

export function useWorkspacePreferences() {
  const context = useContext(WorkspacePreferencesContext);
  if (!context) {
    throw new Error('useWorkspacePreferences must be used inside WorkspacePreferencesProvider');
  }

  return context;
}
