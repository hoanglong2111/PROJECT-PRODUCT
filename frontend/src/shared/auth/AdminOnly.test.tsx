import { afterEach, describe, expect, it } from 'vitest';

import { setDemoUnlocked } from '@shared/config/featureFlags';
import { AdminOnly, useDemoUnlocked } from './AdminOnly';

afterEach(() => {
  window.localStorage.clear();
});

describe('AdminOnly', () => {
  it('renders nothing while locked', () => {
    expect(AdminOnly({ children: 'secret' })).toBeNull();
  });

  it('renders its children while unlocked', () => {
    setDemoUnlocked(true);
    expect(AdminOnly({ children: 'secret' })).not.toBeNull();
  });
});

describe('useDemoUnlocked', () => {
  it('reflects the unlock flag', () => {
    expect(useDemoUnlocked()).toBe(false);
    setDemoUnlocked(true);
    expect(useDemoUnlocked()).toBe(true);
  });
});
