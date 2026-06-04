import type { ColorPresetId } from './colorPresets';

export type EventThemeId =
  | 'none'
  | 'tet'
  | 'valentine'
  | 'mid-autumn'
  | 'christmas'
  | 'new-year'
  | 'halloween'
  | 'womens-day'
  | 'national-day';

export type EventTheme = {
  id: EventThemeId;
  emoji: string;
  colorPresetId: ColorPresetId;
  accentOverride?: {
    primaryLight?: string;
    primaryDark?: string;
  };
};

export const eventThemes: Record<EventThemeId, EventTheme> = {
  none: {
    id: 'none',
    emoji: '🔄',
    colorPresetId: 'teal',
  },
  tet: {
    id: 'tet',
    emoji: '🧧',
    colorPresetId: 'rose',
    accentOverride: {
      primaryLight: '#c53030',
      primaryDark: '#fc8181',
    },
  },
  valentine: {
    id: 'valentine',
    emoji: '💝',
    colorPresetId: 'rose',
  },
  'mid-autumn': {
    id: 'mid-autumn',
    emoji: '🥮',
    colorPresetId: 'amber',
    accentOverride: {
      primaryLight: '#d69e2e',
      primaryDark: '#f6e05e',
    },
  },
  christmas: {
    id: 'christmas',
    emoji: '🎄',
    colorPresetId: 'forest',
    accentOverride: {
      primaryLight: '#276749',
      primaryDark: '#68d391',
    },
  },
  'new-year': {
    id: 'new-year',
    emoji: '🎆',
    colorPresetId: 'midnight',
    accentOverride: {
      primaryLight: '#5a67d8',
      primaryDark: '#a3bffa',
    },
  },
  halloween: {
    id: 'halloween',
    emoji: '🎃',
    colorPresetId: 'sunset',
    accentOverride: {
      primaryLight: '#c05621',
      primaryDark: '#f6ad55',
    },
  },
  'womens-day': {
    id: 'womens-day',
    emoji: '💐',
    colorPresetId: 'lavender',
  },
  'national-day': {
    id: 'national-day',
    emoji: '🇻🇳',
    colorPresetId: 'sunset',
    accentOverride: {
      primaryLight: '#c53030',
      primaryDark: '#fc8181',
    },
  },
};

export const defaultEventThemeId: EventThemeId = 'none';

/**
 * Auto-detect event theme based on current date.
 * Returns the matching event theme ID or 'none'.
 */
export function getAutoEventTheme(): EventThemeId {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Tet (approximate: late Jan to mid Feb)
  if ((month === 1 && day >= 20) || (month === 2 && day <= 15)) return 'tet';

  // Valentine (Feb 10-16)
  if (month === 2 && day >= 10 && day <= 16) return 'valentine';

  // Women's Day (Mar 6-10)
  if (month === 3 && day >= 6 && day <= 10) return 'womens-day';

  // National Day (Aug 31 - Sep 5)
  if ((month === 8 && day >= 31) || (month === 9 && day <= 5)) return 'national-day';

  // Mid-Autumn (approximate: Sep 20-30)
  if (month === 9 && day >= 20 && day <= 30) return 'mid-autumn';

  // Halloween (Oct 28 - Nov 1)
  if ((month === 10 && day >= 28) || (month === 11 && day <= 1)) return 'halloween';

  // Christmas (Dec 20-26)
  if (month === 12 && day >= 20 && day <= 26) return 'christmas';

  // New Year (Dec 27 - Jan 3)
  if ((month === 12 && day >= 27) || (month === 1 && day <= 3)) return 'new-year';

  return 'none';
}
