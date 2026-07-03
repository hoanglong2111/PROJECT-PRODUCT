import type { Capability } from '@shared/auth/capabilities';

const DEMO_UNLOCK_STORAGE_KEY = 'kbfe.demo.unlocked';

/**
 * Capabilities hidden in the default (locked) demo view. Add a module's `*.view`
 * capability to hide that whole screen + its sidebar entry; `/fds-admin` reveals it.
 * Empty by default — arbitrary in-page UI is hidden with `<AdminOnly>` instead.
 */
export const DEMO_HIDDEN_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([]);

export function isDemoUnlocked() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEMO_UNLOCK_STORAGE_KEY) === '1';
}

export function setDemoUnlocked(unlocked: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (unlocked) {
    window.localStorage.setItem(DEMO_UNLOCK_STORAGE_KEY, '1');
    return;
  }

  window.localStorage.removeItem(DEMO_UNLOCK_STORAGE_KEY);
}

export function isCapabilityDemoHidden(
  capability: Capability,
  hiddenCapabilities: ReadonlySet<Capability>,
  unlocked: boolean,
) {
  return !unlocked && hiddenCapabilities.has(capability);
}

export function isDemoHidden(capability: Capability) {
  return isCapabilityDemoHidden(capability, DEMO_HIDDEN_CAPABILITIES, isDemoUnlocked());
}
