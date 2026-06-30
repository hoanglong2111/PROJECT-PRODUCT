import type { Capability } from '@shared/auth/capabilities';

type DemoFlagEnv = Pick<ImportMetaEnv, 'VITE_DEMO_HIDDEN' | 'VITE_DEMO_MODE'>;

const enabledValues = new Set(['1', 'true', 'yes', 'on']);

export function isDemoMode(env: DemoFlagEnv = import.meta.env) {
  return enabledValues.has((env.VITE_DEMO_MODE ?? '').trim().toLowerCase());
}

export function getDemoHiddenEntries(env: DemoFlagEnv = import.meta.env) {
  if (!isDemoMode(env)) {
    return new Set<string>();
  }

  return new Set(
    (env.VITE_DEMO_HIDDEN ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function isDemoHidden(capability: Capability, env: DemoFlagEnv = import.meta.env) {
  const hiddenEntries = getDemoHiddenEntries(env);
  const moduleName = capability.split('.')[0];

  return (
    hiddenEntries.has(capability) ||
    hiddenEntries.has(moduleName) ||
    hiddenEntries.has(`${moduleName}.*`)
  );
}
