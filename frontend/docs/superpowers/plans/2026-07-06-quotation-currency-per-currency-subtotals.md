# Quotation Currency Redisplay — Per-Currency Subtotals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confusing per-line "≈ VND" helper + forced single-VND grand total with an honest currency model: each charge line keeps its own currency (no global default, blank until chosen), the quote shows a **subtotal per currency**, a single **reference exchange rate** is shown once, and an optional **internal VND-equivalent** total is clearly labeled.

**Architecture:** This is a **delta on** `docs/superpowers/plans/2026-07-06-quotation-form-3-groups-per-line-currency.md`. That plan's Parts A (backend seed + `charge_group`), B1 (currency-rates client + `useExchangeRates`), B2 (charge-line `currency_code`/`charge_group` DTO), C1 (`QUOTATION_CHARGE_GROUPS`), the 3-group form skeleton (E1 structure), E2/E3 (create-from-RFQ routing + entry points), and F (cleanup/docs) are unchanged. **This plan supersedes** that plan's Task D1 (fee-table VND helper), the currency parts of Task E1 (default-currency select + VND total), and Task E5 (detail VND display). Execute the base plan for everything else; execute **this** plan for the currency-display tasks.

**Tech Stack:** React 18, TypeScript strict, Vite, `@tanstack/react-query`, Mantine, Vitest. Money via `@shared/utils/money` (`sumMoney`, `convertToBase` — minor-unit-safe). Seeded rates via `GET /v1/currency-rates` (from base plan B1).

## Global Constraints

- **No global default currency** for charge lines. Each line has its own currency `Select`, **blank until the user picks it**; no default price either.
- **Never merge different currencies into one customer-facing total.** Show a subtotal per currency. The only cross-currency number is an **optional internal VND-equivalent**, always labeled "internal reference".
- Exchange rate comes from the seeded `GET /v1/currency-rates` table (base plan B1). The reference rate is shown **once** at quote level, not per line.
- Money math uses `sumMoney(amounts, code)` per currency bucket and `convertToBase(amount, rateToVnd(code), 'VND')` for the internal total. Never sum floats ad hoc.
- New UI strings go in **both** EN and VI maps in `src/shared/i18n/messages.ts`.
- Run `npm run verify` (frontend) before done.

---

## File Structure

- `src/features/quotations/model/quotationCurrency.ts` — new pure helper `summarizeByCurrency` (create).
- `src/features/quotations/model/__tests__/quotationCurrency.test.ts` — test (create).
- `src/features/quotations/components/QuotationFeeTable.tsx` — currency column stays; **remove** the inline VND helper; line currency starts blank (modify).
- `src/features/quotations/components/QuotationForm.tsx` — remove default-currency select; per-currency subtotal rail + single reference rate + optional internal total (modify).
- `src/features/quotations/components/QuotationDetail.tsx` — per-currency subtotals; each line in its own currency; reference rate (modify).
- `src/shared/i18n/messages.ts` — new keys (modify).
- `docs/FE_rule.md`, `docs/API_CONTRACT.md` — note VND is not a forced total (modify).

---

## Task 1: `summarizeByCurrency` pure helper

**Files:**
- Create: `src/features/quotations/model/quotationCurrency.ts`
- Test: `src/features/quotations/model/__tests__/quotationCurrency.test.ts`

**Interfaces produced:**
```ts
export type CurrencyLine = { currency: string | null; amount: number; taxable?: boolean };
export type CurrencySubtotal = { currency: string; subtotal: number; tax: number; total: number };
export type CurrencySummary = { byCurrency: CurrencySubtotal[]; internalVndTotal: number };
export function summarizeByCurrency(
  lines: CurrencyLine[],
  rateToVnd: (code: string | null | undefined) => number,
): CurrencySummary;
```

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, expect, it } from 'vitest';
import { summarizeByCurrency } from '../quotationCurrency';

const rate = (code: string | null | undefined) => (code === 'USD' ? 26301 : code === 'VND' ? 1 : 1);

describe('summarizeByCurrency', () => {
  it('groups subtotals per currency and never merges currencies', () => {
    const summary = summarizeByCurrency(
      [
        { currency: 'USD', amount: 1200, taxable: false },
        { currency: 'USD', amount: 250, taxable: false },
        { currency: 'VND', amount: 3_500_000, taxable: true },
      ],
      rate,
    );
    expect(summary.byCurrency).toEqual([
      { currency: 'USD', subtotal: 1450, tax: 0, total: 1450 },
      { currency: 'VND', subtotal: 3_500_000, tax: 350_000, total: 3_850_000 },
    ]);
  });

  it('computes an internal VND-equivalent across currencies', () => {
    const summary = summarizeByCurrency([{ currency: 'USD', amount: 100, taxable: false }], rate);
    expect(summary.internalVndTotal).toBe(2_630_100);
  });

  it('skips lines with no currency or non-positive amount', () => {
    const summary = summarizeByCurrency(
      [{ currency: null, amount: 100 }, { currency: 'USD', amount: 0 }],
      rate,
    );
    expect(summary.byCurrency).toEqual([]);
    expect(summary.internalVndTotal).toBe(0);
  });
});
```

- [ ] **Step 2: Run — Expected FAIL** (`npx vitest run src/features/quotations/model/__tests__/quotationCurrency.test.ts`).

- [ ] **Step 3: Implement `quotationCurrency.ts`:**

```ts
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
```

- [ ] **Step 4: Run — Expected PASS.**
- [ ] **Step 5: Commit** `git add src/features/quotations/model/quotationCurrency.ts src/features/quotations/model/__tests__/quotationCurrency.test.ts && git commit -m "feat(quotation): per-currency subtotal summary helper"`

---

## Task 2: Fee table — currency column stays, remove VND helper, blank currency

**Files:** Modify `src/features/quotations/components/QuotationFeeTable.tsx`

> This replaces base-plan Task D1. The currency `Select` column and per-line `formatMoney` in the line's own currency remain; the inline `≈ … VND` helper is **removed** (it was the confusion source). `seedLineState` currency defaults to **null** (blank), not `'USD'`.

- [ ] **Step 1:** In `seedLineState`, default currency to `null`:

```ts
export function seedLineState(chargeCode: ChargeCode | null | undefined, defaultCurrency: string | null = null): ChargeLineState {
  return { chargeCode: chargeCode?.charge_code ?? null, quantity: 1, unit: chargeCode?.default_uom ?? null, unitPrice: '', currency: defaultCurrency };
}
```

- [ ] **Step 2:** Remove the VND-equivalent helper block under the unit-price input (the `vndEquivalent` `<Text>`), and delete the `vndEquivalent`/`convertToBase` computation and the `rateToVnd` usage inside the row. Keep the currency `Select` cell and `formatMoney(total, lineCurrency)` for the per-line total. Drop `rateToVnd` and `convertToBase` from this file's props/imports if now unused.

- [ ] **Step 3:** Confirm the row still renders: fee `Select`, qty, uom, unit price, **currency `Select`**, line total, remove. The line total uses the row's own currency; no VND text anywhere in the table.

- [ ] **Step 4: Typecheck** `npx tsc --noEmit` → errors only in `QuotationForm.tsx` (Task 3). File compiles.
- [ ] **Step 5: Commit** `git commit -am "refactor(quotation): fee table drops inline VND helper; blank line currency"`

---

## Task 3: Quotation form — per-currency subtotals + single reference rate

**Files:** Modify `src/features/quotations/components/QuotationForm.tsx`

> This replaces the currency parts of base-plan Task E1. Keep the 3 groups, options, all-charge-codes dropdown, and create-from-RFQ/revise submit. **Remove** the "default currency for new fee lines" `Select`. Compute display from `summarizeByCurrency`.

- [ ] **Step 1: Remove the default-currency select.** Delete the `currency` state's role as a global default and the `Select` labeled `quotations.defaultCurrency` from the RFQ-context grid. New fee lines seed with `currency: null` (Task 2). Keep `validUntil`. (If `currency` is still referenced for the create payload's `currency_code`, pass `null` / omit it — the quotation-level `currency_code` is no longer a pricing default; leave the backend field as-is defaulting server-side.)

- [ ] **Step 2: Build the currency lines + summary.** Replace the `totalVnd` memo with:

```tsx
import { summarizeByCurrency } from '../model/quotationCurrency';
import { formatMoney } from '@shared/utils/money';
// rateToVnd already available from useExchangeRates()

const currencySummary = useMemo(
  () =>
    summarizeByCurrency(
      allLines
        .map(({ line }) => {
          const amount = Number(line.quantity) * Number(line.unitPrice);
          const cc = findChargeCode(line.chargeCode);
          return { currency: line.currency, amount: Number.isFinite(amount) ? amount : 0, taxable: Boolean(cc?.taxable) };
        }),
      rateToVnd,
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allLines, chargeCodes, rateToVnd],
);
```

- [ ] **Step 3: Reference rate line.** Compute the USD→VND reference (or the first non-VND currency present) once:

```tsx
const referenceCurrency = currencySummary.byCurrency.find((row) => row.currency !== 'VND')?.currency ?? 'USD';
const referenceRate = rateToVnd(referenceCurrency);
```

- [ ] **Step 4: Rail summary UI.** Replace the single VND total card with per-currency subtotals + reference rate + optional internal total:

```tsx
<div className="rfq-total-card">
  <Text size="xs" tt="uppercase" fw={800} c="dimmed">{t('quotations.subtotalsByCurrency')}</Text>
  {currencySummary.byCurrency.length === 0 ? (
    <Text size="sm" c="dimmed">{t('quotations.enterAtLeastOneFee')}</Text>
  ) : (
    currencySummary.byCurrency.map((row) => (
      <Group key={row.currency} justify="space-between">
        <Text size="sm" fw={700}>{t('quotations.subtotalPrefix')} {row.currency}</Text>
        <Text fw={900} className="tabular-nums">{formatMoney(row.total, row.currency)}</Text>
      </Group>
    ))
  )}
  <Text size="xs" c="dimmed" mt="xs">
    {t('quotations.referenceRate')}: 1 {referenceCurrency} = {new Intl.NumberFormat('vi-VN').format(referenceRate)} VND
  </Text>
  {currencySummary.byCurrency.length > 1 ? (
    <Text size="xs" c="dimmed">{t('quotations.internalVndTotal')}: ≈ {formatMoney(currencySummary.internalVndTotal, 'VND')}</Text>
  ) : null}
</div>
```

- [ ] **Step 5: canSubmit.** A line is valid when it has a charge code, `unitPrice > 0`, **and a currency**. Update:

```tsx
const filledLineCount = allLines.filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0 && line.currency).length;
const canSubmit = filledLineCount > 0;
```

- [ ] **Step 6: buildChargeLines** already sets `currency_code: line.currency` and `charge_group` (base plan E1). No change needed beyond ensuring lines without a currency are filtered out (Step 5's filter). Remove any `currency`-as-default fallback when mapping `currency_code`.

- [ ] **Step 7:** Update the hero metric that showed `formatMoney(totalVnd, 'VND')` to show the count of currencies or the first subtotal (e.g. `currencySummary.byCurrency.length` currencies). Remove remaining `totalVnd` references.

- [ ] **Step 8: Typecheck** `npx tsc --noEmit` → PASS after Task 5 (i18n). Manual: add a USD freight line + a VND local line → rail shows two subtotals + one reference rate + internal VND line.
- [ ] **Step 9: Commit** `git commit -am "feat(quotation): per-currency subtotals + single reference rate; remove default currency"`

---

## Task 4: Detail — per-currency subtotals + own-currency lines

**Files:** Modify `src/features/quotations/components/QuotationDetail.tsx`

> Replaces base-plan Task E5.

- [ ] **Step 1:** Render each charge-line numeric cell in the **line's own** currency: use `line.currency_code ?? quotation.currency_code` in the three `formatAmount(...)` calls (unit price, tax, total). Change the money column header from `quotations.moneyCurrencyHeader` to the generic `quotations.lineTotal`.

- [ ] **Step 2:** Replace the single breakdown total with per-currency subtotals via the helper:

```tsx
import { summarizeByCurrency } from '../model/quotationCurrency';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
// in component
const { rateToVnd } = useExchangeRates();
const currencySummary = summarizeByCurrency(
  chargeLines.map((line) => ({
    currency: line.currency_code ?? null,
    amount: Number(line.amount ?? Number(line.quantity) * Number(line.unit_price)),
    taxable: Number(line.tax_rate) > 0,
  })),
  rateToVnd,
);
```

Render, in place of the single `rfq-breakdown-total`:

```tsx
<div className="rfq-breakdown-total">
  <Stack gap={2} style={{ width: '100%' }}>
    {currencySummary.byCurrency.map((row) => (
      <Group key={row.currency} justify="space-between">
        <Text fw={800}>{t('quotations.subtotalPrefix')} {row.currency}</Text>
        <Text fw={900} className="tabular-nums">{formatMoney(row.total, row.currency)}</Text>
      </Group>
    ))}
    {currencySummary.byCurrency.length > 1 ? (
      <Text size="xs" c="dimmed" ta="right">{t('quotations.internalVndTotal')}: ≈ {formatMoney(currencySummary.internalVndTotal, 'VND')}</Text>
    ) : null}
  </Stack>
</div>
```

- [ ] **Step 3:** Update the hero total (top-right of the detail): if a single currency, show that subtotal; if multiple, show the internal VND equivalent with an `(nội bộ)` caption. Keep it simple: `currencySummary.byCurrency.length === 1 ? formatMoney(currencySummary.byCurrency[0].total, currencySummary.byCurrency[0].currency) : formatMoney(currencySummary.internalVndTotal, 'VND')`.

- [ ] **Step 4: Typecheck** `npx tsc --noEmit` → PASS after Task 5.
- [ ] **Step 5: Commit** `git commit -am "feat(quotation): detail per-currency subtotals; each line in own currency"`

---

## Task 5: i18n + docs

**Files:** Modify `src/shared/i18n/messages.ts`, `docs/FE_rule.md`, `docs/API_CONTRACT.md`

- [ ] **Step 1:** Add to BOTH EN and VI maps (and **remove** the base-plan keys `quotations.defaultCurrency`, `quotations.computedTotalVnd` if this plan runs after the base plan added them):

EN:
```ts
'quotations.subtotalsByCurrency': 'Subtotals by currency',
'quotations.subtotalPrefix': 'Subtotal',
'quotations.referenceRate': 'Reference rate',
'quotations.internalVndTotal': 'Internal VND equivalent',
```
VI:
```ts
'quotations.subtotalsByCurrency': 'Tổng theo từng loại tiền',
'quotations.subtotalPrefix': 'Tạm tính',
'quotations.referenceRate': 'Tỷ giá tham khảo',
'quotations.internalVndTotal': 'Quy đổi VND (nội bộ)',
```

- [ ] **Step 2: Docs.** In `FE_rule.md §9`: charge lines have per-line currency (no global default, blank until chosen); quotes show a subtotal per currency; the exchange rate is a single reference line; any VND grand total is an **internal reference only**, never the customer total. In `API_CONTRACT.md`: note that quote totals are **not** a single merged currency — clients present per-currency subtotals + an optional internal VND equivalent.

- [ ] **Step 3: Commit** `git commit -am "i18n+docs(quotation): per-currency subtotals, reference rate"`

---

## Task 6: Verify

- [ ] **Step 1:** `cd PROJECT-PRODUCT/frontend && npm run verify` → PASS.
- [ ] **Step 2: E2E (both packages up):** Create a quotation from an RFQ, add a **USD** freight line and a **VND** local line (each line's currency chosen individually; no default preset). Confirm: the form rail shows `Subtotal USD …` and `Subtotal VND …` separately, one `Reference rate: 1 USD = 26.301 VND` line, and an `Internal VND equivalent ≈ …`. No `≈ VND` text under any price. Save → detail shows the same per-currency subtotals and each line in its own currency.

## Self-Review (delta vs design)

- No global default currency; per-line, blank until chosen → Task 2 (`seedLineState` null), Task 3 (remove select), Task 3 Step 5 (currency required). ✅
- Per-currency subtotals, no forced merge → Task 1 helper, Task 3/4 UI. ✅
- Single reference rate shown once; inline per-line helper removed → Task 2 (remove helper), Task 3 Step 4. ✅
- Optional internal VND-equivalent, clearly labeled → Task 1 `internalVndTotal`, Task 3/4 `quotations.internalVndTotal`. ✅
- Type names consistent: `summarizeByCurrency`, `CurrencySummary.byCurrency/internalVndTotal`, `CurrencySubtotal.total` used identically in Tasks 1/3/4. ✅
