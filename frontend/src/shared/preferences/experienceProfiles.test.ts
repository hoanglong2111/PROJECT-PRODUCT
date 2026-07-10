import { describe, expect, it } from 'vitest';

import {
  EXPERIENCE_PROFILES,
  PROFILE_DEFAULTS,
  inferProfileFromLegacyPreferences,
  isExperienceProfile,
  isProfileCustomized,
} from './experienceProfiles';

describe('experience profiles', () => {
  it('defines defaults for every profile', () => {
    for (const profile of EXPERIENCE_PROFILES) {
      const defaults = PROFILE_DEFAULTS[profile];
      expect(defaults.visualTheme).toBeTruthy();
      expect(defaults.density).toBeTruthy();
      expect(defaults.transparency).toBeTruthy();
      expect(defaults.presentation.chartEmphasis).toBeTruthy();
      expect(defaults.presentation.contentEmphasis).toBeTruthy();
      expect(defaults.presentation.secondaryContrast).toBeTruthy();
    }
  });

  it('maps profiles onto the expected visual theme and density', () => {
    expect(PROFILE_DEFAULTS['operational-focus']).toMatchObject({ density: 'compact', visualTheme: 'standard' });
    expect(PROFILE_DEFAULTS.overview).toMatchObject({ density: 'standard', visualTheme: 'standard' });
    expect(PROFILE_DEFAULTS['eye-comfort']).toMatchObject({ visualTheme: 'eye-comfort' });
    expect(PROFILE_DEFAULTS.accessible).toMatchObject({ transparency: 'reduced', visualTheme: 'high-contrast' });
  });

  it('validates profile ids', () => {
    expect(isExperienceProfile('overview')).toBe(true);
    expect(isExperienceProfile('eye-comfort')).toBe(true);
    expect(isExperienceProfile('standard')).toBe(false);
    expect(isExperienceProfile(null)).toBe(false);
  });

  describe('legacy preference migration', () => {
    it('infers accessible from high-contrast regardless of density', () => {
      expect(inferProfileFromLegacyPreferences('high-contrast', 'standard')).toBe('accessible');
      expect(inferProfileFromLegacyPreferences('high-contrast', 'compact')).toBe('accessible');
    });

    it('infers eye-comfort from the eye-comfort theme', () => {
      expect(inferProfileFromLegacyPreferences('eye-comfort', 'standard')).toBe('eye-comfort');
    });

    it('infers operational-focus from compact density on standard theme', () => {
      expect(inferProfileFromLegacyPreferences('standard', 'compact')).toBe('operational-focus');
    });

    it('falls back to overview', () => {
      expect(inferProfileFromLegacyPreferences('standard', 'standard')).toBe('overview');
    });
  });

  describe('customization detection', () => {
    it('is not customized when current values equal the profile defaults', () => {
      for (const profile of EXPERIENCE_PROFILES) {
        const { density, transparency, visualTheme } = PROFILE_DEFAULTS[profile];
        expect(isProfileCustomized(profile, { density, transparency, visualTheme })).toBe(false);
      }
    });

    it('is customized when any advanced control diverges', () => {
      expect(
        isProfileCustomized('overview', { density: 'compact', transparency: 'full', visualTheme: 'standard' }),
      ).toBe(true);
      expect(
        isProfileCustomized('overview', { density: 'standard', transparency: 'reduced', visualTheme: 'standard' }),
      ).toBe(true);
      expect(
        isProfileCustomized('overview', { density: 'standard', transparency: 'full', visualTheme: 'eye-comfort' }),
      ).toBe(true);
    });
  });
});
