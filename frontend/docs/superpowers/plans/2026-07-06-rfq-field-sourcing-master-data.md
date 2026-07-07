# RFQ Field Sourcing — Master-Data Dropdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the RFQ create form's `container_type` and line `unit` (UoM) from free-text inputs to master-data dropdowns, and drop the unused transport-modes fetch from the RFQ master-data hook.

**Architecture:** The RFQ form (`QuotationRequestForm`) and the shared line editor (`@shared/components/order-intake/OrderLineItemsEditor`) already exist and are consumed by both RFQ and PO. We add a `uomSelectOptions` helper (mirroring the existing `containerTypeSelectOptions`), give the shared line editor an optional `unitOptions` prop that renders a `Select` instead of a `TextInput` when supplied (PO stays unchanged because it does not pass the prop), extend `useRfqMasterData` to fetch UoMs + Container Types (removing the unused Transport Modes fetch), and wire the RFQ form's `container_type` field to a `Select` while passing `unitOptions` into the editor.

**Tech Stack:** React 18 + TypeScript, Mantine v7, TanStack Query v5, Vitest (jsdom), raw `react-dom` render tests wrapped in `MantineProvider`.

## Global Constraints

- **Package manager:** npm only (no pnpm/yarn). Node `>=20.19.0`.
- **Path aliases:** `@shared`, `@features`, `@entities`, `@app`, `@` (see `vitest.config.ts` / `tsconfig`).
- **Dependency boundary:** the RFQ feature (`@features/quotation-requests`) must NOT import from `@features/purchase-orders`; shared pieces live under `@shared`. Enforced by `npm run check:boundaries`.
- **Backend-agnostic:** no backend/contract change. `container_type` stays a **code string** in the RFQ payload (Container Types `cont_code`); line `unit` stays a **code string** (UoM `uom_code`). The dropdowns only change how the user picks the value.
- **i18n:** reuse existing keys — `quotationRequests.field.container` (container label) and `forms.unit` (line unit label). Do NOT add new keys.
- **Master option shape (verbatim convention):** UoM option = `{ value: uom_code, label: `${uom_code} - ${uom_name_en}` }`; Container Type option = `{ value: cont_code, label: `${cont_code} - ${name_en}` }` (already produced by `containerTypeSelectOptions`).
- **Verify before PR:** `npm run verify` (boundaries + typecheck + test + build) must be green.

---

### Task 1: `uomSelectOptions` helper

Add a pure option-builder for UoMs so the hook and any consumer share one shape (mirrors the existing `containerTypeSelectOptions` in `containerTypes.ts`).

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/shared/api/uoms.ts` (add export after `normalizePaginatedResponse`, before `fetchUoms`)
- Test: `PROJECT-PRODUCT/frontend/src/shared/api/__tests__/uoms.test.ts` (create)

**Interfaces:**
- Consumes: `Uom` type from `../uoms` (`uom_code: string`, `uom_name_en: string`).
- Produces: `uomSelectOptions(list: Uom[]): { value: string; label: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `PROJECT-PRODUCT/frontend/src/shared/api/__tests__/uoms.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { uomSelectOptions, type Uom } from '../uoms';

const makeUom = (over: Partial<Uom>): Uom => ({
  id: 'u1',
  uom_code: 'PCE',
  uom_name_en: 'Piece',
  uom_name_vn: 'Cái',
  description: null,
  is_active: true,
  ...over,
});

describe('uomSelectOptions', () => {
  it('maps each uom to a code value and "code - name" label', () => {
    const options = uomSelectOptions([
      makeUom({ uom_code: 'CTN', uom_name_en: 'Carton' }),
      makeUom({ uom_code: 'KGM', uom_name_en: 'Kilogram' }),
    ]);

    expect(options).toEqual([
      { value: 'CTN', label: 'CTN - Carton' },
      { value: 'KGM', label: 'KGM - Kilogram' },
    ]);
  });

  it('returns an empty array for an empty list', () => {
    expect(uomSelectOptions([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd PROJECT-PRODUCT/frontend && npm run test -- src/shared/api/__tests__/uoms.test.ts`
Expected: FAIL — `uomSelectOptions` is not exported from `../uoms`.

- [ ] **Step 3: Add the helper**

In `PROJECT-PRODUCT/frontend/src/shared/api/uoms.ts`, immediately after the `normalizePaginatedResponse` function and before `export async function fetchUoms`, add:

```ts
export function uomSelectOptions(list: Uom[]) {
  return list.map((uom) => ({
    value: uom.uom_code,
    label: `${uom.uom_code} - ${uom.uom_name_en}`,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd PROJECT-PRODUCT/frontend && npm run test -- src/shared/api/__tests__/uoms.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add PROJECT-PRODUCT/frontend/src/shared/api/uoms.ts PROJECT-PRODUCT/frontend/src/shared/api/__tests__/uoms.test.ts
git commit -m "feat(master-data): add uomSelectOptions helper"
```

---

### Task 2: `unitOptions` prop on `OrderLineItemsEditor`

Make the shared line editor render the `unit` field as a `Select` when `unitOptions` is provided, falling back to the current `TextInput` otherwise. PO does not pass the prop, so it is unaffected.

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/shared/components/order-intake/OrderLineItemsEditor.tsx` (props type + the unit control at lines ~200-204)
- Test: `PROJECT-PRODUCT/frontend/src/shared/components/order-intake/__tests__/OrderLineItemsEditor.test.tsx` (create)

**Interfaces:**
- Consumes: `OrderLineDraft` (`unit: string`), existing `OrderLineItemsEditorProps`.
- Produces: extended `OrderLineItemsEditorProps` with optional `unitOptions?: { value: string; label: string }[]`. When present the unit field is a Mantine `Select` (input carries `aria-haspopup="listbox"`); when absent it is a `TextInput` (no such attribute).

- [ ] **Step 1: Write the failing test**

Create `PROJECT-PRODUCT/frontend/src/shared/components/order-intake/__tests__/OrderLineItemsEditor.test.tsx`:

```tsx
/* @vitest-environment jsdom */
import { MantineProvider } from '@mantine/core';
import { act } from 'react';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderLineItemsEditor } from '../OrderLineItemsEditor';
import { newOrderLine } from '../types';

vi.mock('@shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const line = newOrderLine(0);

const baseProps = {
  lines: [line],
  activeId: line.clientId,
  onActiveChange: vi.fn(),
  onChange: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  items: [],
  itemOptions: [],
};

function unitInput(container: HTMLElement): HTMLInputElement | null {
  const label = Array.from(container.querySelectorAll('label')).find(
    (node) => node.textContent === 'forms.unit',
  );
  const id = label?.getAttribute('for');
  return id ? (container.querySelector(`#${id}`) as HTMLInputElement | null) : null;
}

describe('OrderLineItemsEditor unit field', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(<MantineProvider>{ui}</MantineProvider>);
    });
  }

  it('renders the unit field as a Select when unitOptions is provided', async () => {
    await render(
      <OrderLineItemsEditor {...baseProps} unitOptions={[{ value: 'CTN', label: 'CTN - Carton' }]} />,
    );
    expect(unitInput(container)?.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('renders the unit field as a plain TextInput when unitOptions is absent', async () => {
    await render(<OrderLineItemsEditor {...baseProps} />);
    expect(unitInput(container)?.getAttribute('aria-haspopup')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd PROJECT-PRODUCT/frontend && npm run test -- src/shared/components/order-intake/__tests__/OrderLineItemsEditor.test.tsx`
Expected: FAIL — first case fails because the unit field is still a `TextInput` (no `aria-haspopup`); `unitOptions` is not a known prop (also a typecheck error if run under build).

- [ ] **Step 3: Add the prop and conditional control**

In `OrderLineItemsEditor.tsx`, add `unitOptions` to the props type. Change:

```tsx
export type OrderLineItemsEditorProps = {
  lines: OrderLineDraft[];
  activeId: string | null;
  onActiveChange: (clientId: string | null) => void;
  onChange: (clientId: string, patch: Partial<OrderLineDraft>) => void;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
  items: Item[];
  itemOptions: { value: string; label: string }[];
  fields?: OrderLineFields;
  currencyCode?: string | null;
  onItemSelected?: (clientId: string, item: Item | undefined) => void;
  customsOptionsFor?: (item: Item | undefined) => { value: string; label: string }[];
};
```

to add one line:

```tsx
  customsOptionsFor?: (item: Item | undefined) => { value: string; label: string }[];
  unitOptions?: { value: string; label: string }[];
};
```

Add `unitOptions` to the destructured params (keep alphabetical grouping consistent with the existing list):

```tsx
export function OrderLineItemsEditor({
  activeId,
  currencyCode,
  customsOptionsFor,
  fields = {},
  itemOptions,
  items,
  lines,
  onActiveChange,
  onAdd,
  onChange,
  onItemSelected,
  onRemove,
  unitOptions,
}: OrderLineItemsEditorProps) {
```

Replace the current unit `TextInput` (the block starting `<TextInput label={t('forms.unit')} ...>`):

```tsx
              <TextInput
                label={t('forms.unit')}
                value={active.unit}
                onChange={(event) => onChange(active.clientId, { unit: event.currentTarget.value })}
              />
```

with a conditional:

```tsx
              {unitOptions ? (
                <Select
                  label={t('forms.unit')}
                  data={unitOptions}
                  value={active.unit || null}
                  searchable
                  onChange={(value) => onChange(active.clientId, { unit: value ?? '' })}
                />
              ) : (
                <TextInput
                  label={t('forms.unit')}
                  value={active.unit}
                  onChange={(event) => onChange(active.clientId, { unit: event.currentTarget.value })}
                />
              )}
```

(`Select` is already imported at the top of the file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd PROJECT-PRODUCT/frontend && npm run test -- src/shared/components/order-intake/__tests__/OrderLineItemsEditor.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add PROJECT-PRODUCT/frontend/src/shared/components/order-intake/OrderLineItemsEditor.tsx PROJECT-PRODUCT/frontend/src/shared/components/order-intake/__tests__/OrderLineItemsEditor.test.tsx
git commit -m "feat(order-intake): render unit field as Select when unitOptions provided"
```

---

### Task 3: Extend `useRfqMasterData` — add UoM + Container Type, drop Transport Modes

Fetch UoMs and Container Types (active only) and expose `uomOptions` + `containerTypeOptions`; remove the Transport Modes query, which the RFQ form never consumes (mode uses the curated `rfqModeOptions` enum).

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/quotation-requests/hooks/useRfqMasterData.ts`

**Interfaces:**
- Consumes: `fetchUoms` + `uomSelectOptions` from `@shared/api/uoms` (Task 1); `fetchContainerTypes` + `containerTypeSelectOptions` from `@shared/api/containerTypes`; `queryKeys.uoms`, `queryKeys.containerTypes`.
- Produces: the hook's return object gains `uoms: Uom[]`, `uomOptions: { value: string; label: string }[]`, `containerTypes: ContainerType[]`, `containerTypeOptions: { value: string; label: string }[]`; it **no longer** returns `transportModes` and no longer calls `fetchTransportModes`. `isLoading` includes the UoM + Container Type queries and excludes Transport Modes.

- [ ] **Step 1: Update imports**

In `useRfqMasterData.ts`, replace the `@shared/api/tradeMasterData` import block. Change:

```ts
import { fetchItems } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
} from '@shared/api/tradeMasterData';
```

to:

```ts
import { containerTypeSelectOptions, fetchContainerTypes } from '@shared/api/containerTypes';
import { fetchItems } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
} from '@shared/api/tradeMasterData';
import { fetchUoms, uomSelectOptions } from '@shared/api/uoms';
```

- [ ] **Step 2: Swap the Transport Modes query for UoM + Container Type queries**

Replace this query:

```ts
  const transportModesQuery = useQuery({
    queryKey: queryKeys.transportModes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchTransportModes({ page: 1, limit: 100, is_active: true }),
  });
```

with:

```ts
  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchUoms({ page: 1, limit: 100, is_active: true }),
  });
  const containerTypesQuery = useQuery({
    queryKey: queryKeys.containerTypes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchContainerTypes({ page: 1, limit: 100, is_active: true }),
  });
```

- [ ] **Step 3: Swap the derived lists**

Replace:

```ts
  const transportModes = transportModesQuery.data?.data ?? [];
```

with:

```ts
  const uoms = uomsQuery.data?.data ?? [];
  const containerTypes = containerTypesQuery.data?.data ?? [];
```

- [ ] **Step 4: Update the returned object**

In the `return { ... }`, replace `transportModes,` with `uoms,` and `containerTypes,`, and add the two memoized option lists next to the existing `currencyOptions` memo. Concretely, change the top of the return:

```ts
  return {
    suppliers,
    items,
    incoterms,
    transportModes,
    currencies,
    supplierOptions: useMemo<Option[]>(
```

to:

```ts
  return {
    suppliers,
    items,
    incoterms,
    uoms,
    containerTypes,
    currencies,
    uomOptions: useMemo<Option[]>(() => uomSelectOptions(uoms), [uoms]),
    containerTypeOptions: useMemo<Option[]>(() => containerTypeSelectOptions(containerTypes), [containerTypes]),
    supplierOptions: useMemo<Option[]>(
```

- [ ] **Step 5: Update `isLoading`**

Replace:

```ts
      transportModesQuery.isLoading ||
```

with:

```ts
      uomsQuery.isLoading ||
      containerTypesQuery.isLoading ||
```

- [ ] **Step 6: Verify it compiles and boundaries hold**

Run: `cd PROJECT-PRODUCT/frontend && npm run typecheck && npm run check:boundaries`
Expected: both PASS. (No new test here — the option shaping is unit-tested in Task 1 and the wiring is exercised by Task 4; this task's deliverable is a compiling, boundary-clean hook with Transport Modes removed.)

- [ ] **Step 7: Confirm the unused fetch is gone**

Run: `cd PROJECT-PRODUCT/frontend && grep -rn "transportModes\|fetchTransportModes" src/features/quotation-requests`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add PROJECT-PRODUCT/frontend/src/features/quotation-requests/hooks/useRfqMasterData.ts
git commit -m "feat(rfq): fetch UoM + Container Type masters, drop unused transport modes"
```

---

### Task 4: Wire the RFQ form — `container_type` Select + line `unitOptions`

Turn the RFQ `container_type` field into a Container Types `Select`, and pass `unitOptions` into the line editor so line UoM becomes a dropdown.

**Files:**
- Modify: `PROJECT-PRODUCT/frontend/src/features/quotation-requests/components/QuotationRequestForm.tsx` (the `container_type` `TextInput` at lines ~284-289; the `OrderLineItemsEditor` usage at lines ~338-354)

**Interfaces:**
- Consumes: `masterData.containerTypeOptions`, `masterData.uomOptions` from `useRfqMasterData` (Task 3); the `unitOptions` prop on `OrderLineItemsEditor` (Task 2).
- Produces: no new exports. The RFQ payload is unchanged (`container_type` is still a `cont_code` string; line `unit` is still a `uom_code` string).

- [ ] **Step 1: Replace the container `TextInput` with a `Select`**

In `QuotationRequestForm.tsx`, replace:

```tsx
              <TextInput
                label={t('quotationRequests.field.container')}
                description={t('quotationRequests.field.containerHint')}
                value={containerType}
                onChange={(event) => setContainerType(event.currentTarget.value)}
              />
```

with:

```tsx
              <Select
                label={t('quotationRequests.field.container')}
                description={t('quotationRequests.field.containerHint')}
                data={masterData.containerTypeOptions}
                value={containerType || null}
                searchable
                clearable
                onChange={(value) => setContainerType(value ?? '')}
              />
```

(`Select` is already imported from `@mantine/core` at the top of the file.)

- [ ] **Step 2: Pass `unitOptions` into the line editor**

In the `<OrderLineItemsEditor ... />` usage, add the `unitOptions` prop. Change:

```tsx
          <OrderLineItemsEditor
            lines={lines}
            activeId={activeLineId}
            onActiveChange={setActiveLineId}
            onChange={updateLine}
            onAdd={addLine}
            onRemove={removeLine}
            items={masterData.items}
            itemOptions={masterData.itemOptions}
            currencyCode={currency}
            fields={{ dimensions: true }}
```

to add one line after `itemOptions`:

```tsx
            items={masterData.items}
            itemOptions={masterData.itemOptions}
            unitOptions={masterData.uomOptions}
            currencyCode={currency}
            fields={{ dimensions: true }}
```

- [ ] **Step 3: Typecheck + build**

Run: `cd PROJECT-PRODUCT/frontend && npm run typecheck && npm run build`
Expected: both PASS. (This task is UI wiring; the option shaping is unit-tested in Task 1 and the `Select`-vs-`TextInput` behavior is component-tested in Task 2. Behavior is confirmed by the manual check in Step 4 rather than a brittle full-form render test.)

- [ ] **Step 4: Manual dev verification**

Run backend + frontend:

```bash
cd kbi-mock-api && npm run dev            # terminal 1 (http://localhost:3001)
cd PROJECT-PRODUCT/frontend && npm run dev # terminal 2 (http://localhost:5173)
```

In the browser:
1. Open the RFQ (Quotation Requests) list and click create (**Tạo yêu cầu báo giá** / RFQ create).
2. In the logistics section, confirm **Container type** is now a searchable dropdown listing Container Types (`cont_code - name_en`), not a free-text box.
3. Add/inspect a line; confirm the **Unit** field in the line editor is a searchable dropdown of UoMs (`uom_code - uom_name_en`), not a free-text box.
4. Pick a supplier → confirm currency/incoterm still auto-fill; pick a container type and a unit; fill an item + qty; **Save** → the RFQ is created without error (network payload sends `container_type` as a `cont_code` string and line `unit` as a `uom_code` string).

Expected: all four hold.

- [ ] **Step 5: Commit**

```bash
git add PROJECT-PRODUCT/frontend/src/features/quotation-requests/components/QuotationRequestForm.tsx
git commit -m "feat(rfq): source container type and line UoM from master data"
```

---

## Final verification

Run the full gate from the frontend package:

```bash
cd PROJECT-PRODUCT/frontend && npm run verify
```

Expected: `check:boundaries` + `typecheck` + `test` (incl. the two new test files) + `build` all green.

Manual end-to-end (if not already done in Task 4 Step 4): create an RFQ choosing container type + line unit from the dropdowns and confirm it saves.

## Notes / out of scope

- **PO form is intentionally untouched.** It also renders `OrderLineItemsEditor`; because it does not pass `unitOptions`, its line unit stays a free-text `TextInput`. Migrating PO to the UoM dropdown (via `usePoMasterData`) is a separate follow-up, not part of this plan.
- **Mode stays the curated `rfqModeOptions` enum** (SEA_FCL / SEA_LCL / AIR) — it drives the air dim-weight and FCL/container logic; only the now-unused `fetchTransportModes` fetch is removed.
- **Ports stay free text** — there is no Ports master among the 10 master-data tabs.
- If an item's `base_uom` (used to prefill line `unit` on item selection) is not an active UoM `uom_code`, the unit `Select` renders blank until the user picks one — acceptable and expected under master-driven UoM.
