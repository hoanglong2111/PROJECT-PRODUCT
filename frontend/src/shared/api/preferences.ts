import { http } from '@shared/api/http';

/**
 * Shape of user preferences as stored on the server.
 * Mirrors the `UserPreferences` type defined in `server/modules/users/preferences.ts`.
 */
export type UserPreferences = {
  colorPreset: string;
  eventTheme: string;
  visualTheme: string;
  density: string;
  appearanceMode: string;
  language: string;
};

/** Fetch the current user's preferences from the backend. */
export async function fetchUserPreferences(): Promise<UserPreferences> {
  const response = await http.get<{ data: UserPreferences }>(
    '/users/me/preferences',
  );
  // The server wraps the payload in `{ data, errors }`
  return response.data.data;
}

/** Update the current user's preferences on the backend. */
export async function updateUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const response = await http.put<{ data: UserPreferences }>(
    '/users/me/preferences',
    prefs,
  );
  return response.data.data;
}
