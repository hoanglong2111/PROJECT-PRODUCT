type FormatMoneyOptions = {
  locale?: string;
};

function normalizeCurrencyCode(currencyCode: string | null | undefined) {
  return (currencyCode || 'USD').trim().toUpperCase();
}

function defaultLocale() {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang === 'vi' ? 'vi-VN' : document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

export function currencyFractionDigits(currencyCode: string | null | undefined, locale = defaultLocale()) {
  const currency = normalizeCurrencyCode(currencyCode);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  options: FormatMoneyOptions = {},
) {
  const currency = normalizeCurrencyCode(currencyCode);
  const locale = options.locale ?? defaultLocale();
  const digits = currencyFractionDigits(currency, locale);
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = roundToMinorUnits(safeValue, currency, locale);

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded)} ${currency}`;
}

export function toMinorUnits(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  locale = defaultLocale(),
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
  locale = defaultLocale(),
) {
  const digits = currencyFractionDigits(currencyCode, locale);
  const value = Number(`${minorUnits}e-${digits}`);
  return Number.isFinite(value) ? value : minorUnits / 10 ** digits;
}

export function roundToMinorUnits(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  locale = defaultLocale(),
) {
  return fromMinorUnits(toMinorUnits(amount, currencyCode, locale), currencyCode, locale);
}

export function sumMoney(
  amounts: Array<number | string | null | undefined>,
  currencyCode: string | null | undefined,
  locale = defaultLocale(),
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
  locale = defaultLocale(),
) {
  const converted = Number(amount ?? 0) * Number(rate ?? 1);
  return roundToMinorUnits(Number.isFinite(converted) ? converted : 0, baseCurrencyCode, locale);
}

export function convertMoney(
  amount: number | string | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  rateToVnd: (code: string | null | undefined) => number,
  locale = defaultLocale(),
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
