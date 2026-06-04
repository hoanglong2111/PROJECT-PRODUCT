import { describe, expect, it, vi } from 'vitest';
import { getAutoEventTheme } from '../eventThemes';

describe('getAutoEventTheme', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "none" for a normal date (May 15)', () => {
    vi.setSystemTime(new Date(2025, 4, 15)); // May 15
    expect(getAutoEventTheme()).toBe('none');
  });

  it('returns "tet" for late January (Jan 25)', () => {
    vi.setSystemTime(new Date(2025, 0, 25)); // Jan 25
    expect(getAutoEventTheme()).toBe('tet');
  });

  it('returns "tet" for mid February (Feb 10)', () => {
    vi.setSystemTime(new Date(2025, 1, 10)); // Feb 10
    expect(getAutoEventTheme()).toBe('tet');
  });

  it('returns "valentine" for Feb 16', () => {
    vi.setSystemTime(new Date(2025, 1, 16)); // Feb 16
    expect(getAutoEventTheme()).toBe('valentine');
  });

  it('returns "tet" for Feb 14 (tet range takes priority)', () => {
    vi.setSystemTime(new Date(2025, 1, 14)); // Feb 14
    expect(getAutoEventTheme()).toBe('tet');
  });

  it('returns "womens-day" for Mar 8', () => {
    vi.setSystemTime(new Date(2025, 2, 8)); // Mar 8
    expect(getAutoEventTheme()).toBe('womens-day');
  });

  it('returns "national-day" for Sep 2', () => {
    vi.setSystemTime(new Date(2025, 8, 2)); // Sep 2
    expect(getAutoEventTheme()).toBe('national-day');
  });

  it('returns "mid-autumn" for Sep 25', () => {
    vi.setSystemTime(new Date(2025, 8, 25)); // Sep 25
    expect(getAutoEventTheme()).toBe('mid-autumn');
  });

  it('returns "halloween" for Oct 31', () => {
    vi.setSystemTime(new Date(2025, 9, 31)); // Oct 31
    expect(getAutoEventTheme()).toBe('halloween');
  });

  it('returns "christmas" for Dec 25', () => {
    vi.setSystemTime(new Date(2025, 11, 25)); // Dec 25
    expect(getAutoEventTheme()).toBe('christmas');
  });

  it('returns "new-year" for Dec 30', () => {
    vi.setSystemTime(new Date(2025, 11, 30)); // Dec 30
    expect(getAutoEventTheme()).toBe('new-year');
  });

  it('returns "new-year" for Jan 1', () => {
    vi.setSystemTime(new Date(2025, 0, 1)); // Jan 1
    expect(getAutoEventTheme()).toBe('new-year');
  });
});
