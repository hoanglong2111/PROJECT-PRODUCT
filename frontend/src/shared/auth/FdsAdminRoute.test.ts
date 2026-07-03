import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDemoUnlocked } from '@shared/config/featureFlags';
import { activateDemoUnlock } from './FdsAdminRoute';

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
