import { convertToBase, sumMoney } from '@shared/utils/money';

export type CurrencyLine = { currency: string | null; amount: number };
export type CurrencySubtotal = { currency: string; subtotal: number; tax: number; total: number };
export type CurrencySummary = { byCurrency: CurrencySubtotal[]; internalVndTotal: number };

export function summarizeByCurrency(
  lines: CurrencyLine[],
  rateToVnd: (code: string | null | undefined) => number,
): CurrencySummary {
  const buckets = new Map<string, number[]>();

  for (const line of lines) {
    const currency = line.currency?.trim();
    const amount = Number(line.amount);
    if (!currency || !Number.isFinite(amount) || amount <= 0) continue;

    const bucket = buckets.get(currency) ?? [];
    bucket.push(amount);
    buckets.set(currency, bucket);
  }

  const byCurrency: CurrencySubtotal[] = [];
  let internalVndTotal = 0;

  for (const [currency, amounts] of buckets) {
    const subtotal = sumMoney(amounts, currency);
    const tax = 0;
    const total = subtotal;

    byCurrency.push({ currency, subtotal, tax, total });
    internalVndTotal += convertToBase(total, rateToVnd(currency), 'VND');
  }

  return { byCurrency, internalVndTotal: sumMoney([internalVndTotal], 'VND') };
}
