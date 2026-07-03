import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDemoUnlocked, setDemoUnlocked } from '@shared/config/featureFlags';
import { activateDemoUnlock, deactivateDemoUnlock } from './FdsAdminRoute';

afterEach(() => {
  window.localStorage.clear();
});

describe('activateDemoUnlock', () => {
  it('sets the unlock flag and triggers the redirect', () => {
    const redirect = vi.fn();

    activateDemoUnlock(redirect);

    expect(isDemoUnlocked()).toBe(true);
    expect(redirect).toHaveBeenCalledOnce();
  });
});

describe('deactivateDemoUnlock', () => {
  it('clears the unlock flag and triggers the redirect', () => {
    setDemoUnlocked(true);
    const redirect = vi.fn();

    deactivateDemoUnlock(redirect);

    expect(isDemoUnlocked()).toBe(false);
    expect(redirect).toHaveBeenCalledOnce();
  });
});
