export type QuotationValidityLevel = 'none' | 'expired' | 'today' | 'soon' | 'valid';

export const QUOTATION_EXPIRY_SOON_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Trang thai hieu luc cua bao gia tinh theo ngay lich (am neu da het han). */
export function quotationValidityState(
  validUntil: string | null,
  now: Date = new Date(),
): { level: QuotationValidityLevel; days: number } {
  if (!validUntil) return { level: 'none', days: 0 };

  const end = new Date(`${validUntil}T00:00:00`);
  if (Number.isNaN(end.getTime())) return { level: 'none', days: 0 };

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end.getTime() - startOfToday.getTime()) / MS_PER_DAY);

  if (days < 0) return { level: 'expired', days };
  if (days === 0) return { level: 'today', days };
  if (days <= QUOTATION_EXPIRY_SOON_DAYS) return { level: 'soon', days };
  return { level: 'valid', days };
}
