# Quotation Form Redesign — 3 Manual Groups + Per-Line Currency + Manual Create

**Date:** 2026-07-06
**Status:** Approved design (pre-plan)
**Scope:** `PROJECT-PRODUCT/frontend` (quotations + quotation-requests features, shared api/lib) and `kbi-mock-api` (mock endpoints + seed). Contract is frontend-owned.

## Context

The Quotation form today derives a "mandatory / suggested" charge section from the Incoterm
scope (`incotermChargeGroups`) filtered by transport mode, rendered as 7 macro groups with a
per-charge-code checkbox, plus a separate manual "Other fees" table. Creating a quotation from
an RFQ currently **auto-creates** a DRAFT (`createQuotationFromRequest`) and jumps straight to
it — FDS never gets a manual price-entry step first. Charges are single-currency per quotation.

FDS wants a simpler, fully manual pricing UX: three flat buckets (Freight / Origin / Destination)
that FDS fills by hand, per-fee currency with a live VND helper so a sales user can see
`20 USD ≈ 526.020 VND` while typing, and a real "enter prices → confirm → create" flow instead of
silent auto-create. The Incoterm-suggested-charge concept is being removed entirely.

## Goals

1. Replace the 7-group + Incoterm-suggested + checkbox model with **3 manual collapsible groups**:
   `FREIGHT`, `ORIGIN`, `DESTINATION`. Nothing else on the charge board.
2. "Thêm phí" in any group opens a **searchable dropdown listing ALL charge codes** (no group/scope
   filtering). The group a fee lands in is chosen by *where FDS adds it* and is **persisted**.
3. **Per-line currency**: each fee row has a currency Select; while editing it shows both the entered
   amount and its VND equivalent (helper). On detail/send, each line shows in its own currency.
   Quote totals normalize every line to VND and sum there.
4. Exchange rate from a **seeded mock rate table** (no bank API).
5. "Tạo báo giá" (from RFQ detail and from the Quotations screen) **opens the manual form** prefilled
   with read-only RFQ context; the quotation is created **only on confirm**, not on button click.
6. Remove the Incoterm-suggested-charge rule + memory; update docs.

## Non-Goals

- No live/bank exchange-rate integration.
- No change to the RFQ intake form, RFQ status machine, or PO-from-RFQ prefill.
- No change to the quotation status lifecycle (DRAFT → PENDING_APPROVAL → CONFIRMED/REJECTED) or the
  options / select-option / confirm-gate behavior.
- The 7-group / 9-category taxonomy stays in Charge Code master data and its master-data page — only
  the *quotation* form stops using it for bucketing.

## Current State (verified)

- `QuotationForm.tsx` — mandatory section built from `sections` (`incotermChargeGroups` × mode ×
  `is_active`), per-code checkbox via `QuotationFeeTable` toggle mode; separate "Other fees" table
  (`editableFee`) with `CHARGE_GROUPS` chip filter feeding the Add-fee dropdown.
- `QuotationFeeTable.tsx` — one table, two modes: checkbox/toggle (`showToggle`) vs editable-fee
  (`editableFee`, `removable`). Columns: fee, qty, uom, unit price, line total. Uses a single
  `currency` prop for `formatMoney`.
- `shared/lib/quotationCharges.ts` — `incotermChargeGroups` (→ `defaultScopeForIncoterm` in
  `incotermChargeScope.ts`), `modeToChargeFlag`, `chargeCodeToChargeType`.
- `shared/lib/chargeCategories.ts` — `CHARGE_GROUPS` (7), `CHARGE_CATEGORIES` (9).
- `QuotationChargeLinePayload` / `QuotationChargeLineV1` — no `currency_code`, no `charge_group`.
- Currency master (`tradeMasterData.ts`) — has `currency_code` + `decimal_places`, **no rate**.
- `money.ts` — already has `convertToBase(amount, rate, 'VND')`, `sumMoney`, minor-unit-safe helpers.
- RFQ create: `QuotationRequestDetail.tsx` calls `createQuotationFromRequest(requestId)` (no body) →
  auto-creates DRAFT → `navigate('/quotations?view=...')`.

## Design

### A. Charge board — 3 manual collapsible groups

- New constant `QUOTATION_CHARGE_GROUPS = [{ value:'FREIGHT' }, { value:'ORIGIN' }, { value:'DESTINATION' }]`
  with i18n `labelKey`s (live alongside or replacing the quotation usage of `CHARGE_GROUPS`).
- `QuotationForm` state becomes a single `Record<'FREIGHT'|'ORIGIN'|'DESTINATION', FeeLineDraft[]>`
  (or one flat array carrying `charge_group`). Each group renders:
  - a collapsible header (reuse existing chevron/`Collapse` behavior + count badge),
  - the editable `QuotationFeeTable` over that group's lines,
  - a "Thêm phí" button appending an empty line to that group.
- **Removed** from the form: `mandatory`, `getMandatoryLine`, `toggleMandatory`, `sections`,
  `suggestedChargeCodes`, `suggestedChargeCodeSet`, `includedGroups`, `feeProgress`, the
  Incoterm-scope summary, the `otherGroup` chip row, the mandatory/other split.
- The Add-fee dropdown data = **all active charge codes** (`chargeCodeOptions`, already built as
  `${charge_code} - ${charge_name_en}`), searchable. No `filteredChargeCodeOptions`.
- `chargeCodeToChargeType(code, mode)` is **kept** to populate `charge_type` on save (shipment-margin
  roll-up depends on it). Revise seeding re-buckets each source line by its persisted `charge_group`.

### B. Per-line currency + VND helper

- New mock collection `mock-data/currency_rates.json`: `[{ code:'USD', vnd_rate:26301 }, { code:'CNY',
  vnd_rate:3620 }, { code:'EUR', vnd_rate:28450 }, { code:'JPY', vnd_rate:172 }, { code:'VND',
  vnd_rate:1 }]` (representative values; VND base = 1). Exposed via `GET /v1/currency-rates`
  (envelope `{ data, meta, errors }`).
- Frontend: `shared/api/currencyRates.ts` client (`fetchCurrencyRates`) + `useExchangeRates()` hook
  returning `{ rateToVnd(code): number, isLoading }`. `rateToVnd` falls back to 1 for unknown codes.
- `QuotationFeeTable` changes:
  - drop toggle/checkbox mode entirely (`showToggle`, `onToggle`, `enabled` gating) — every row is an
    editable fee row now,
  - add a **currency Select** column per row (data = currency master options),
  - under the unit-price input show a dimmed helper `≈ {convertToBase(qty×price, rateToVnd(lineCcy))} VND`
    (skip when line currency is already VND),
  - `formatMoney(lineTotal, row.currency)` uses the row's own currency, not a form-wide one.
  - `ChargeLineState` gains `currency: string | null`.
- Form top "currency" Select is repurposed as **default currency for new fee lines** (seeded from the
  quotation/RFQ currency or USD). Quote totals: convert each line to VND via `rateToVnd`, `sumMoney`
  in VND; the totals card + rail show VND. Tax stays per-line (charge code `taxable` → 10%),
  normalized to VND for totals.

### C. Manual "Tạo báo giá" flow (no auto-create)

- Extend `createQuotationFromRequest(rfqId, payload?)` where
  `payload = { currency_code?, valid_until?, charge_lines?: QuotationChargeLinePayload[],
  options?: CreateQuotationOptionPayload[] }`. Backend creates the DRAFT (copying RFQ header:
  customer/supplier/route/mode/incoterm), writes the charge lines + options in the same call, and
  returns the quotation.
- `QuotationForm` gains an RFQ-context create mode: given an RFQ (or an RFQ id + its read-only header),
  it renders the read-only context card (as today) + the new 3-group board + options, and on submit
  calls `createQuotationFromRequest(rfqId, payload)` instead of `createQuotationVersion`. Revise mode
  (existing DRAFT/rejected quotation) keeps using `createQuotationVersion`.
- Entry points:
  - **RFQ detail** "Tạo báo giá": opens the form (navigate to a quotations create route carrying the
    rfq id, e.g. `/quotations?create=1&rfq=<id>`, or render inline) — does **not** create on click.
  - **Quotations screen** "Tạo báo giá": opens an RFQ picker (SUBMITTED/RECEIVED RFQs) → same form.
  - On successful create → navigate to `/quotations?view=<newId>`.

### D. Contract / DTO changes

- `QuotationChargeLinePayload` and `QuotationChargeLineV1` gain:
  - `currency_code?: string | null`
  - `charge_group?: 'FREIGHT' | 'ORIGIN' | 'DESTINATION' | null`
- Backend mock persists/echoes both; `amount`/`total` still per line in its own currency; quote-level
  `total_amount`/`grand_total_amount` stored in VND.
- `API_CONTRACT.md`: document `GET /v1/currency-rates`, the new charge-line fields, the extended
  `POST /quotation-requests/:id/quotations` body, and "quote totals are VND-normalized".

### E. Cleanup

- Delete memory `quotation-incoterms-form.md`; update `MEMORY.md` index. Add a new memory describing
  the 3-group + per-line-currency + manual-create form.
- `FE_rule.md §9`: remove the Incoterm-scope-drives-suggested-charges rule; document the 3 manual
  groups, per-line currency + VND helper + seeded rates, and manual create-on-confirm.
- Remove now-unused code: `incotermChargeGroups` + `incotermChargeScope.ts`/`defaultScopeForIncoterm`
  (verify no other consumer via grep first), suggested-charge/mandatory i18n strings, `CHARGE_GROUPS`
  import in the quotation form (keep the export if the master-data page still uses it).
- i18n (EN+VI): add `quotations.group.freight/origin/destination`, `quotations.lineCurrency`,
  `quotations.vndEquivalent`; keep `quotations.addFee`.

### F. Exchange-rate recommendation (answered)

Seeded mock rate table — deterministic, offline-demoable, keeps the frontend backend-agnostic; a real
backend later swaps a live source behind the same `GET /v1/currency-rates` shape. No bank API now.

## Verification

- `cd PROJECT-PRODUCT/frontend && npm run verify` (boundaries + typecheck + test + build) passes.
- Unit: `QuotationFeeTable` renders currency column + VND helper; `rateToVnd` fallback = 1;
  VND-normalized totals sum a mixed-currency line set correctly (minor-unit-safe).
- E2E (both packages up):
  1. RFQ detail → "Tạo báo giá" → manual form opens (nothing created yet; no new quotation in list).
  2. Add fees across all 3 groups from the all-charge-codes dropdown; set different currencies; VND
     helper updates live (`20 USD ≈ 526.020 VND`).
  3. Add ≥2 options → Confirm/create → one DRAFT quotation created with the lines (each carrying
     `currency_code` + `charge_group`) + options; land on its detail.
  4. Detail shows each line in its own currency; totals in VND.
  5. Quotations screen "Tạo báo giá" → RFQ picker → same form → create.
  6. No Incoterm-suggested section anywhere; only Freight/Origin/Destination groups.
