import { useEffect } from 'react';

import { setDemoUnlocked } from '@shared/config/featureFlags';

export function activateDemoUnlock(redirect: () => void = () => window.location.replace('/')) {
  setDemoUnlocked(true);
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
