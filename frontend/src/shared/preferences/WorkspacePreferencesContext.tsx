import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserPreferences, updateUserPreferences, type UserPreferences } from '@shared/api/preferences';
import { AUTH_TOKEN_STORAGE_KEY } from '@shared/api/http';
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

  // ---------------------------------------------------------------------------
  // Server sync via TanStack Query
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();

  // Fetch preferences from backend on mount
  // Determine if an auth token is present. If not, skip fetching preferences to avoid 401 errors.
  const authToken = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;

  const { data: serverPrefs, isLoading: isFetchingPrefs } = useQuery<UserPreferences>({
    queryKey: ['userPreferences'],
    queryFn: fetchUserPreferences,
    staleTime: Infinity,
    // Do not retry on 401/403 – let UI handle auth errors elsewhere
    retry: false,
    enabled: Boolean(authToken),
  });

  // Update backend when preferences change (after initial load)
  const { mutate: mutatePrefs } = useMutation<UserPreferences, Error, UserPreferences>({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      // Keep query cache in sync
      queryClient.setQueryData(['userPreferences'], data);
    },
  });

  // Sync server preferences to local state once fetched
  useEffect(() => {
    if (!serverPrefs) return;
    // Update state and localStorage to match server values
    setLanguageState(serverPrefs.language as WorkspaceLanguage);
    setAppearanceModeState(serverPrefs.appearanceMode as AppearanceMode);
    setVisualThemeState(serverPrefs.visualTheme as VisualTheme);
    setDensityState(serverPrefs.density as DensityPreference);
    setColorPresetState(serverPrefs.colorPreset as ColorPresetId);
    setEventThemeState(serverPrefs.eventTheme as EventThemeId);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, serverPrefs.language);
      window.localStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, serverPrefs.appearanceMode);
      window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, serverPrefs.visualTheme);
      window.localStorage.setItem(DENSITY_STORAGE_KEY, serverPrefs.density);
      window.localStorage.setItem(COLOR_PRESET_STORAGE_KEY, serverPrefs.colorPreset);
      window.localStorage.setItem(EVENT_THEME_STORAGE_KEY, serverPrefs.eventTheme);
    }
  }, [serverPrefs]);

  // Persist any local changes back to the server (skip during initial fetch)
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Wait until server preferences have been loaded at least once
    if (!hasInitialized.current && serverPrefs) {
      hasInitialized.current = true;
      return; // Do not sync back immediately after initial load
    }
    if (!hasInitialized.current) return; // Still waiting for initial load

    // Only send an update if the local state differs from the server version
    const differs =
      serverPrefs &&
      (colorPreset !== serverPrefs.colorPreset ||
        eventTheme !== serverPrefs.eventTheme ||
        visualTheme !== serverPrefs.visualTheme ||
        density !== serverPrefs.density ||
        appearanceMode !== serverPrefs.appearanceMode ||
        language !== serverPrefs.language);

    if (!differs) return;

    const updated = {
      colorPreset,
      eventTheme,
      visualTheme,
      density,
      appearanceMode,
      language,
    };
    mutatePrefs(updated);
  }, [colorPreset, eventTheme, visualTheme, density, appearanceMode, language, serverPrefs]);

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
