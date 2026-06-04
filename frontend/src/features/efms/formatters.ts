export function cleanString(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function fromDateTimeLocalInput(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const date = new Date(cleaned);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function toNumberInputValue(value: number | string | null | undefined): number | '' {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
}

export function formatOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
}

export function formatMoney(amount: number | string, currency: string) {
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric.toLocaleString() : String(amount);
  return `${value} ${currency}`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
