import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WorkspaceLanguage = 'vi' | 'en';
export type EventTheme = 'standard' | 'risk-focus' | 'compact';

type WorkspacePreferencesContextValue = {
  eventTheme: EventTheme;
  language: WorkspaceLanguage;
  setEventTheme: (eventTheme: EventTheme) => void;
  setLanguage: (language: WorkspaceLanguage) => void;
};

const LANGUAGE_STORAGE_KEY = 'kbfe.preferences.language';
const EVENT_THEME_STORAGE_KEY = 'kbfe.preferences.event-theme';

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | undefined>(undefined);

function readStoredLanguage(): WorkspaceLanguage {
  if (typeof window === 'undefined') {
    return 'vi';
  }

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'vi';
}

function readStoredEventTheme(): EventTheme {
  if (typeof window === 'undefined') {
    return 'standard';
  }

  const value = window.localStorage.getItem(EVENT_THEME_STORAGE_KEY);
  if (value === 'risk-focus' || value === 'compact') {
    return value;
  }

  return 'standard';
}

export function WorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<WorkspaceLanguage>(readStoredLanguage);
  const [eventTheme, setEventThemeState] = useState<EventTheme>(readStoredEventTheme);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language === 'vi' ? 'vi-VN' : 'en';
    document.documentElement.dataset.kbfeEventTheme = eventTheme;
  }, [eventTheme, language]);

  const setLanguage = (nextLanguage: WorkspaceLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
  };

  const setEventTheme = (nextEventTheme: EventTheme) => {
    setEventThemeState(nextEventTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EVENT_THEME_STORAGE_KEY, nextEventTheme);
    }
  };

  const value = useMemo(
    () => ({
      eventTheme,
      language,
      setEventTheme,
      setLanguage,
    }),
    [eventTheme, language],
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
