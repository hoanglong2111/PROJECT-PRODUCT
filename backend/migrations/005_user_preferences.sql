-- Migration 005: User Preferences for theme settings

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  color_preset TEXT NOT NULL DEFAULT 'teal',
  event_theme TEXT NOT NULL DEFAULT 'none',
  visual_theme TEXT NOT NULL DEFAULT 'standard',
  density TEXT NOT NULL DEFAULT 'standard',
  appearance_mode TEXT NOT NULL DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'vi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_color_preset ON user_preferences(color_preset);
CREATE INDEX IF NOT EXISTS idx_user_preferences_event_theme ON user_preferences(event_theme);