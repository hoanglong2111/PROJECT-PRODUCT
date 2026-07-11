import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ColorPresetId } from '@shared/theme/colorPresets';
import { defaultColorPresetId } from '@shared/theme/colorPresets';
import { setMoneyLocale } from '@shared/utils/money';
import {
  PROFILE_DEFAULTS,
  inferProfileFromLegacyPreferences,
  isExperienceProfile,
  isProfileCustomized,
  type AdaptivePresentation,
  type ExperienceProfile,
  type SurfaceTransparency,
} from './experienceProfiles';
import {
  DEFAULT_FINE_TUNE_SETTINGS,
  FINE_TUNE_PRESETS_STORAGE_KEY,
  isFineTuneLevel,
  readFineTunePresets,
  validatePresetName,
  type FineTuneLevel,
  type FineTunePreset,
  type FineTuneSettings,
} from './fineTune';

export type { AdaptivePresentation, ExperienceProfile, SurfaceTransparency };
export type { FineTuneLevel, FineTunePreset, FineTuneSettings } from './fineTune';
export type { ColorPresetId };
export type WorkspaceLanguage = 'vi' | 'en';

// BCP 47 locale for a workspace language — the single source of truth the money
// formatter binds to (grouping/decimal separators). vi → vi-VN, en → en-US.
export function localeForLanguage(language: WorkspaceLanguage) {
  return language === 'vi' ? 'vi-VN' : 'en-US';
}
export type AppearanceMode = 'light' | 'dark' | 'auto';
export type ResolvedColorScheme = 'light' | 'dark';
export type VisualTheme = 'standard' | 'high-contrast' | 'eye-comfort';
export type DensityPreference = 'standard' | 'compact';
type WorkspacePreferencesContextValue = {
  appearanceMode: AppearanceMode;
  colorPreset: ColorPresetId;
  density: DensityPreference;
  colorIntensityLevel: FineTuneLevel;
  contrastLevel: FineTuneLevel;
  dimLevel: FineTuneLevel;
  fineTunePresets: FineTunePreset[];
  experienceProfile: ExperienceProfile;
  isProfileCustomized: boolean;
  language: WorkspaceLanguage;
  mobileQuickActionsVisible: boolean;
  presentation: AdaptivePresentation;
  resetFineTune: () => void;
  resolvedColorScheme: ResolvedColorScheme;
  sidebarCollapsed: boolean;
  surfaceTransparency: SurfaceTransparency;
  setAppearanceMode: (appearanceMode: AppearanceMode) => void;
  setExperienceProfile: (profile: ExperienceProfile) => void;
  setSurfaceTransparency: (transparency: SurfaceTransparency) => void;
  setColorPreset: (preset: ColorPresetId) => void;
  setDensity: (density: DensityPreference) => void;
  setColorIntensityLevel: (level: FineTuneLevel) => void;
  setContrastLevel: (level: FineTuneLevel) => void;
  setDimLevel: (level: FineTuneLevel) => void;
  saveFineTunePreset: (name: string) => void;
  applyFineTunePreset: (id: string) => void;
  renameFineTunePreset: (id: string, name: string) => void;
  deleteFineTunePreset: (id: string) => void;
  setLanguage: (language: WorkspaceLanguage) => void;
  setMobileQuickActionsVisible: (visible: boolean) => void;
  setVisualTheme: (visualTheme: VisualTheme) => void;
  toggleSidebar: () => void;
  visualTheme: VisualTheme;
};

const LANGUAGE_STORAGE_KEY = 'kbfe.preferences.language';
const APPEARANCE_MODE_STORAGE_KEY = 'kbfe.preferences.appearance-mode';
const VISUAL_THEME_STORAGE_KEY = 'kbfe.preferences.visual-theme';
const DENSITY_STORAGE_KEY = 'kbfe.preferences.density';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'kbfe.preferences.sidebar-collapsed';
const MOBILE_QUICK_ACTIONS_VISIBLE_STORAGE_KEY = 'kbfe.preferences.mobile-quick-actions-visible';
const COLOR_PRESET_STORAGE_KEY = 'kbfe.preferences.color-preset';
const FINE_TUNE_LEVEL_STORAGE_KEY = 'kbfe.preferences.fine-tune-level';
const COLOR_INTENSITY_STORAGE_KEY = 'kbfe.preferences.color-intensity-level';
const DIM_LEVEL_STORAGE_KEY = 'kbfe.preferences.dim-level';
const CONTRAST_LEVEL_STORAGE_KEY = 'kbfe.preferences.contrast-level';
const EXPERIENCE_PROFILE_STORAGE_KEY = 'kbfe.preferences.experience-profile';
const SURFACE_TRANSPARENCY_STORAGE_KEY = 'kbfe.preferences.surface-transparency';

const THEME_TRANSITION_MS = 100;

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

function readStoredMobileQuickActionsVisible(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(MOBILE_QUICK_ACTIONS_VISIBLE_STORAGE_KEY) !== 'false';
}

const VALID_COLOR_PRESETS: ColorPresetId[] = [
  'teal', 'ocean', 'forest', 'sunset', 'midnight', 'lavender', 'rose', 'amber', 'slate', 'aurora',
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

/* Stored profile wins; on first run after the upgrade we infer the closest
   profile from the legacy visual-theme/density keys instead of resetting
   anything the user already picked. */
function readStoredExperienceProfile(): ExperienceProfile {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const value = window.localStorage.getItem(EXPERIENCE_PROFILE_STORAGE_KEY);
  if (isExperienceProfile(value)) {
    return value;
  }

  return inferProfileFromLegacyPreferences(readStoredVisualTheme(), readStoredDensity());
}

function readStoredSurfaceTransparency(profile: ExperienceProfile): SurfaceTransparency {
  if (typeof window === 'undefined') {
    return 'medium';
  }

  const value = window.localStorage.getItem(SURFACE_TRANSPARENCY_STORAGE_KEY);
  if (value === 'full') return 'medium';
  if (value === 'reduced') return 'low';
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'ultra') return value;

  return PROFILE_DEFAULTS[profile].transparency;
}

function readLevel(key: string, fallback: FineTuneLevel = 'medium'): FineTuneLevel {
  if (typeof window === 'undefined') {
    return 'medium';
  }
  const value = window.localStorage.getItem(key);
  return isFineTuneLevel(value) ? value : fallback;
}

export function readStoredFineTuneSettings(): FineTuneSettings {
  if (typeof window === 'undefined') return DEFAULT_FINE_TUNE_SETTINGS;
  const legacy = readLevel(FINE_TUNE_LEVEL_STORAGE_KEY);
  if (!window.localStorage.getItem(COLOR_INTENSITY_STORAGE_KEY) && isFineTuneLevel(window.localStorage.getItem(FINE_TUNE_LEVEL_STORAGE_KEY))) {
    window.localStorage.setItem(COLOR_INTENSITY_STORAGE_KEY, legacy);
  }
  const storedTransparency = window.localStorage.getItem(SURFACE_TRANSPARENCY_STORAGE_KEY);
  if (storedTransparency === 'full') window.localStorage.setItem(SURFACE_TRANSPARENCY_STORAGE_KEY, 'medium');
  if (storedTransparency === 'reduced') window.localStorage.setItem(SURFACE_TRANSPARENCY_STORAGE_KEY, 'low');
  return {
    colorIntensityLevel: readLevel(COLOR_INTENSITY_STORAGE_KEY, legacy),
    dimLevel: readLevel(DIM_LEVEL_STORAGE_KEY),
    contrastLevel: readLevel(CONTRAST_LEVEL_STORAGE_KEY),
    transparencyLevel: readStoredSurfaceTransparency(readStoredExperienceProfile()),
  };
}

export function WorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<WorkspaceLanguage>(readStoredLanguage);
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(readStoredAppearanceMode);
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(readStoredVisualTheme);
  const [density, setDensityState] = useState<DensityPreference>(readStoredDensity);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(readStoredSidebarCollapsed);
  const [mobileQuickActionsVisible, setMobileQuickActionsVisibleState] = useState<boolean>(readStoredMobileQuickActionsVisible);
  const [colorPreset, setColorPresetState] = useState<ColorPresetId>(readStoredColorPreset);
  const [experienceProfile, setExperienceProfileState] = useState<ExperienceProfile>(readStoredExperienceProfile);
  const initialFineTune = useMemo(() => readStoredFineTuneSettings(), []);
  const [surfaceTransparency, setSurfaceTransparencyState] = useState(initialFineTune.transparencyLevel);
  const [colorIntensityLevel, setColorIntensityLevelState] = useState(initialFineTune.colorIntensityLevel);
  const [dimLevel, setDimLevelState] = useState(initialFineTune.dimLevel);
  const [contrastLevel, setContrastLevelState] = useState(initialFineTune.contrastLevel);
  const [fineTunePresets, setFineTunePresets] = useState<FineTunePreset[]>(() =>
    readFineTunePresets(typeof window === 'undefined' ? undefined : window.localStorage),
  );
  const themeTransitionTimeoutRef = useRef<number | null>(null);
  const [resolvedColorScheme, setResolvedColorScheme] = useState<ResolvedColorScheme>(() => {
    const storedAppearanceMode = readStoredAppearanceMode();
    return storedAppearanceMode === 'auto' ? getSystemColorScheme() : storedAppearanceMode;
  });

  const startThemeTransition = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (themeTransitionTimeoutRef.current !== null) {
      window.clearTimeout(themeTransitionTimeoutRef.current);
    }

    document.documentElement.dataset.kbfeThemeTransition = 'active';
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      delete document.documentElement.dataset.kbfeThemeTransition;
      themeTransitionTimeoutRef.current = null;
    }, THEME_TRANSITION_MS);
  };

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

    document.documentElement.lang = localeForLanguage(language);
    document.documentElement.dataset.kbfeAppearance = appearanceMode;
    document.documentElement.dataset.kbfeDensity = density;
    document.documentElement.dataset.kbfeResolvedColorScheme = resolvedColorScheme;
    document.documentElement.dataset.kbfeVisualTheme = visualTheme;
    document.documentElement.dataset.kbfeColorPreset = colorPreset;
    document.documentElement.dataset.kbfeProfile = experienceProfile;
    document.documentElement.dataset.kbfeTransparency = surfaceTransparency;
    document.documentElement.dataset.kbfeChartEmphasis = PROFILE_DEFAULTS[experienceProfile].presentation.chartEmphasis;
    document.documentElement.dataset.kbfeContentEmphasis = PROFILE_DEFAULTS[experienceProfile].presentation.contentEmphasis;
    document.documentElement.dataset.kbfeSecondaryContrast =
      PROFILE_DEFAULTS[experienceProfile].presentation.secondaryContrast;
    document.documentElement.dataset.kbfeColorIntensity = colorIntensityLevel;
    document.documentElement.dataset.kbfeDimLevel = dimLevel;
    document.documentElement.dataset.kbfeContrastLevel = contrastLevel;
  }, [
    appearanceMode,
    colorPreset,
    density,
    experienceProfile,
    colorIntensityLevel,
    contrastLevel,
    dimLevel,
    language,
    resolvedColorScheme,
    surfaceTransparency,
    visualTheme,
  ]);

  useEffect(() => {
    return () => {
      if (themeTransitionTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(themeTransitionTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.kbfeThemeTransition;
      }
    };
  }, []);

  const setLanguage = (nextLanguage: WorkspaceLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  };

  const setAppearanceMode = (nextAppearanceMode: AppearanceMode) => {
    startThemeTransition();
    setAppearanceModeState(nextAppearanceMode);
    setResolvedColorScheme(nextAppearanceMode === 'auto' ? getSystemColorScheme() : nextAppearanceMode);
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

  const setMobileQuickActionsVisible = (visible: boolean) => {
    setMobileQuickActionsVisibleState(visible);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MOBILE_QUICK_ACTIONS_VISIBLE_STORAGE_KEY, String(visible));
    }
  };

  const setColorPreset = (nextPreset: ColorPresetId) => {
    setColorPresetState(nextPreset);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLOR_PRESET_STORAGE_KEY, nextPreset);
    }
  };

  const persistLevel = (
    key: string,
    attribute: 'kbfeColorIntensity' | 'kbfeContrastLevel' | 'kbfeDimLevel',
    level: FineTuneLevel,
    setter: (value: FineTuneLevel) => void,
  ) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset[attribute] = level;
    }
    setter(level);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, level);
    }
  };
  const setColorIntensityLevel = (level: FineTuneLevel) => persistLevel(COLOR_INTENSITY_STORAGE_KEY, 'kbfeColorIntensity', level, setColorIntensityLevelState);
  const setDimLevel = (level: FineTuneLevel) => persistLevel(DIM_LEVEL_STORAGE_KEY, 'kbfeDimLevel', level, setDimLevelState);
  const setContrastLevel = (level: FineTuneLevel) => persistLevel(CONTRAST_LEVEL_STORAGE_KEY, 'kbfeContrastLevel', level, setContrastLevelState);

  const setSurfaceTransparency = (nextTransparency: SurfaceTransparency) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.kbfeTransparency = nextTransparency;
    }
    setSurfaceTransparencyState(nextTransparency);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SURFACE_TRANSPARENCY_STORAGE_KEY, nextTransparency);
    }
  };

  /* Selecting a profile applies its DEFAULTS to the advanced controls (which
     each persist through their own setter). Appearance mode and color preset
     are independent of the profile and stay untouched. */
  const applyProfileDefaults = (profile: ExperienceProfile) => {
    const defaults = PROFILE_DEFAULTS[profile];
    setVisualTheme(defaults.visualTheme);
    setDensity(defaults.density);
    setSurfaceTransparency(defaults.transparency);
  };

  const setExperienceProfile = (nextProfile: ExperienceProfile) => {
    startThemeTransition();
    setExperienceProfileState(nextProfile);
    applyProfileDefaults(nextProfile);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EXPERIENCE_PROFILE_STORAGE_KEY, nextProfile);
    }
  };

  const resetFineTune = () => {
    setColorIntensityLevel('medium');
    setDimLevel('medium');
    setContrastLevel('medium');
    setSurfaceTransparency('medium');
  };

  const persistPresets = (next: FineTunePreset[]) => {
    setFineTunePresets(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(FINE_TUNE_PRESETS_STORAGE_KEY, JSON.stringify(next));
  };
  const saveFineTunePreset = (name: string) => {
    if (validatePresetName(name, fineTunePresets)) return;
    persistPresets([...fineTunePresets, {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: name.trim(), colorIntensityLevel, dimLevel, contrastLevel, transparencyLevel: surfaceTransparency,
    }]);
  };
  const applyFineTunePreset = (id: string) => {
    const preset = fineTunePresets.find((item) => item.id === id);
    if (!preset) return;
    setColorIntensityLevel(preset.colorIntensityLevel);
    setDimLevel(preset.dimLevel);
    setContrastLevel(preset.contrastLevel);
    setSurfaceTransparency(preset.transparencyLevel);
  };
  const renameFineTunePreset = (id: string, name: string) => {
    if (validatePresetName(name, fineTunePresets, id)) return;
    persistPresets(fineTunePresets.map((preset) => preset.id === id ? { ...preset, name: name.trim() } : preset));
  };
  const deleteFineTunePreset = (id: string) => persistPresets(fineTunePresets.filter((preset) => preset.id !== id));

  // Bind the money formatter's locale to the language synchronously (during render, not
  // in an effect) so children on the same render pass format money in the right locale.
  setMoneyLocale(localeForLanguage(language));

  const value = useMemo(
    () => ({
      appearanceMode,
      colorPreset,
      density,
      experienceProfile,
      colorIntensityLevel,
      contrastLevel,
      dimLevel,
      fineTunePresets,
      isProfileCustomized: isProfileCustomized(experienceProfile, {
        density,
        transparency: surfaceTransparency,
        visualTheme,
      }),
      language,
      mobileQuickActionsVisible,
      presentation: PROFILE_DEFAULTS[experienceProfile].presentation,
      resetFineTune,
      resolvedColorScheme,
      sidebarCollapsed,
      surfaceTransparency,
      setAppearanceMode,
      setExperienceProfile,
      setSurfaceTransparency,
      setColorPreset,
      setDensity,
      setColorIntensityLevel,
      setContrastLevel,
      setDimLevel,
      saveFineTunePreset,
      applyFineTunePreset,
      renameFineTunePreset,
      deleteFineTunePreset,
      setLanguage,
      setMobileQuickActionsVisible,
      setVisualTheme,
      toggleSidebar,
      visualTheme,
    }),
    [
      appearanceMode,
      colorPreset,
      density,
      experienceProfile,
      colorIntensityLevel,
      contrastLevel,
      dimLevel,
      fineTunePresets,
      language,
      mobileQuickActionsVisible,
      resolvedColorScheme,
      sidebarCollapsed,
      surfaceTransparency,
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
