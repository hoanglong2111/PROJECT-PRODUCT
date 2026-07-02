import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatIso } from '../date';

describe('date formatting', () => {
  it('formats UTC instants in the fixed Vietnam timezone', () => {
    expect(formatDateTime('2026-06-20T02:00:00.000Z')).toBe('2026-06-20 09:00');
  });

  it('formats ISO-8601 hover text with the GMT+7 offset', () => {
    expect(formatIso('2026-06-20T02:00:00.000Z')).toBe('2026-06-20T09:00:00+07:00');
  });

  it('keeps date-only planning fields date-only', () => {
    expect(formatDate('2026-07-03')).toBe('2026-07-03');
  });

  it('returns the fallback for empty or invalid values', () => {
    expect(formatDate('', 'n/a')).toBe('n/a');
    expect(formatDate('not-a-date', 'n/a')).toBe('n/a');
    expect(formatDateTime(null, 'n/a')).toBe('n/a');
    expect(formatDateTime('not-a-date', 'n/a')).toBe('n/a');
    expect(formatIso(undefined, 'n/a')).toBe('n/a');
    expect(formatIso('not-a-date', 'n/a')).toBe('n/a');
  });
});
