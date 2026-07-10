import type { DensityPreference, VisualTheme } from './WorkspacePreferencesContext';

/* Experience profiles — the public entry point of the preference model.
   A profile only provides DEFAULTS for the advanced appearance controls
   (visual theme, density, transparency) plus a derived adaptive-presentation
   contract; once the user diverges in Advanced the profile shows as
   "customized" but is never silently overwritten. */

export type ExperienceProfile =
  | 'operational-focus'
  | 'overview'
  | 'eye-comfort'
  | 'accessible';

export type SurfaceTransparency = 'full' | 'reduced';

export type AdaptivePresentation = {
  chartEmphasis: 'overview' | 'exceptions';
  contentEmphasis: 'planning' | 'execution';
  secondaryContrast: 'normal' | 'muted';
};

export type ProfileDefaults = {
  density: DensityPreference;
  presentation: AdaptivePresentation;
  transparency: SurfaceTransparency;
  visualTheme: VisualTheme;
};

export const EXPERIENCE_PROFILES: ExperienceProfile[] = [
  'operational-focus',
  'overview',
  'eye-comfort',
  'accessible',
];

export const PROFILE_DEFAULTS: Record<ExperienceProfile, ProfileDefaults> = {
  'operational-focus': {
    density: 'compact',
    presentation: { chartEmphasis: 'exceptions', contentEmphasis: 'execution', secondaryContrast: 'muted' },
    transparency: 'full',
    visualTheme: 'standard',
  },
  overview: {
    density: 'standard',
    presentation: { chartEmphasis: 'overview', contentEmphasis: 'planning', secondaryContrast: 'normal' },
    transparency: 'full',
    visualTheme: 'standard',
  },
  'eye-comfort': {
    density: 'standard',
    presentation: { chartEmphasis: 'overview', contentEmphasis: 'planning', secondaryContrast: 'normal' },
    transparency: 'full',
    visualTheme: 'eye-comfort',
  },
  accessible: {
    density: 'standard',
    presentation: { chartEmphasis: 'overview', contentEmphasis: 'execution', secondaryContrast: 'normal' },
    transparency: 'reduced',
    visualTheme: 'high-contrast',
  },
};

export function isExperienceProfile(value: unknown): value is ExperienceProfile {
  return typeof value === 'string' && (EXPERIENCE_PROFILES as string[]).includes(value);
}

/* First run after the upgrade: no profile stored yet, but the legacy keys
   (visual theme / density) may exist. Map onto the closest profile so no
   existing preference is reset. */
export function inferProfileFromLegacyPreferences(
  visualTheme: VisualTheme,
  density: DensityPreference,
): ExperienceProfile {
  if (visualTheme === 'high-contrast') {
    return 'accessible';
  }
  if (visualTheme === 'eye-comfort') {
    return 'eye-comfort';
  }
  if (density === 'compact') {
    return 'operational-focus';
  }

  return 'overview';
}

/* A profile is "customized" when any advanced control diverges from the
   profile's defaults. Presentation is derived from the profile itself, so it
   never counts toward customization. */
export function isProfileCustomized(
  profile: ExperienceProfile,
  current: { density: DensityPreference; transparency: SurfaceTransparency; visualTheme: VisualTheme },
): boolean {
  const defaults = PROFILE_DEFAULTS[profile];
  return (
    defaults.density !== current.density ||
    defaults.transparency !== current.transparency ||
    defaults.visualTheme !== current.visualTheme
  );
}
