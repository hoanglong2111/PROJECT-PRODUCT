import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ColorPresetId } from '@shared/theme/colorPresets';
import { defaultColorPresetId } from '@shared/theme/colorPresets';

export type { ColorPresetId };
export type WorkspaceLanguage = 'vi' | 'en';
export type AppearanceMode = 'light' | 'dark' | 'auto';
export type ResolvedColorScheme = 'light' | 'dark';
export type VisualTheme = 'standard' | 'high-contrast' | 'eye-comfort';
export type DensityPreference = 'standard' | 'compact';

type WorkspacePreferencesContextValue = {
  appearanceMode: AppearanceMode;
  colorIntensity: number;
  colorPreset: ColorPresetId;
  contrastLevel: number;
  density: DensityPreference;
  dimLevel: number;
  language: WorkspaceLanguage;
  resetFineTune: () => void;
  resolvedColorScheme: ResolvedColorScheme;
  sidebarCollapsed: boolean;
  setAppearanceMode: (appearanceMode: AppearanceMode) => void;
  setColorIntensity: (value: number) => void;
  setColorPreset: (preset: ColorPresetId) => void;
  setContrastLevel: (value: number) => void;
  setDensity: (density: DensityPreference) => void;
  setDimLevel: (value: number) => void;
  setLanguage: (language: WorkspaceLanguage) => void;
  setVisualTheme: (visualTheme: VisualTheme) => void;
  toggleSidebar: () => void;
  visualTheme: VisualTheme;
};

const LANGUAGE_STORAGE_KEY = 'kbfe.preferences.language';
const APPEARANCE_MODE_STORAGE_KEY = 'kbfe.preferences.appearance-mode';
const VISUAL_THEME_STORAGE_KEY = 'kbfe.preferences.visual-theme';
const DENSITY_STORAGE_KEY = 'kbfe.preferences.density';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'kbfe.preferences.sidebar-collapsed';
const COLOR_PRESET_STORAGE_KEY = 'kbfe.preferences.color-preset';
const LEGACY_EVENT_THEME_STORAGE_KEY = 'kbfe.preferences.event-theme-legacy';
const DIM_LEVEL_STORAGE_KEY = 'kbfe.preferences.dim-level';

const FINE_TUNE_DEFAULTS = {
  colorIntensity: 100,
  contrastLevel: 100,
  dimLevel: 0,
} as const;

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
  if (value === 'high-contrast' || value === 'eye-comfort') {
    return value;
  }
  if (value === 'blue-sight' || value === 'yellow-sight') {
    return 'eye-comfort';
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

  return 'standard';
}

function readStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
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

function readStoredFineTune(key: string, fallback: number): number {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = Number(window.localStorage.getItem(key));
  if (Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, value));
}

if (typeof window !== 'undefined') {
  // One-time cleanup of removed preferences (event theme, persisted fine-tune values).
  window.localStorage.removeItem('kbfe.preferences.event-theme');
  window.localStorage.removeItem(LEGACY_EVENT_THEME_STORAGE_KEY);
  window.localStorage.removeItem('kbfe.preferences.color-intensity');
  window.localStorage.removeItem('kbfe.preferences.contrast-level');
}

export function WorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<WorkspaceLanguage>(readStoredLanguage);
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(readStoredAppearanceMode);
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(readStoredVisualTheme);
  const [density, setDensityState] = useState<DensityPreference>(readStoredDensity);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(readStoredSidebarCollapsed);
  const [colorPreset, setColorPresetState] = useState<ColorPresetId>(readStoredColorPreset);
  // Contrast/color-intensity always start at full strength on every load/login —
  // they are session-only and never restored from a previous visit.
  const [colorIntensity, setColorIntensityState] = useState<number>(FINE_TUNE_DEFAULTS.colorIntensity);
  const [dimLevel, setDimLevelState] = useState<number>(() =>
    readStoredFineTune(DIM_LEVEL_STORAGE_KEY, FINE_TUNE_DEFAULTS.dimLevel),
  );
  const [contrastLevel, setContrastLevelState] = useState<number>(FINE_TUNE_DEFAULTS.contrastLevel);
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
    document.documentElement.style.setProperty('--kbfe-user-intensity', String(colorIntensity / 100));
    document.documentElement.style.setProperty('--kbfe-user-dim', String(dimLevel / 100));
    document.documentElement.style.setProperty('--kbfe-user-contrast', String(contrastLevel / 100));
  }, [
    appearanceMode,
    colorIntensity,
    colorPreset,
    contrastLevel,
    density,
    dimLevel,
    language,
    resolvedColorScheme,
    visualTheme,
  ]);

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

  const toggleSidebar = () => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsedState(nextCollapsed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    }
  };

  const setColorPreset = (nextPreset: ColorPresetId) => {
    setColorPresetState(nextPreset);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLOR_PRESET_STORAGE_KEY, nextPreset);
    }
  };

  const setColorIntensity = (nextValue: number) => {
    const clamped = Math.min(100, Math.max(0, nextValue));
    setColorIntensityState(clamped);
  };

  const setDimLevel = (nextValue: number) => {
    const clamped = Math.min(100, Math.max(0, nextValue));
    setDimLevelState(clamped);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DIM_LEVEL_STORAGE_KEY, String(clamped));
    }
  };

  const setContrastLevel = (nextValue: number) => {
    const clamped = Math.min(100, Math.max(0, nextValue));
    setContrastLevelState(clamped);
  };

  const resetFineTune = () => {
    setColorIntensity(FINE_TUNE_DEFAULTS.colorIntensity);
    setDimLevel(FINE_TUNE_DEFAULTS.dimLevel);
    setContrastLevel(FINE_TUNE_DEFAULTS.contrastLevel);
  };

  const value = useMemo(
    () => ({
      appearanceMode,
      colorIntensity,
      colorPreset,
      contrastLevel,
      density,
      dimLevel,
      language,
      resetFineTune,
      resolvedColorScheme,
      sidebarCollapsed,
      setAppearanceMode,
      setColorIntensity,
      setColorPreset,
      setContrastLevel,
      setDensity,
      setDimLevel,
      setLanguage,
      setVisualTheme,
      toggleSidebar,
      visualTheme,
    }),
    [
      appearanceMode,
      colorIntensity,
      colorPreset,
      contrastLevel,
      density,
      dimLevel,
      language,
      resolvedColorScheme,
      sidebarCollapsed,
      visualTheme,
    ],
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
