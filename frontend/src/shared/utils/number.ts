import { getMoneyLocale } from '@shared/utils/money';

type NumberFormatOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type CompactFormatOptions = NumberFormatOptions & {
  threshold?: number;
  compactMaximumFractionDigits?: number;
};

function numericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(value: number | string | null | undefined, options: NumberFormatOptions = {}) {
  const parsed = numericValue(value);
  if (parsed === null) return '-';
  return new Intl.NumberFormat(options.locale ?? getMoneyLocale(), {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  }).format(parsed);
}

export function formatInteger(value: number | string | null | undefined, options: Omit<NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {}) {
  return formatNumber(value, { ...options, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatCompact(value: number | string | null | undefined, options: CompactFormatOptions = {}) {
  const parsed = numericValue(value);
  if (parsed === null) return '-';
  const locale = options.locale ?? getMoneyLocale();
  const threshold = options.threshold ?? 10_000;
  if (Math.abs(parsed) < threshold) return formatNumber(parsed, options);
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: options.compactMaximumFractionDigits ?? 1,
  }).format(parsed);
}
