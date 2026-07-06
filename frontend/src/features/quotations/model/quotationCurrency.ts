import { convertToBase, sumMoney } from '@shared/utils/money';

export type CurrencyLine = { currency: string | null; amount: number; taxable?: boolean };
export type CurrencySubtotal = { currency: string; subtotal: number; tax: number; total: number };
export type CurrencySummary = { byCurrency: CurrencySubtotal[]; internalVndTotal: number };

const TAX_RATE = 0.1;

export function summarizeByCurrency(
  lines: CurrencyLine[],
  rateToVnd: (code: string | null | undefined) => number,
): CurrencySummary {
  const buckets = new Map<string, { amounts: number[]; taxes: number[] }>();

  for (const line of lines) {
    const currency = line.currency?.trim();
    const amount = Number(line.amount);
    if (!currency || !Number.isFinite(amount) || amount <= 0) continue;

    const bucket = buckets.get(currency) ?? { amounts: [], taxes: [] };
    bucket.amounts.push(amount);
    if (line.taxable) bucket.taxes.push(amount * TAX_RATE);
    buckets.set(currency, bucket);
  }

  const byCurrency: CurrencySubtotal[] = [];
  let internalVndTotal = 0;

  for (const [currency, bucket] of buckets) {
    const subtotal = sumMoney(bucket.amounts, currency);
    const tax = sumMoney(bucket.taxes, currency);
    const total = sumMoney([subtotal, tax], currency);

    byCurrency.push({ currency, subtotal, tax, total });
    internalVndTotal += convertToBase(total, rateToVnd(currency), 'VND');
  }

  return { byCurrency, internalVndTotal: sumMoney([internalVndTotal], 'VND') };
}
