type FormatMoneyOptions = {
  locale?: string;
};

type FormatUnitPriceOptions = {
  locale?: string;
  // Unit prices / FX rates are ratios, not settlement amounts, so they may carry more
  // precision than the currency's ISO 4217 minor unit. maxDigits caps that precision;
  // minDigits defaults to the currency's minor unit so a whole price still shows cents.
  maxDigits?: number;
  minDigits?: number;
};

const DEFAULT_LOCALE = 'en-US';
const FALLBACK_FRACTION_DIGITS = 2;
const DEFAULT_UNIT_PRICE_MAX_DIGITS = 6;

// Single source of truth for the display locale. The i18n/preferences layer owns the
// language and pushes it here via setMoneyLocale so money formatting never reads the DOM
// (`document.documentElement.lang`) as a side channel. Math (minor units) is currency-
// driven and locale-independent; only grouping/decimal separators depend on this.
let activeLocale = DEFAULT_LOCALE;

export function getMoneyLocale() {
  return activeLocale;
}

export function setMoneyLocale(locale: string | null | undefined) {
  activeLocale = locale?.trim() || DEFAULT_LOCALE;
}

function resolveLocale(locale?: string) {
  return locale?.trim() || activeLocale;
}

function normalizeCurrencyCode(currencyCode: string | null | undefined) {
  return (currencyCode || 'USD').trim().toUpperCase();
}

export function currencyFractionDigits(currencyCode: string | null | undefined, locale = activeLocale) {
  const currency = normalizeCurrencyCode(currencyCode);
  try {
    return (
      new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? FALLBACK_FRACTION_DIGITS
    );
  } catch {
    // Non-ISO-4217 codes (e.g. bad master-data input) make Intl throw a RangeError.
    // Fall back to a sane default so display/rounding never crashes the UI.
    return FALLBACK_FRACTION_DIGITS;
  }
}

// ISO 4217 minor-unit count for a currency, used to drive input decimalScale.
export function currencyDecimalScale(currencyCode: string | null | undefined, locale = activeLocale) {
  return currencyFractionDigits(currencyCode, locale);
}

export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  options: FormatMoneyOptions = {},
) {
  const currency = normalizeCurrencyCode(currencyCode);
  const locale = resolveLocale(options.locale);
  const digits = currencyFractionDigits(currency, locale);
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = roundToMinorUnits(safeValue, currency, locale);

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded)} ${currency}`;
}

// Format a unit price / FX rate: keeps precision beyond the currency minor unit (up to
// maxDigits) instead of rounding to a settlement amount, while still grouping by locale
// and appending the ISO code. Trailing zeros past the currency minor unit are trimmed.
export function formatUnitPrice(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  options: FormatUnitPriceOptions = {},
) {
  const currency = normalizeCurrencyCode(currencyCode);
  const locale = resolveLocale(options.locale);
  const minDigits = options.minDigits ?? currencyFractionDigits(currency, locale);
  const maxDigits = Math.max(minDigits, options.maxDigits ?? DEFAULT_UNIT_PRICE_MAX_DIGITS);
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(safeValue)} ${currency}`;
}

export function toMinorUnits(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  locale = activeLocale,
) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return 0;
  const digits = currencyFractionDigits(currencyCode, locale);
  // Shift the decimal point by re-parsing the string form instead of multiplying by
  // 10**digits, so exact half-unit inputs round decimal-correctly rather than hitting
  // IEEE-754 artifacts (e.g. 1.005 * 100 === 100.49999999999999, which would truncate
  // to 1.00 instead of 1.01). Falls back to the plain multiply for exponential strings.
  const shifted = Number(`${value}e${digits}`);
  return Math.round(Number.isFinite(shifted) ? shifted : value * 10 ** digits);
}

export function fromMinorUnits(
  minorUnits: number,
  currencyCode: string | null | undefined,
  locale = activeLocale,
) {
  const digits = currencyFractionDigits(currencyCode, locale);
  const value = Number(`${minorUnits}e-${digits}`);
  return Number.isFinite(value) ? value : minorUnits / 10 ** digits;
}

export function roundToMinorUnits(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  locale = activeLocale,
) {
  return fromMinorUnits(toMinorUnits(amount, currencyCode, locale), currencyCode, locale);
}

export function sumMoney(
  amounts: Array<number | string | null | undefined>,
  currencyCode: string | null | undefined,
  locale = activeLocale,
) {
  const totalMinorUnits = amounts.reduce<number>(
    (sum, amount) => sum + toMinorUnits(amount, currencyCode, locale),
    0,
  );
  return fromMinorUnits(totalMinorUnits, currencyCode, locale);
}

export function convertToBase(
  amount: number | string | null | undefined,
  rate: number | string | null | undefined,
  baseCurrencyCode = 'VND',
  locale = activeLocale,
) {
  const converted = Number(amount ?? 0) * Number(rate ?? 1);
  return roundToMinorUnits(Number.isFinite(converted) ? converted : 0, baseCurrencyCode, locale);
}

export function convertMoney(
  amount: number | string | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  rateToVnd: (code: string | null | undefined) => number,
  locale = activeLocale,
) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return 0;
  if (from === to) return roundToMinorUnits(value, to, locale);

  const fromRate = Number(rateToVnd(from));
  const toRate = Number(rateToVnd(to));
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    return 0;
  }

  return roundToMinorUnits((value * fromRate) / toRate, to, locale);
}
