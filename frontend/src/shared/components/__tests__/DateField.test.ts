import { describe, expect, it } from 'vitest';

import {
  formatDateTypingInput,
  fromPickerDateTimeValue,
  getPickerTimeValue,
  parseDateInput,
  toPickerDateTimeValue,
} from '../DateField';

describe('formatDateTypingInput', () => {
  it('formats raw digits into YYYY/MM/DD while the user types', () => {
    expect(formatDateTypingInput('2026')).toBe('2026');
    expect(formatDateTypingInput('202606')).toBe('2026/06');
    expect(formatDateTypingInput('20260620')).toBe('2026/06/20');
  });

  it('normalizes pasted values and ignores extra characters', () => {
    expect(formatDateTypingInput('2026-06-20')).toBe('2026/06/20');
    expect(formatDateTypingInput('2026/06/20abc')).toBe('2026/06/20');
  });
});

describe('parseDateInput', () => {
  it('parses YYYY/MM/DD typed by hand into ISO YYYY-MM-DD', () => {
    expect(parseDateInput('2026/06/20')).toBe('2026-06-20');
  });

  it('accepts single-digit month/day, raw digits, and dash/dot separators', () => {
    expect(parseDateInput('2001/1/2')).toBe('2001-01-02');
    expect(parseDateInput('20260620')).toBe('2026-06-20');
    expect(parseDateInput('2026-06-20')).toBe('2026-06-20');
    expect(parseDateInput('2026.06.20')).toBe('2026-06-20');
  });

  it('passes through an ISO value unchanged', () => {
    expect(parseDateInput('2026-06-30')).toBe('2026-06-30');
  });

  it('does NOT accept the old DD/MM/YYYY shape as a silent fallback', () => {
    expect(parseDateInput('20/06/2026')).toBeNull();
  });

  it('returns null for empty or unparseable input', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('   ')).toBeNull();
    expect(parseDateInput('abc')).toBeNull();
  });
});

describe('DateTimeField value conversion', () => {
  it('splits native datetime-local form values into editable date and time values', () => {
    expect(toPickerDateTimeValue('2026-06-20T09:30')).toBe('2026-06-20');
    expect(getPickerTimeValue('2026-06-20T09:30')).toBe('09:30');
  });

  it('combines editable date and time values back into native datetime-local form values', () => {
    expect(fromPickerDateTimeValue('2026-06-20', '09:30')).toBe('2026-06-20T09:30');
  });

  it('keeps empty or invalid values empty', () => {
    expect(toPickerDateTimeValue('')).toBeNull();
    expect(getPickerTimeValue('')).toBe('');
    expect(fromPickerDateTimeValue(null, '09:30')).toBe('');
  });
});
