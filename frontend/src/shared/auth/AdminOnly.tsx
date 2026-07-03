import type { ReactNode } from 'react';

import { isDemoUnlocked } from '@shared/config/featureFlags';

/**
 * Convenience hook for logic-level checks. Unlock only changes via a hard reload
 * (see `/fds-admin`), so no reactive subscription is needed.
 */
export function useDemoUnlocked() {
  return isDemoUnlocked();
}

/**
 * Renders its children only when the browser is unlocked via `/fds-admin`.
 * Use for arbitrary in-page UI that must be hidden from customers regardless of role.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  if (!isDemoUnlocked()) {
    return null;
  }

  return <>{children}</>;
}
