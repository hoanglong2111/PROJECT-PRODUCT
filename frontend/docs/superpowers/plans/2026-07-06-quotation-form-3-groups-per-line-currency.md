# Quotation Form — 3 Manual Groups + Per-Line Currency + Manual Create — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Quotation form's Incoterm-suggested 7-group + checkbox charge model with three manual collapsible groups (Freight / Origin / Destination) whose "Thêm phí" dropdown lists all charge codes, give every fee line its own currency with a live VND helper (seeded rates), and make "Tạo báo giá" open a manual price form that creates the quotation only on confirm.

**Architecture:** Frontend (React/Vite/TS/Mantine/React Query) drives the change; the mock backend already stores `currency_code` per charge line, so backend work is only (a) persist a new `charge_group` field, (b) a seeded `GET /v1/currency-rates` table. The quotation form becomes a flat 3-bucket editor over one draft-line array carrying `charge_group` + `currency`; totals normalize each line to VND via the rate table (`convertToBase`) and sum with `sumMoney`. Create-from-RFQ posts charge lines + options through the existing `POST /quotation-requests/:id/quotations` (extended with a body) instead of auto-creating on button click.

**Tech Stack:** Backend `kbi-mock-api` (Node ≥20.19, Express 5 ESM, `MockJsonRepository` over `mock-data/*.json`, Vitest smoke). Frontend (React 18, TypeScript strict, Vite, `@tanstack/react-query`, Mantine, Axios, Vitest, dev-only zod contract guards, `dependency-cruiser`).

## Global Constraints

- **npm only**, Node `>=20.19.0`, both packages.
- Frontend is **backend-agnostic**: features call typed clients in `src/shared/api`; never import mock JSON or call `/v1/mock/*` (ratchet `src/shared/api/__tests__/mockScaffoldingBudget.test.ts` budget = **0**).
- All `/v1` responses use the envelope `{ data, meta, errors }`; read from `response.data.data`.
- Money uses `@shared/utils/money` (`formatMoney`, `sumMoney`, `convertToBase` — all minor-unit-safe). Never sum floats ad hoc. **Quote totals are VND-normalized**; each charge line still displays in its own currency.
- Exchange rate comes from a **seeded mock rate table** (`GET /v1/currency-rates`). **No bank/live API.**
- New UI strings go in **both** EN and VI maps in `src/shared/i18n/messages.ts` as `MessageKey` entries.
- The three quotation groups are `FREIGHT | ORIGIN | DESTINATION`, upper-snake enum values. The "Thêm phí" dropdown always lists **all active charge codes** (no group/scope filtering); the group is decided by where the fee is added and is persisted per line.
- `chargeCodeToChargeType(code, mode)` in `shared/lib/quotationCharges.ts` **stays** (populates `charge_type`, consumed by the shipment-margin roll-up). Only the Incoterm-*scope* logic is removed.
- Run `npm run verify` (boundaries + typecheck + test + build) in the frontend before done.

---

## File Structure

**Backend (`kbi-mock-api/`):**
- `mock-data/currency_rates.json` — new seed (code → vnd_rate).
- `src/modules/mockV1/mockV1.{service,controller,routes}.js` — `charge_group` persistence + `listCurrencyRates` + route (modify).
- `docs/BE_rule.md` — rates + charge_group note (modify).

**Frontend (`PROJECT-PRODUCT/frontend/`):**
- `src/shared/api/currencyRates.ts` — new typed client.
- `src/shared/hooks/useExchangeRates.ts` — new hook (`rateToVnd`).
- `src/shared/api/quotations.ts` — `currency_code`/`charge_group` on charge-line types (modify).
- `src/shared/api/quotationRequests.ts` — `createQuotationFromRequest(id, payload?)` (modify).
- `src/shared/api/queryKeys.ts`, `src/shared/api/contracts/{schemas,index}.ts` — key + zod guard (modify).
- `src/shared/lib/quotationChargeGroups.ts` — new `QUOTATION_CHARGE_GROUPS` constant.
- `src/features/quotations/components/QuotationFeeTable.tsx` — currency column + VND helper, drop toggle mode (modify).
- `src/features/quotations/components/QuotationForm.tsx` — full rewrite (3 groups, all-fees dropdown, per-line currency, VND totals, create-from-RFQ) (modify).
- `src/features/quotations/page.tsx` — create-from-RFQ route (modify).
- `src/features/quotations/components/QuotationListView.tsx` — "Tạo báo giá" button + RFQ picker (modify).
- `src/features/quotations/components/QuotationDetail.tsx` — per-line currency display (modify).
- `src/features/quotation-requests/components/QuotationRequestDetail.tsx` — navigate to form, no auto-create (modify).
- `src/shared/i18n/messages.ts` — new keys (modify).
- `docs/API_CONTRACT.md`, `docs/FE_rule.md` — contract + rules (modify).
- Cleanup: remove `src/shared/lib/incotermChargeScope.ts` + `incotermChargeGroups` if unused after the rewrite.

---

## PART A — Backend (`kbi-mock-api`)

### Task A1: Seed + endpoint for currency rates

**Files:**
- Create: `kbi-mock-api/mock-data/currency_rates.json`
- Modify: `kbi-mock-api/src/modules/mockV1/mockV1.service.js`, `mockV1.controller.js`, `mockV1.routes.js`
- Read first: `kbi-mock-api/scripts/seed-mock-data.js` (how `quotation_options.json` is registered)

- [ ] **Step 1: Create `mock-data/currency_rates.json`** (representative VND rates; VND base = 1):

```json
[
  { "id": "cr_usd", "code": "USD", "vnd_rate": 26301, "is_delete": false },
  { "id": "cr_cny", "code": "CNY", "vnd_rate": 3620, "is_delete": false },
  { "id": "cr_eur", "code": "EUR", "vnd_rate": 28450, "is_delete": false },
  { "id": "cr_jpy", "code": "JPY", "vnd_rate": 172, "is_delete": false },
  { "id": "cr_vnd", "code": "VND", "vnd_rate": 1, "is_delete": false }
]
```

- [ ] **Step 2: Register the collection.** In `mockV1.service.js`, add to the `collections` object (near line 6): `currencyRates: "currency-rates",`. Add to `collectionAliases` (near line 49): `currency_rates: collections.currencyRates,`. Then follow `scripts/seed-mock-data.js`'s existing registration for `quotation_options.json` and add a `currency_rates.json` entry the same way (grep `quotation_options` in that file and mirror the surrounding line).

- [ ] **Step 3: Service fn.** In `mockV1.service.js` add near `listQuotationOptions`:

```js
export async function listCurrencyRates() {
    const rates = await active(collections.currencyRates);
    return rates
        .map((rate) => ({ code: rate.code, vnd_rate: Number(rate.vnd_rate ?? 1) }))
        .sort((left, right) => String(left.code).localeCompare(String(right.code)));
}
```

- [ ] **Step 4: Controller fn.** In `mockV1.controller.js`, copy the envelope wrapper of an existing list handler (e.g. `listQuotationOptions`) as `listCurrencyRates` calling `service.listCurrencyRates()` and returning `{ data, meta: { total: data.length }, errors: [] }` in that file's idiom.

- [ ] **Step 5: Route.** In `mockV1.routes.js`, near the quotations block (after line 101), add:

```js
router.get("/currency-rates", asyncHandler(controller.listCurrencyRates));
```

- [ ] **Step 6: Seed + smoke** (server up):

```bash
cd kbi-mock-api && npm run mock:seed && npm run dev
curl -s localhost:3001/api/v1/currency-rates
```

Expected: `{ "data": [ { "code": "CNY", "vnd_rate": 3620 }, ... ], "meta": { "total": 5 }, "errors": [] }`.

- [ ] **Step 7: Commit**

```bash
git add kbi-mock-api/mock-data/currency_rates.json kbi-mock-api/src/modules/mockV1/ kbi-mock-api/scripts/seed-mock-data.js
git commit -m "feat(mock): seeded currency-rates table + GET /v1/currency-rates"
```

### Task A2: Persist `charge_group` on quotation charge lines

**Files:** Modify `kbi-mock-api/src/modules/mockV1/mockV1.service.js`

**Interfaces produced:** charge-line records now carry `charge_group` (`'FREIGHT'|'ORIGIN'|'DESTINATION'|null`); it is echoed by `getQuotation` (already spreads `...line` in `enrichQuotationChargeLine`, so no serializer change needed).

- [ ] **Step 1:** In `createQuotation` (the charge-line `repo.insert` near line 1697), add the field inside the inserted object, right after `charge_code`:

```js
            charge_group: line.charge_group || null,
```

- [ ] **Step 2:** In `createQuotationVersion` (the charge-line `repo.insert` near line 2073, the "caller supplied edited lines" branch), add the same line after `charge_code`:

```js
            charge_group: line.charge_group || null,
```

- [ ] **Step 3: Smoke** (server up): create a quotation from an RFQ with a body carrying a grouped line, then GET it and confirm `charge_group` round-trips:

```bash
curl -s -X POST localhost:3001/api/v1/quotation-requests/qr-0001/quotations \
  -H "Content-Type: application/json" \
  -d '{"currency_code":"USD","charge_lines":[{"line_no":1,"charge_type":"OCEAN_FREIGHT","charge_code":"OFR","charge_group":"FREIGHT","description":"Ocean freight","quantity":1,"unit":"CNTR","unit_price":1200,"currency_code":"USD"}]}'
```

Expected: response `data.charge_lines[0].charge_group === "FREIGHT"` and `.currency_code === "USD"`.

- [ ] **Step 4: Commit**

```bash
git add kbi-mock-api/src/modules/mockV1/mockV1.service.js
git commit -m "feat(mock): persist charge_group on quotation charge lines"
```

### Task A3: BE docs

**Files:** Modify `kbi-mock-api/docs/BE_rule.md`

- [ ] **Step 1:** Add a short note: `GET /v1/currency-rates` returns `{ code, vnd_rate }` (VND base = 1, seeded, no live source); quotation charge lines carry `currency_code` + `charge_group` (`FREIGHT|ORIGIN|DESTINATION`); quote totals are VND-normalized on the client.
- [ ] **Step 2: Commit** `git commit -am "docs(mock): currency-rates + charge_group"`

---

## PART B — Frontend API layer

### Task B1: Currency-rates client + hook + key + contract guard

**Files:**
- Create: `src/shared/api/currencyRates.ts`, `src/shared/hooks/useExchangeRates.ts`, `src/shared/api/__tests__/currencyRates.test.ts`
- Modify: `src/shared/api/queryKeys.ts`, `src/shared/api/contracts/schemas.ts`, `src/shared/api/contracts/index.ts`

**Interfaces produced:** `CurrencyRateV1 = { code: string; vnd_rate: number }`; `fetchCurrencyRates(): Promise<CurrencyRateV1[]>`; `useExchangeRates(): { rateToVnd: (code: string | null | undefined) => number; isLoading: boolean }`; `queryKeys.currencyRates`.

- [ ] **Step 1: Failing test** `src/shared/api/__tests__/currencyRates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildRateLookup } from '../currencyRates';

describe('buildRateLookup', () => {
  it('maps code to vnd_rate and defaults unknown to 1', () => {
    const lookup = buildRateLookup([{ code: 'USD', vnd_rate: 26301 }]);
    expect(lookup('USD')).toBe(26301);
    expect(lookup('ZZZ')).toBe(1);
    expect(lookup(null)).toBe(1);
  });
});
```

- [ ] **Step 2: Run — Expected FAIL** (`npx vitest run src/shared/api/__tests__/currencyRates.test.ts`).

- [ ] **Step 3: `src/shared/api/currencyRates.ts`** (mirror `carrierDeliveryOrders.ts` unwrap pattern):

```ts
import { apiClient } from './axiosConfig';
import type { V1ApiError, V1Response } from './purchaseOrders';

export type CurrencyRateV1 = { code: string; vnd_rate: number };

function unwrapV1Data<T, TMeta = Record<string, unknown>>(response: { data: V1Response<T, TMeta> }) {
  const apiResponse = response.data;
  if (apiResponse.errors?.length) throw new Error((apiResponse.errors[0] as V1ApiError).message || 'Request failed');
  return apiResponse.data;
}

export function buildRateLookup(rates: CurrencyRateV1[]): (code: string | null | undefined) => number {
  const map = new Map(rates.map((rate) => [rate.code.toUpperCase(), Number(rate.vnd_rate) || 1]));
  return (code) => map.get((code ?? '').toUpperCase()) ?? 1;
}

export async function fetchCurrencyRates() {
  const response = await apiClient.get<V1Response<CurrencyRateV1[]>>('/v1/currency-rates');
  return unwrapV1Data(response);
}
```

- [ ] **Step 4: `src/shared/hooks/useExchangeRates.ts`:**

```ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildRateLookup, fetchCurrencyRates } from '@shared/api/currencyRates';
import { queryKeys } from '@shared/api/queryKeys';

const EMPTY: never[] = [];

export function useExchangeRates() {
  const query = useQuery({ queryKey: queryKeys.currencyRates, queryFn: fetchCurrencyRates, staleTime: 5 * 60 * 1000 });
  const rateToVnd = useMemo(() => buildRateLookup(query.data ?? EMPTY), [query.data]);
  return { rateToVnd, isLoading: query.isLoading };
}
```

- [ ] **Step 5:** In `queryKeys.ts` add: `currencyRates: ['currency-rates'] as const,`.

- [ ] **Step 6:** In `contracts/schemas.ts` add and re-export from `index.ts`:

```ts
export const currencyRateSchema = z.object({ code: z.string(), vnd_rate: z.number() }).passthrough();
export const currencyRateListSchema = z.array(currencyRateSchema);
```

Then in `currencyRates.ts` `fetchCurrencyRates`, wrap the result: `return parseContract(currencyRateListSchema, unwrapV1Data(response), 'fetchCurrencyRates');` (import `parseContract` + the schema the same way other clients do).

- [ ] **Step 7: Run — Expected PASS** (`npx vitest run src/shared/api/__tests__/currencyRates.test.ts`).

- [ ] **Step 8: Commit** `git add src/shared/api/currencyRates.ts src/shared/hooks/useExchangeRates.ts src/shared/api/__tests__/currencyRates.test.ts src/shared/api/queryKeys.ts src/shared/api/contracts && git commit -m "feat(api): currency-rates client + useExchangeRates hook + contract guard"`

### Task B2: Charge-line DTO fields + create-from-RFQ payload

**Files:** Modify `src/shared/api/quotations.ts`, `src/shared/api/quotationRequests.ts`

**Interfaces produced:** `QuotationChargeGroup = 'FREIGHT' | 'ORIGIN' | 'DESTINATION'`; `currency_code`/`charge_group` on `QuotationChargeLineV1` + `QuotationChargeLinePayload`; `CreateQuotationFromRequestPayload`; `createQuotationFromRequest(id, payload?)`.

- [ ] **Step 1:** In `quotations.ts` add the group type (near the other exported unions):

```ts
export type QuotationChargeGroup = 'FREIGHT' | 'ORIGIN' | 'DESTINATION';
```

- [ ] **Step 2:** In `QuotationChargeLineV1` add after `charge_code`:

```ts
  charge_group?: QuotationChargeGroup | null;
  currency_code?: string | null;
```

- [ ] **Step 3:** In `QuotationChargeLinePayload` add after `charge_code`:

```ts
  charge_group?: QuotationChargeGroup | null;
  currency_code?: string | null;
```

- [ ] **Step 4:** In `quotationRequests.ts` add the payload type + extend the fn. Import `CreateQuotationOptionPayload`, `QuotationChargeLinePayload` from `./quotations`:

```ts
export type CreateQuotationFromRequestPayload = {
  currency_code?: string | null;
  valid_until?: string | null;
  charge_lines?: QuotationChargeLinePayload[];
};

export async function createQuotationFromRequest(id: string, payload: CreateQuotationFromRequestPayload = {}) {
  const response = await apiClient.post<V1Response<QuotationV1>>(`/v1/quotation-requests/${id}/quotations`, payload);
  return unwrapV1Data(response);
}
```

(Replace the existing no-body `createQuotationFromRequest`. Options are created by the caller via `createQuotationOption` after this resolves — see Task E1 — so they are not in this payload.)

- [ ] **Step 5: Typecheck** `npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `git commit -am "feat(api): charge line currency_code/charge_group + create-from-RFQ payload"`

---

## PART C — Shared model: quotation charge groups

### Task C1: `QUOTATION_CHARGE_GROUPS` constant

**Files:** Create `src/shared/lib/quotationChargeGroups.ts`; Test `src/shared/lib/__tests__/quotationChargeGroups.test.ts`

**Interfaces produced:** `QUOTATION_CHARGE_GROUPS: ReadonlyArray<{ value: QuotationChargeGroup; labelKey: MessageKey }>`.

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from 'vitest';
import { QUOTATION_CHARGE_GROUPS } from '../quotationChargeGroups';

describe('QUOTATION_CHARGE_GROUPS', () => {
  it('is exactly Freight, Origin, Destination in order', () => {
    expect(QUOTATION_CHARGE_GROUPS.map((g) => g.value)).toEqual(['FREIGHT', 'ORIGIN', 'DESTINATION']);
  });
});
```

- [ ] **Step 2: Run — Expected FAIL.**

- [ ] **Step 3: Implement `quotationChargeGroups.ts`:**

```ts
import type { QuotationChargeGroup } from '@shared/api/quotations';
import type { MessageKey } from '@shared/i18n';

export const QUOTATION_CHARGE_GROUPS: ReadonlyArray<{ value: QuotationChargeGroup; labelKey: MessageKey }> = [
  { value: 'FREIGHT', labelKey: 'quotations.group.freight' },
  { value: 'ORIGIN', labelKey: 'quotations.group.origin' },
  { value: 'DESTINATION', labelKey: 'quotations.group.destination' },
] as const;
```

- [ ] **Step 4: Run — Expected PASS.** (The `MessageKey` type errors resolve once Task E4 adds the keys; if typecheck blocks the test, do E4's key additions first, then return here.)
- [ ] **Step 5: Commit** `git add src/shared/lib/quotationChargeGroups.ts src/shared/lib/__tests__/quotationChargeGroups.test.ts && git commit -m "feat(quotation): 3-group charge constant"`

---

## PART D — QuotationFeeTable: per-line currency + VND helper

### Task D1: Add currency column + VND helper; drop toggle mode

**Files:** Modify `src/features/quotations/components/QuotationFeeTable.tsx`

**Interfaces produced:** `ChargeLineState` gains `currency: string | null`; `QuotationFeeTable` props gain `currencyOptions: { label: string; value: string }[]` and `rateToVnd: (code: string | null | undefined) => number`; the `onToggle`/`enabled`/checkbox path is removed. `seedLineState(chargeCode, defaultCurrency)` sets the initial currency.

- [ ] **Step 1:** Extend `ChargeLineState` (top of file):

```ts
export type ChargeLineState = {
  chargeCode: string | null;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string;
  currency: string | null;
};
```

- [ ] **Step 2:** Replace the `Props` type and drop toggle wiring. New `Props`:

```ts
type Props = {
  rows: FeeRow[];
  uoms: Uom[];
  chargeCodeOptions: { label: string; value: string }[];
  currencyOptions: { label: string; value: string }[];
  rateToVnd: (code: string | null | undefined) => number;
  removable?: boolean;
  onChange: (key: string, patch: Partial<ChargeLineState>) => void;
  onRemove?: (key: string) => void;
};
```

Remove `editableFee`, `onToggle`, `currency`, `showToggle`, the `has-toggle` class, and the checkbox cell. Every row is an editable fee row (the old `editableFee` layout is now the only layout). Keep the `removable` remove button.

- [ ] **Step 3:** In the header row, insert a currency column header after unit price and before line total: `<span>{t('quotations.lineCurrency')}</span>`. Add the matching cells in the body row.

- [ ] **Step 4:** Per row, compute line total in the row's own currency and the VND helper:

```tsx
const lineCurrency = row.state.currency;
const total = Number(row.state.quantity) * Number(row.state.unitPrice);
const showTotal = Number.isFinite(total) && Number(row.state.unitPrice) > 0;
const formattedTotal = showTotal ? formatMoney(total, lineCurrency) : '-';
const vndEquivalent = showTotal && (lineCurrency ?? '').toUpperCase() !== 'VND'
  ? formatMoney(convertToBase(total, rateToVnd(lineCurrency), 'VND'), 'VND')
  : null;
```

Under the unit-price `NumberInput`, render the helper when present:

```tsx
{vndEquivalent ? <Text size="xs" c="dimmed" mt={2}>≈ {vndEquivalent}</Text> : null}
```

Add a currency `Select` cell (searchable) bound to `row.state.currency`:

```tsx
<div className="rfq-fee-cell rfq-fee-currency">
  <span className="rfq-fee-cell-label">{t('quotations.lineCurrency')}</span>
  <Select aria-label={t('quotations.lineCurrency')} data={currencyOptions} value={row.state.currency}
    onChange={(value) => onChange(row.key, { currency: value })} searchable size="xs" />
</div>
```

Import `convertToBase` from `@shared/utils/money`. The fee-name cell always renders the searchable charge-code `Select` (the former `editableFee` branch), never a static label.

- [ ] **Step 5:** Update `seedLineState`:

```ts
export function seedLineState(chargeCode: ChargeCode | null | undefined, defaultCurrency: string | null = 'USD'): ChargeLineState {
  return { chargeCode: chargeCode?.charge_code ?? null, quantity: 1, unit: chargeCode?.default_uom ?? null, unitPrice: '', currency: defaultCurrency };
}
```

- [ ] **Step 6: Typecheck** `npx tsc --noEmit` → expected errors only in `QuotationForm.tsx` (rewritten in Part E). The file itself compiles.
- [ ] **Step 7: Commit** `git commit -am "feat(quotation): fee table per-line currency + VND helper; drop checkbox mode"`

> **CSS note:** the fee grid columns live in the quotations stylesheet (grep `rfq-fee-grid` under `src/features/quotations`). Add one column for `rfq-fee-currency` in the grid template and drop the `has-toggle` rule. Include this CSS edit in this task's commit.

---

## PART E — QuotationForm rewrite + entry points

### Task E1: Rewrite `QuotationForm.tsx` (3 groups, all-fees dropdown, per-line currency, VND totals, create-from-RFQ)

**Files:** Modify `src/features/quotations/components/QuotationForm.tsx`

**Interfaces produced:** `QuotationForm` accepts `{ onCancel; onCreated; sourceQuotation?; rfq?: QuotationRequestV1 }`. Exactly one of `sourceQuotation` (revise) / `rfq` (create-from-RFQ) is provided. On submit: revise → `createQuotationVersion` then `createQuotationOption` loop; create → `createQuotationFromRequest(rfq.id, payload)` then `createQuotationOption` loop.

- [ ] **Step 1: Replace the whole file** with the version below. It removes `mandatory`, `sections`, `suggestedChargeCodes`, `otherGroup`, Incoterm scope, and the checkbox flow; renders 3 collapsible `QUOTATION_CHARGE_GROUPS` buckets over a single `Record<QuotationChargeGroup, GroupLine[]>`; the Add-fee dropdown lists all charge codes; totals normalize to VND.

```tsx
import {
  ActionIcon, Alert, Anchor, Badge, Button, Collapse, Group, NumberInput, Paper, Select,
  SimpleGrid, Stack, Text, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconChevronDown, IconFileInvoice, IconPlus, IconReceipt2, IconRoute, IconWallet,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import {
  createQuotationOption, createQuotationVersion,
  type CreateQuotationOptionPayload, type QuotationChargeGroup, type QuotationChargeLinePayload,
  type QuotationOptionV1, type QuotationV1,
} from '@shared/api/quotations';
import { createQuotationFromRequest, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { chargeCodeToChargeType } from '@shared/lib/quotationCharges';
import { convertToBase, formatMoney, sumMoney } from '@shared/utils/money';

import { toShippingMode } from '../model/quotationModel';
import { type ChargeLineState, type FeeRow, QuotationFeeTable, seedLineState } from './QuotationFeeTable';
import { hasMinimumOptions, QuotationOptionsTable } from './QuotationOptionsTable';

type QuotationFormProps = {
  onCancel: () => void;
  onCreated: (quotation: QuotationV1) => void;
  sourceQuotation?: QuotationV1;
  rfq?: QuotationRequestV1;
};

type GroupLine = ChargeLineState & { uid: string };
type GroupLines = Record<QuotationChargeGroup, GroupLine[]>;
type DraftQuotationOption = CreateQuotationOptionPayload & { id: string; option_no: number; is_selected: boolean };

const EMPTY_CHARGE_CODES: ChargeCode[] = [];
let uidCounter = 0;
const nextUid = () => `fee-${++uidCounter}`;
const emptyGroups = (): GroupLines => ({ FREIGHT: [], ORIGIN: [], DESTINATION: [] });

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function seedGroupsFromQuotation(quotation: QuotationV1 | undefined, defaultCurrency: string): GroupLines {
  const groups = emptyGroups();
  for (const line of quotation?.charge_lines ?? []) {
    const group = (line.charge_group as QuotationChargeGroup) ?? 'FREIGHT';
    (groups[group] ?? groups.FREIGHT).push({
      uid: nextUid(),
      chargeCode: line.charge_code ?? null,
      quantity: String(line.quantity ?? 1),
      unit: line.unit ?? null,
      unitPrice: line.unit_price == null ? '' : String(line.unit_price),
      currency: line.currency_code ?? defaultCurrency,
    });
  }
  return groups;
}

function ReadOnlyContext({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rfq-scope-field">
      <Text size="xs" c="dimmed" fw={700} mb={4}>{label}</Text>
      <Text size="sm" fw={800}>{value}</Text>
    </div>
  );
}

export function QuotationForm({ onCancel, onCreated, sourceQuotation, rfq }: QuotationFormProps) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const { currencyOptions, incoterms: _incoterms } = useTradeMasterDataOptions();
  const { rateToVnd } = useExchangeRates();
  const isRevise = Boolean(sourceQuotation);

  // Inherited read-only header (from the source quotation on revise, or the RFQ on create)
  const header = {
    customer: sourceQuotation?.customer_ref ?? rfq?.customer_ref ?? '-',
    supplier: sourceQuotation?.supplier?.supplier_name ?? sourceQuotation?.supplier_id ?? rfq?.supplier?.supplier_name ?? rfq?.supplier_id ?? '-',
    origin: sourceQuotation?.origin_port ?? rfq?.origin_port ?? '—',
    destination: sourceQuotation?.destination_port ?? rfq?.destination_port ?? '—',
    mode: sourceQuotation?.mode ?? rfq?.mode ?? '-',
    incoterm: sourceQuotation?.incoterm_code ?? rfq?.incoterm_code ?? '-',
    rfqId: sourceQuotation?.rfq_id ?? rfq?.id ?? null,
  };
  const shippingMode = toShippingMode(header.mode);

  const [currency, setCurrency] = useState<string | null>(sourceQuotation?.currency_code ?? rfq?.currency_code ?? 'USD');
  const [validUntil, setValidUntil] = useState(sourceQuotation?.valid_until?.slice(0, 10) ?? '');
  const [groups, setGroups] = useState<GroupLines>(() => seedGroupsFromQuotation(sourceQuotation, currency ?? 'USD'));
  const [expanded, setExpanded] = useState<Record<QuotationChargeGroup, boolean>>({ FREIGHT: true, ORIGIN: false, DESTINATION: false });

  const [draftOptions, setDraftOptions] = useState<DraftQuotationOption[]>(
    (sourceQuotation?.options ?? []).map((option) => ({
      id: option.id, option_no: option.option_no, carrier_code: option.carrier_code, carrier_name: option.carrier_name,
      vessel_or_flight: option.vessel_or_flight, voyage_flight_no: option.voyage_flight_no, etd: option.etd, eta: option.eta,
      transit_time_days: option.transit_time_days, risk_warning: option.risk_warning,
      headline_amount: Number(option.headline_amount ?? 0), is_recommended: option.is_recommended, is_selected: option.is_selected,
    })),
  );
  const [optionCarrier, setOptionCarrier] = useState('');
  const [optionVessel, setOptionVessel] = useState('');
  const [optionEtd, setOptionEtd] = useState('');
  const [optionEta, setOptionEta] = useState('');
  const [optionTransitDays, setOptionTransitDays] = useState<number | string>('');
  const [optionRisk, setOptionRisk] = useState('');
  const [optionAmount, setOptionAmount] = useState<number | string>('');

  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });
  const chargeCodes = chargeCodesQuery.data?.data ?? EMPTY_CHARGE_CODES;
  const uomsQuery = useQuery({ queryKey: queryKeys.uoms({ limit: 200, is_active: true }), queryFn: () => fetchUoms({ limit: 200, is_active: true }) });
  const uoms = uomsQuery.data?.data ?? [];

  const chargeCodeOptions = useMemo(() => {
    const unique = Array.from(new Map(chargeCodes.map((c) => [c.charge_code, c])).values());
    return unique.map((c) => ({ label: `${c.charge_code} - ${c.charge_name_en}`, value: c.charge_code }));
  }, [chargeCodes]);
  const findChargeCode = (code: string | null | undefined) => chargeCodes.find((c) => c.charge_code === code) ?? null;

  function addLine(group: QuotationChargeGroup) {
    setGroups((prev) => ({ ...prev, [group]: [...prev[group], { uid: nextUid(), ...seedLineState(null, currency ?? 'USD') }] }));
  }
  function updateLine(group: QuotationChargeGroup, uid: string, patch: Partial<ChargeLineState>) {
    setGroups((prev) => ({
      ...prev,
      [group]: prev[group].map((line) => {
        if (line.uid !== uid) return line;
        const updated = { ...line, ...patch };
        if (patch.chargeCode !== undefined && patch.chargeCode !== line.chargeCode) {
          updated.unit = findChargeCode(patch.chargeCode)?.default_uom ?? updated.unit;
        }
        return updated;
      }),
    }));
  }
  function removeLine(group: QuotationChargeGroup, uid: string) {
    setGroups((prev) => ({ ...prev, [group]: prev[group].filter((line) => line.uid !== uid) }));
  }

  const allLines = useMemo(
    () => QUOTATION_CHARGE_GROUPS.flatMap((g) => groups[g.value].map((line) => ({ group: g.value, line }))),
    [groups],
  );
  const totalVnd = useMemo(() => {
    const perLineVnd = allLines.map(({ line }) => {
      const amount = Number(line.quantity) * Number(line.unitPrice);
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      const cc = findChargeCode(line.chargeCode);
      const withTax = amount * (cc?.taxable ? 1.1 : 1);
      return convertToBase(withTax, rateToVnd(line.currency), 'VND');
    });
    return sumMoney(perLineVnd, 'VND');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLines, chargeCodes, rateToVnd]);

  const filledLineCount = allLines.filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0).length;
  const canSubmit = filledLineCount > 0 && Boolean(currency);

  function buildChargeLines(): QuotationChargeLinePayload[] {
    return allLines
      .filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0)
      .map(({ group, line }, index) => {
        const cc = findChargeCode(line.chargeCode);
        return {
          line_no: index + 1,
          charge_type: cc ? chargeCodeToChargeType(cc, shippingMode) : 'OTHER',
          charge_code: line.chargeCode,
          charge_group: group,
          currency_code: line.currency,
          description: cc ? (language === 'vi' && cc.charge_name_vn ? cc.charge_name_vn : cc.charge_name_en) : (line.chargeCode ?? ''),
          quantity: Number(line.quantity) || 1,
          unit: line.unit ?? cc?.default_uom ?? 'SET',
          unit_price: Number(line.unitPrice),
          tax_rate: cc?.taxable ? 10 : 0,
          note: cc ? `Rev/Cost: ${cc.rev_cost}` : null,
        };
      });
  }

  function addDraftOption() {
    setDraftOptions((prev) => [...prev, {
      id: `draft-option-${Date.now()}`, option_no: prev.length + 1,
      carrier_code: optionCarrier.trim() || null, carrier_name: optionCarrier.trim() || null,
      vessel_or_flight: optionVessel.trim() || null, voyage_flight_no: null,
      etd: optionEtd || null, eta: optionEta || null, transit_time_days: numberOrNull(optionTransitDays),
      risk_warning: optionRisk.trim() || null, headline_amount: numberOrNull(optionAmount),
      is_recommended: prev.length === 0, is_selected: false,
    }]);
    setOptionCarrier(''); setOptionVessel(''); setOptionEtd(''); setOptionEta(''); setOptionTransitDays(''); setOptionRisk(''); setOptionAmount('');
  }
  function removeDraftOption(option: QuotationOptionV1) {
    setDraftOptions((prev) => prev.filter((item) => item.id !== option.id).map((item, index) => ({ ...item, option_no: index + 1 })));
  }
  const toTableOption = (option: DraftQuotationOption): QuotationOptionV1 => ({
    id: option.id, quotation_id: sourceQuotation?.id ?? 'draft', option_no: option.option_no,
    carrier_code: option.carrier_code ?? null, carrier_name: option.carrier_name ?? null,
    vessel_or_flight: option.vessel_or_flight ?? null, voyage_flight_no: option.voyage_flight_no ?? null,
    etd: option.etd ?? null, eta: option.eta ?? null, transit_time_days: option.transit_time_days ?? null,
    risk_warning: option.risk_warning ?? null, headline_amount: option.headline_amount ?? null,
    is_recommended: Boolean(option.is_recommended), is_selected: Boolean(option.is_selected),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const chargeLines = buildChargeLines();
      const quotation = isRevise
        ? await createQuotationVersion(sourceQuotation!.id, { status: 'DRAFT', currency_code: currency ?? 'USD', valid_until: validUntil || null, charge_lines: chargeLines })
        : await createQuotationFromRequest(rfq!.id, { currency_code: currency ?? 'USD', valid_until: validUntil || null, charge_lines: chargeLines });
      for (const option of draftOptions) {
        await createQuotationOption(quotation.id, {
          carrier_code: option.carrier_code, carrier_name: option.carrier_name, vessel_or_flight: option.vessel_or_flight,
          voyage_flight_no: option.voyage_flight_no, etd: option.etd, eta: option.eta, transit_time_days: option.transit_time_days,
          risk_warning: option.risk_warning, headline_amount: option.headline_amount, is_recommended: option.is_recommended,
        });
      }
      return quotation;
    },
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(quotation);
    },
  });

  const formTitle = isRevise ? t('quotations.reviseTitle') : t('quotations.formTitle');
  const formSubtitle = isRevise ? t('quotations.reviseSubtitle') : t('quotations.createFromRfqOnly');
  const submitLabel = t('quotations.actionResubmit');

  return (
    <Stack gap="md" className="rfq-form">
      <Paper withBorder p={0} className="rfq-form-panel">
        <div className="rfq-form-hero">
          <Group justify="space-between" align="flex-start" gap="md" className="rfq-form-hero-inner">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-form-title-row">
              <div className="rfq-icon-box"><IconFileInvoice size={18} /></div>
              <div className="rfq-form-title-copy">
                <Title order={3}>{formTitle}</Title>
                <Text c="dimmed" size="sm" mt={4}>{formSubtitle}</Text>
              </div>
            </Group>
            <div className="rfq-form-hero-metrics">
              <div className="rfq-form-hero-metric">
                <IconRoute size={16} />
                <div>
                  <Text size="xs" c="dimmed">{t('quotations.rfqContext')}</Text>
                  <Text size="sm" fw={800}>{header.incoterm} / {header.mode}</Text>
                </div>
              </div>
              <div className="rfq-form-hero-metric">
                <IconReceipt2 size={16} />
                <div>
                  <Text size="xs" c="dimmed">{t('quotations.chargeLinesCount', { count: filledLineCount })}</Text>
                  <Text size="sm" fw={800}>{formatMoney(totalVnd, 'VND')}</Text>
                </div>
              </div>
            </div>
          </Group>
        </div>

        <div className="rfq-form-layout">
          <div className="rfq-form-main">
            {isRevise && sourceQuotation?.reject_reason ? (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotations.reviseFromRejectedBanner')} mb="md">
                {sourceQuotation.reject_reason}
              </Alert>
            ) : null}

            <section className="rfq-form-section">
              <div className="rfq-section-head"><Text fw={800}>{t('quotations.rfqContext')}</Text></div>
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="md" className="rfq-setup-grid">
                <ReadOnlyContext label={t('quotations.customer')} value={header.customer} />
                <ReadOnlyContext label={t('quotationRequests.field.supplier')} value={header.supplier} />
                <ReadOnlyContext label={t('quotationRequests.field.route')} value={`${header.origin} → ${header.destination}`} />
                <ReadOnlyContext label={t('quotations.mode')} value={header.mode} />
                <ReadOnlyContext label={t('quotations.incoterm')} value={header.incoterm} />
                <ReadOnlyContext label={t('quotations.rfqLink')} value={header.rfqId ? (
                  <Anchor component={Link} to={`/quotation-requests?view=${header.rfqId}`}>{header.rfqId}</Anchor>
                ) : '-'} />
                <Select className="rfq-scope-field" label={t('quotations.defaultCurrency')} data={currencyOptions}
                  leftSection={<IconWallet size={16} />} leftSectionPointerEvents="none" value={currency} onChange={setCurrency} searchable />
                <TextInput className="rfq-scope-field" label={t('quotations.validUntil')} type="date"
                  value={validUntil} onChange={(event) => setValidUntil(event.currentTarget.value)} />
              </SimpleGrid>
            </section>

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.options')}</Text>
                <Text size="xs" c="dimmed" className="rfq-section-summary">{t('quotations.optionsHint')}</Text>
              </div>
              {!hasMinimumOptions(draftOptions) ? (
                <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mt="md">{t('quotations.minimumOptionsWarning')}</Alert>
              ) : null}
              <SimpleGrid cols={{ base: 1, md: 4 }} mt="md" spacing="md">
                <TextInput label={t('quotations.carrier')} value={optionCarrier} onChange={(e) => setOptionCarrier(e.currentTarget.value)} />
                <TextInput label={t('quotations.vesselOrFlight')} value={optionVessel} onChange={(e) => setOptionVessel(e.currentTarget.value)} />
                <TextInput type="date" label={t('quotations.etd')} value={optionEtd} onChange={(e) => setOptionEtd(e.currentTarget.value)} />
                <TextInput type="date" label={t('quotations.eta')} value={optionEta} onChange={(e) => setOptionEta(e.currentTarget.value)} />
                <NumberInput label={t('quotations.transitDays')} value={optionTransitDays} onChange={setOptionTransitDays} min={0} />
                <NumberInput label={t('quotations.headlineAmount')} value={optionAmount} onChange={setOptionAmount} min={0} thousandSeparator="," />
                <TextInput label={t('quotations.riskWarning')} value={optionRisk} onChange={(e) => setOptionRisk(e.currentTarget.value)} />
                <Group align="flex-end">
                  <Button variant="light" leftSection={<IconPlus size={14} />} onClick={addDraftOption} disabled={!optionCarrier.trim() && !optionEtd}>
                    {t('quotations.addOption')}
                  </Button>
                </Group>
              </SimpleGrid>
              <QuotationOptionsTable mode="edit" options={draftOptions.map(toTableOption)} onRemove={removeDraftOption} />
            </section>

            {QUOTATION_CHARGE_GROUPS.map((group) => {
              const lines = groups[group.value];
              const isExpanded = expanded[group.value];
              const rows: FeeRow[] = lines.map((line) => ({ key: line.uid, label: null, state: line, enabled: true }));
              return (
                <section className="rfq-form-section" key={group.value}>
                  <div className="rfq-charge-group" data-selected={lines.length > 0 ? 'true' : undefined}>
                    <div className="rfq-charge-group-head">
                      <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                        <Text fw={800} size="sm">{t(group.labelKey)}</Text>
                        <Group gap="xs" wrap="nowrap">
                          <Badge className="rfq-charge-count tabular-nums" color={lines.length > 0 ? 'teal' : 'gray'} variant="light">{lines.length}</Badge>
                          <Tooltip label={isExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges')}>
                            <ActionIcon aria-expanded={isExpanded} className="rfq-breakdown-toggle" variant="light"
                              onClick={() => setExpanded((c) => ({ ...c, [group.value]: !isExpanded }))}>
                              <IconChevronDown className={isExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'} size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                    </div>
                    <Collapse in={isExpanded}>
                      <div className="rfq-charge-grid">
                        {rows.length > 0 ? (
                          <QuotationFeeTable rows={rows} chargeCodeOptions={chargeCodeOptions} currencyOptions={currencyOptions}
                            rateToVnd={rateToVnd} uoms={uoms} removable
                            onChange={(uid, patch) => updateLine(group.value, uid, patch)}
                            onRemove={(uid) => removeLine(group.value, uid)} />
                        ) : (
                          <div className="rfq-empty-lines"><Text size="sm" c="dimmed">{t('quotations.noOtherFees')}</Text></div>
                        )}
                        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} className="rfq-add-fee-button" onClick={() => addLine(group.value)}>
                          {t('quotations.addFee')}
                        </Button>
                      </div>
                    </Collapse>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="rfq-form-rail">
            <div className="rfq-total-card">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text size="xs" tt="uppercase" fw={800} c="dimmed">{t('quotations.computedTotalVnd')}</Text>
                  <Text fw={900} size="xl" className="tabular-nums">{formatMoney(totalVnd, 'VND')}</Text>
                </div>
                <div className="rfq-total-icon"><IconWallet size={18} /></div>
              </Group>
            </div>
            {!canSubmit ? <Text size="xs" c="dimmed" className="rfq-submit-hint">{t('quotations.enterAtLeastOneFee')}</Text> : null}
            <Group justify="flex-end" className="rfq-rail-actions" grow>
              <Button variant="default" onClick={onCancel}>{t('common.cancel')}</Button>
              <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>{submitLabel}</Button>
            </Group>
          </aside>
        </div>
      </Paper>
    </Stack>
  );
}
```

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` → PASS once E4 (i18n keys) is done. If `quotations.group.*` / `quotations.defaultCurrency` / `quotations.computedTotalVnd` / `quotations.lineCurrency` are missing, do Task E4 first.
- [ ] **Step 3: Commit** `git commit -am "refactor(quotation): 3 manual groups, all-fees dropdown, per-line currency, VND totals, create-from-RFQ"`

### Task E2: Quotations page — create-from-RFQ route

**Files:** Modify `src/features/quotations/page.tsx`

**Interfaces produced:** URL `?create=1&rfq=<rfqId>` renders `QuotationForm` in create mode (fetches the RFQ); existing `?revise=<id>` keeps revise mode.

- [ ] **Step 1:** Add param constants near `REVISE_PARAM`:

```ts
const CREATE_PARAM = 'create';
const RFQ_PARAM = 'rfq';
```

- [ ] **Step 2:** Add imports at top: `import { fetchQuotationRequest } from '@shared/api/quotationRequests';` and ensure `useQuery`/`queryKeys` already imported (they are).

- [ ] **Step 3:** After `const reviseQuote = ...`, add:

```ts
  const createRfqId = searchParams.get(CREATE_PARAM) ? searchParams.get(RFQ_PARAM) : null;
  const rfqQuery = useQuery({
    queryKey: queryKeys.quotationRequestDetail(createRfqId ?? 'none'),
    queryFn: () => fetchQuotationRequest(createRfqId as string),
    enabled: Boolean(createRfqId),
  });
```

- [ ] **Step 4:** Change `showForm`/`showList`:

```ts
  const isCreateFromRfq = Boolean(createRfqId);
  const showForm = Boolean(formSource) || isCreateFromRfq;
  const showList = !showForm && !selectedQuotation;
```

- [ ] **Step 5:** Update `closeWorkbench` to also delete the create params, and render the form with either source:

```tsx
      {showForm ? (
        <QuotationForm
          sourceQuotation={formSource ?? undefined}
          rfq={isCreateFromRfq ? rfqQuery.data : undefined}
          onCancel={closeWorkbench}
          onCreated={(quotation) => openQuotation(quotation, { replace: true })}
        />
      ) : selectedQuotation ? (
```

In `closeWorkbench`'s updater add `nextParams.delete(CREATE_PARAM); nextParams.delete(RFQ_PARAM);`. Guard the create branch so it waits for `rfqQuery.data` (if `isCreateFromRfq && !rfqQuery.data`, render `<PageLoading .../>`).

- [ ] **Step 6: Typecheck** `npx tsc --noEmit` → PASS.
- [ ] **Step 7: Commit** `git commit -am "feat(quotation): create-from-RFQ route opens manual form"`

### Task E3: Entry buttons — ListView picker + RFQ detail navigate (no auto-create)

**Files:** Modify `src/features/quotations/components/QuotationListView.tsx`, `src/features/quotation-requests/components/QuotationRequestDetail.tsx`

- [ ] **Step 1 (RFQ detail):** In `QuotationRequestDetail.tsx` remove the `createQuotationMutation` (the `createQuotationFromRequest` call) and make the "Tạo báo giá" button navigate to the manual form instead:

```tsx
              <Button
                leftSection={<IconSend size={16} />}
                disabled={!canCreateQuotation}
                onClick={() => navigate(`/quotations?create=1&rfq=${request.id}`)}
              >
                {t('quotationRequests.createQuotation')}
              </Button>
```

Ensure `useNavigate` is imported/available (it is used elsewhere in the file; if not, add `const navigate = useNavigate();`). Drop the now-unused `createQuotationFromRequest` import.

- [ ] **Step 2 (Quotations list):** In `QuotationListView.tsx` add a "Tạo báo giá" action that opens a small RFQ picker (Mantine `Modal` + `Select` of SUBMITTED/RECEIVED RFQs from `fetchQuotationRequests`), then navigates to `/quotations?create=1&rfq=<id>`. Minimal implementation:

```tsx
// imports
import { useState } from 'react';
import { Button, Modal, Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchQuotationRequests } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';

// inside component
const navigate = useNavigate();
const [pickerOpen, setPickerOpen] = useState(false);
const [pickedRfq, setPickedRfq] = useState<string | null>(null);
const rfqQuery = useQuery({
  queryKey: queryKeys.quotationRequestsList({ status: '', page: 1, limit: 100 }),
  queryFn: () => fetchQuotationRequests({ page: 1, limit: 100 }),
  enabled: pickerOpen,
});
const rfqOptions = (rfqQuery.data?.data ?? [])
  .filter((r) => r.status === 'SUBMITTED' || r.status === 'RECEIVED')
  .map((r) => ({ value: r.id, label: `${r.rfq_no} — ${r.customer_ref ?? ''}` }));
```

Render a header action `<Button leftSection={<IconPlus size={16} />} onClick={() => setPickerOpen(true)}>{t('quotations.createFromRfq')}</Button>` (place it in the list view's header area next to the existing controls), and the modal:

```tsx
<Modal opened={pickerOpen} onClose={() => setPickerOpen(false)} title={t('quotations.pickRfqTitle')}>
  <Select data={rfqOptions} value={pickedRfq} onChange={setPickedRfq} searchable placeholder={t('quotations.pickRfqPlaceholder')} />
  <Button mt="md" fullWidth disabled={!pickedRfq} onClick={() => pickedRfq && navigate(`/quotations?create=1&rfq=${pickedRfq}`)}>
    {t('quotations.createQuotation')}
  </Button>
</Modal>
```

- [ ] **Step 3: Typecheck** `npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** `git commit -am "feat(quotation): manual create entry points (RFQ detail + list picker); no auto-create"`

### Task E4: i18n keys

**Files:** Modify `src/shared/i18n/messages.ts`

- [ ] **Step 1:** In BOTH the EN and VI maps add (grep an existing `quotations.addFee` entry to find each map's location):

EN:
```ts
'quotations.group.freight': 'Freight',
'quotations.group.origin': 'Origin',
'quotations.group.destination': 'Destination',
'quotations.lineCurrency': 'Currency',
'quotations.defaultCurrency': 'Default currency',
'quotations.computedTotalVnd': 'Total (VND)',
'quotations.createFromRfq': 'New quotation',
'quotations.pickRfqTitle': 'Choose an RFQ to quote',
'quotations.pickRfqPlaceholder': 'Select an RFQ',
```

VI:
```ts
'quotations.group.freight': 'Cước',
'quotations.group.origin': 'Đầu xuất',
'quotations.group.destination': 'Đầu nhập',
'quotations.lineCurrency': 'Loại tiền',
'quotations.defaultCurrency': 'Tiền tệ mặc định',
'quotations.computedTotalVnd': 'Tổng (VND)',
'quotations.createFromRfq': 'Tạo báo giá',
'quotations.pickRfqTitle': 'Chọn RFQ để báo giá',
'quotations.pickRfqPlaceholder': 'Chọn một RFQ',
```

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` → PASS (unblocks C1, D1, E1).
- [ ] **Step 3: Commit** `git commit -am "i18n(quotation): 3-group + per-line-currency labels"`

### Task E5: QuotationDetail — per-line currency display

**Files:** Modify `src/features/quotations/components/QuotationDetail.tsx`

- [ ] **Step 1:** In the charge-lines table body, format each numeric cell in the **line's own** currency. Replace `quotation.currency_code` with `line.currency_code ?? quotation.currency_code` in the three `formatAmount(..., quotation.currency_code)` calls (unit price, tax amount, line total). The per-line total already comes from `line.total_amount`.

- [ ] **Step 2:** Change the money column header so it no longer implies a single currency: replace `t('quotations.moneyCurrencyHeader', { currency: quotation.currency_code ?? '—' })` with `t('quotations.lineTotal')` (existing key).

- [ ] **Step 3:** Leave the hero/breakdown grand total as-is (it uses `quotation.currency_code`); add a small dimmed note under the breakdown total: `<Text size="xs" c="dimmed">{t('quotations.totalsVndNote')}</Text>` and add that key in E4-style (EN `'Totals shown per line currency; comparison total normalized to VND.'`, VI `'Mỗi dòng theo loại tiền riêng; tổng so sánh quy về VND.'`). (Add these two keys to `messages.ts` in this task and fold into the commit.)

- [ ] **Step 4: Typecheck** `npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(quotation): detail renders each charge line in its own currency"`

---

## PART F — Cleanup, docs, memory, verify

### Task F1: Remove dead Incoterm-scope code

**Files:** Modify `src/shared/lib/quotationCharges.ts`; possibly delete `src/shared/lib/incotermChargeScope.ts`

- [ ] **Step 1:** `rg "incotermChargeGroups|defaultScopeForIncoterm|incotermChargeScope" src` → confirm the only remaining consumers were the old QuotationForm. If nothing else imports them, remove `incotermChargeGroups` from `quotationCharges.ts` and delete `incotermChargeScope.ts`. Keep `chargeCodeToChargeType` and `modeToChargeFlag` (still used).
- [ ] **Step 2:** `rg "CHARGE_GROUPS" src/features/quotations` → confirm the quotation form no longer imports `CHARGE_GROUPS`. Leave `chargeCategories.ts` intact (master-data page still uses it).
- [ ] **Step 3:** `npx tsc --noEmit` + `npm run check:boundaries` → PASS.
- [ ] **Step 4: Commit** `git commit -am "chore(quotation): drop unused Incoterm charge-scope logic"`

### Task F2: Docs

**Files:** Modify `PROJECT-PRODUCT/frontend/docs/API_CONTRACT.md`, `docs/FE_rule.md`

- [ ] **Step 1: API_CONTRACT.md** — add `GET /v1/currency-rates` → `{ data: [{ code, vnd_rate }] }`; document `currency_code` + `charge_group` (`FREIGHT|ORIGIN|DESTINATION`) on quotation charge lines; document that `POST /quotation-requests/:id/quotations` accepts `{ currency_code?, valid_until?, charge_lines? }` and returns the DRAFT quotation; note quote totals are VND-normalized on the client.
- [ ] **Step 2: FE_rule.md §9** — remove the Incoterm-scope-drives-suggested-charges rule; document: quotation charges are 3 manual groups (Freight/Origin/Destination), the Add-fee dropdown lists all charge codes, each line has its own currency with a live VND helper from seeded rates, quote totals normalize to VND, and "Tạo báo giá" opens a manual form that creates only on confirm.
- [ ] **Step 3: Commit** `git commit -am "docs: currency-rates, 3-group charges, per-line currency, manual create"`

### Task F3: Memory cleanup

**Files:** `C:\Users\CONGTHANH\.claude\projects\d--E-Volume-FDS-KB-PJ\memory\`

- [ ] **Step 1:** Delete `quotation-incoterms-form.md`; remove its line from `MEMORY.md`.
- [ ] **Step 2:** Add a new memory `quotation-3group-per-line-currency.md` (type `project`): quotation form is 3 manual groups (FREIGHT/ORIGIN/DESTINATION), Add-fee dropdown = all charge codes (no scope filter), per-line `currency_code` + `charge_group` persisted, live VND helper from seeded `GET /v1/currency-rates` (VND base=1, no live API), totals VND-normalized, "Tạo báo giá" opens manual form and creates only on confirm via `POST /quotation-requests/:id/quotations`. Link `[[charge-code-group-category]]`, `[[money-and-embedded-master-data]]`, `[[quotation-first-reversed-flow]]`. Add its one-line pointer to `MEMORY.md`.

### Task F4: Full verify + end-to-end

- [ ] **Step 1:** `cd PROJECT-PRODUCT/frontend && npm run verify` → boundaries + typecheck + test + build PASS.
- [ ] **Step 2: End-to-end (both packages up):**
  1. `cd kbi-mock-api && npm run mock:seed && npm run dev`; `cd PROJECT-PRODUCT/frontend && npm run dev`.
  2. Quotation Requests → open a SUBMITTED/RECEIVED RFQ → **Tạo báo giá**: the manual form opens; the quotations list gains **no** new record yet.
  3. In each of the 3 groups (Freight/Origin/Destination) add a fee from the **all-charge-codes** searchable dropdown; set different currencies; confirm the `≈ … VND` helper updates live (e.g. `20 USD` under price shows ≈ 526.020 VND) and the rail Total (VND) sums across currencies.
  4. Add ≥2 options → submit: exactly one DRAFT quotation is created; each charge line carries its `currency_code` + `charge_group`; land on its detail.
  5. Detail shows each line in its own currency; the money column header is generic; grand total present.
  6. Quotations list → **New quotation** → pick an RFQ → same form → create.
  7. Confirm there is **no** Incoterm-suggested section and **no** per-code checkboxes anywhere — only the 3 collapsible groups.
- [ ] **Step 3:** Final tidy commit if needed `git commit -am "chore: finalize quotation 3-group + per-line-currency + manual create"`

---

## Self-Review (plan vs spec)

- 3 manual collapsible groups, no checkboxes, all-charge-codes dropdown → C1, D1, E1. ✅
- Per-line currency + live VND helper, seeded rates, no bank API → A1, B1, D1, E1. ✅
- Totals VND-normalized; each line displays own currency → E1 (`sumMoney`/`convertToBase`), E5. ✅
- "Tạo báo giá" opens manual form, creates only on confirm → E2, E3. ✅
- `charge_group` + `currency_code` persisted round-trip → A2, B2, backend already stores currency. ✅
- Incoterm-suggested rule/memory removed; docs updated → F1, F2, F3. ✅
- `chargeCodeToChargeType` kept for margin roll-up → E1 uses it. ✅
- Type names consistent: `QuotationChargeGroup`, `CreateQuotationFromRequestPayload`, `useExchangeRates().rateToVnd`, `QUOTATION_CHARGE_GROUPS`, `ChargeLineState.currency` — used identically across B2/C1/D1/E1. ✅
