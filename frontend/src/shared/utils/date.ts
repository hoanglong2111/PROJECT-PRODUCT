import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

/**
 * Project-wide date formatting. The canonical date format is `YYYY-MM-DD`
 * (and `YYYY-MM-DD HH:mm` when a time component is needed). Always format
 * dates through these helpers so the format stays consistent everywhere.
 */

dayjs.extend(utc);
dayjs.extend(timezone);

export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const APP_TZ_LABEL = 'GMT+7';

const DATE_FORMAT = 'YYYY-MM-DD';
const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
const ISO_WITH_OFFSET_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

/** Format a date-only value as `YYYY-MM-DD`. Returns `fallback` when empty/invalid. */
export function formatDate(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : fallback;
}

/** Format a date+time value as `YYYY-MM-DD HH:mm`. Returns `fallback` when empty/invalid. */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.tz(APP_TIME_ZONE).format(DATE_TIME_FORMAT) : fallback;
}

/** Format an instant as ISO-8601 with the app timezone offset for exact hover text. */
export function formatIso(value: string | number | Date | null | undefined, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.tz(APP_TIME_ZONE).format(ISO_WITH_OFFSET_FORMAT) : fallback;
}
