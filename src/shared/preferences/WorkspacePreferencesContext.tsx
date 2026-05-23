import { useMantineColorScheme } from '@mantine/core';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WorkspaceLanguage = 'vi' | 'en';
export type AppearanceMode = 'light' | 'dark' | 'auto';
export type ResolvedColorScheme = 'light' | 'dark';
export type VisualTheme = 'standard' | 'high-contrast' | 'blue-sight' | 'yellow-sight';
export type DensityPreference = 'standard' | 'compact';

type WorkspacePreferencesContextValue = {
  appearanceMode: AppearanceMode;
  density: DensityPreference;
  language: WorkspaceLanguage;
  resolvedColorScheme: ResolvedColorScheme;
  setAppearanceMode: (appearanceMode: AppearanceMode) => void;
  setDensity: (density: DensityPreference) => void;
  setLanguage: (language: WorkspaceLanguage) => void;
  setVisualTheme: (visualTheme: VisualTheme) => void;
  visualTheme: VisualTheme;
};

const LANGUAGE_STORAGE_KEY = 'kbfe.preferences.language';
const APPEARANCE_MODE_STORAGE_KEY = 'kbfe.preferences.appearance-mode';
const VISUAL_THEME_STORAGE_KEY = 'kbfe.preferences.visual-theme';
const DENSITY_STORAGE_KEY = 'kbfe.preferences.density';
const LEGACY_EVENT_THEME_STORAGE_KEY = 'kbfe.preferences.event-theme';

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

export function WorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  const [language, setLanguageState] = useState<WorkspaceLanguage>(readStoredLanguage);
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(readStoredAppearanceMode);
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(readStoredVisualTheme);
  const [density, setDensityState] = useState<DensityPreference>(readStoredDensity);
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
  }, [appearanceMode, density, language, resolvedColorScheme, visualTheme]);

  useEffect(() => {
    setColorScheme(appearanceMode);
  }, [appearanceMode, setColorScheme]);

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

  const value = useMemo(
    () => ({
      appearanceMode,
      density,
      language,
      resolvedColorScheme,
      setAppearanceMode,
      setDensity,
      setLanguage,
      setVisualTheme,
      visualTheme,
    }),
    [appearanceMode, density, language, resolvedColorScheme, visualTheme],
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
