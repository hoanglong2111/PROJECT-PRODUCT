import dayjs from 'dayjs';

/**
 * Project-wide date formatting. The canonical date format is `YYYY-MM-DD`
 * (and `YYYY-MM-DD HH:mm` when a time component is needed). Always format
 * dates through these helpers so the format stays consistent everywhere.
 */

const DATE_FORMAT = 'YYYY-MM-DD';
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

/** Format a date-only value as `YYYY-MM-DD`. Returns `fallback` when empty/invalid. */
export function formatDate(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : fallback;
}

/** Format a date+time value as `YYYY-MM-DD HH:mm`. Returns `fallback` when empty/invalid. */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_TIME_FORMAT) : fallback;
}
