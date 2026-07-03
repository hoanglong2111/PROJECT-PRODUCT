import { useEffect } from 'react';

import { setDemoUnlocked } from '@shared/config/featureFlags';

export function activateDemoUnlock(redirect: () => void = () => window.location.replace('/')) {
  setDemoUnlocked(true);
  redirect();
}

export function deactivateDemoUnlock(redirect: () => void = () => window.location.replace('/')) {
  setDemoUnlocked(false);
  redirect();
}

/**
 * Secret unlock route. Visiting `/fds-admin` flips the app into the full (unlocked)
 * view and reloads to `/`. Not linked anywhere in the UI.
 */
export function FdsAdminRoute() {
  useEffect(() => {
    activateDemoUnlock();
  }, []);

  return null;
}

/**
 * Secret re-lock route. Visiting `/fds-demo` returns the app to the hidden demo
 * view and reloads to `/` — the way back after `/fds-admin` without clearing site data.
 */
export function FdsDemoRoute() {
  useEffect(() => {
    deactivateDemoUnlock();
  }, []);

  return null;
}
