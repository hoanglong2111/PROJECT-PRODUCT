import { afterEach, describe, expect, it } from 'vitest';

import type { Capability } from '@shared/auth/capabilities';
import {
  isCapabilityDemoHidden,
  isDemoHidden,
  isDemoUnlocked,
  setDemoUnlocked,
} from './featureFlags';

afterEach(() => {
  window.localStorage.clear();
});

describe('demo unlock flag', () => {
  it('is locked by default and toggles via setDemoUnlocked', () => {
    expect(isDemoUnlocked()).toBe(false);
    setDemoUnlocked(true);
    expect(isDemoUnlocked()).toBe(true);
    setDemoUnlocked(false);
    expect(isDemoUnlocked()).toBe(false);
  });
});

describe('isCapabilityDemoHidden', () => {
  const hidden: ReadonlySet<Capability> = new Set<Capability>(['masterData.view']);

  it('hides a listed capability only while locked', () => {
    expect(isCapabilityDemoHidden('masterData.view', hidden, false)).toBe(true);
    expect(isCapabilityDemoHidden('masterData.view', hidden, true)).toBe(false);
  });

  it('never hides a capability that is not listed', () => {
    expect(isCapabilityDemoHidden('purchaseOrders.view', hidden, false)).toBe(false);
  });
});

describe('isDemoHidden', () => {
  it('hides nothing by default because the real hidden set is empty', () => {
    expect(isDemoHidden('masterData.view')).toBe(false);
    setDemoUnlocked(true);
    expect(isDemoHidden('masterData.view')).toBe(false);
  });
});
