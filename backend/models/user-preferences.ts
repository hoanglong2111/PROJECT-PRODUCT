import { pool } from '../config/database';
import type { UserPreferencesRow } from '../domain/types';

export type UserPreferences = {
  colorPreset: string;
  eventTheme: string;
  visualTheme: string;
  density: string;
  appearanceMode: string;
  language: string;
};

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const result = await pool.query<UserPreferencesRow>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId],
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];
  return {
    colorPreset: row.color_preset,
    eventTheme: row.event_theme,
    visualTheme: row.visual_theme,
    density: row.density,
    appearanceMode: row.appearance_mode,
    language: row.language,
  };
}

export async function upsertUserPreferences(userId: string, prefs: UserPreferences): Promise<UserPreferences> {
  const result = await pool.query<UserPreferencesRow>(
    `
      INSERT INTO user_preferences (user_id, color_preset, event_theme, visual_theme, density, appearance_mode, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        color_preset = EXCLUDED.color_preset,
        event_theme = EXCLUDED.event_theme,
        visual_theme = EXCLUDED.visual_theme,
        density = EXCLUDED.density,
        appearance_mode = EXCLUDED.appearance_mode,
        language = EXCLUDED.language,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      prefs.colorPreset,
      prefs.eventTheme,
      prefs.visualTheme,
      prefs.density,
      prefs.appearanceMode,
      prefs.language,
    ],
  );

  const row = result.rows[0];
  return {
    colorPreset: row.color_preset,
    eventTheme: row.event_theme,
    visualTheme: row.visual_theme,
    density: row.density,
    appearanceMode: row.appearance_mode,
    language: row.language,
  };
}
