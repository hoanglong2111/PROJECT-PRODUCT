# Shared Order Intake Form (RFQ ⇄ PO) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the RFQ create form near-full field parity with the PO create form (KBI-owned values) by extracting a shared, config-driven order-intake **core** into `@shared` — the rail+detail line-items editor and the `FormSection`/`SummaryTile` atoms — then rebuilding both the PO form and the RFQ form as thin adapters over that core.

**Architecture:** The genuinely duplicated part of the two forms is the **line-items editor** (rail on the left, detail on the right — the RFQ editor already reuses the PO CSS classes) plus two presentational atoms. Extract these to `@shared/components/order-intake/`, generic over an `OrderLineDraft` shape with an optional-field config. PO and RFQ keep their own header fieldsets and payload mapping (id-based for PO, code-based for RFQ) but compose the same shared editor + atoms, so the two forms are one consistent system without a god-component and without breaking the `dependency-cruiser` boundary (RFQ never imports `@features/purchase-orders`). RFQ gains a KBI `customer_contract_ref` field and drops FDS-internal fields.

**Tech Stack:** React 18, TypeScript strict, Vite, Mantine, `@tanstack/react-query`, Vitest, `dependency-cruiser`. Backend `kbi-mock-api` (Express 5 ESM, `MockJsonRepository`).

## Global Constraints

- **npm only**, Node `>=20.19.0`.
- RFQ feature must **not** import from `@features/purchase-orders` (dependency-cruiser). Shared pieces live in `@shared/components/order-intake/`. Run `npm run check:boundaries`.
- RFQ payload stays **code-based** (`incoterm_code`, `currency_code`, `mode`); PO stays **id-based** (`incoterm_id`, `currency_id`, `transport_mode_id`). The shared editor is currency-agnostic; header mapping stays in each adapter.
- **RFQ field set (confirmed):** keep near-full PO parity **minus** `exchange_rate`, `po_type`, `payment_term`, line `item_customs_profile_id`/`tax_rate`/`discount_pct`, and `quotation_id`. Add KBI `customer_contract_ref`. Keep RFQ extras: `customer_ref`, `customer_po_ref`, `desired_cargo_ready_date`, `volume_cbm`, `container_type`, derived read-only weight.
- New UI strings in **both** EN and VI maps in `src/shared/i18n/messages.ts`.
- Run `npm run verify` (frontend) + `npm run mock:smoke` (backend) before done.

---

## File Structure

**Create (`@shared/components/order-intake/`):**
- `types.ts` — `OrderLineDraft`, `OrderLineFields`, `newOrderLine`, `orderLinesTotal`.
- `OrderLineItemsEditor.tsx` — the shared rail+detail line editor.
- `FormSection.tsx`, `SummaryTile.tsx` — atoms moved out of the PO form.
- `index.ts` — barrel.

**Modify (frontend):**
- `src/features/purchase-orders/components/PurchaseOrderForm.tsx` — consume shared editor + atoms; map `PoLineDraft ↔ OrderLineDraft`.
- `src/features/quotation-requests/components/QuotationRequestForm.tsx` — rebuild to near-PO parity on the shared editor + atoms.
- `src/features/quotation-requests/components/QuotationRequestLineEditor.tsx` — delete (replaced by shared editor).
- `src/shared/api/quotationRequests.ts` — add `customer_contract_ref` to type + payload.
- `src/shared/i18n/messages.ts` — new/renamed keys.

**Modify (backend):**
- `kbi-mock-api/src/modules/mockV1/mockV1.service.js` — persist `customer_contract_ref` on RFQ create.
- `kbi-mock-api/mock-data/quotation_requests.json` — add `customer_contract_ref` to seed rows.

---

## Task 1: Shared line-draft types + helpers

**Files:**
- Create: `src/shared/components/order-intake/types.ts`
- Test: `src/shared/components/order-intake/__tests__/orderIntakeTypes.test.ts`

**Interfaces produced:**
```ts
export type OrderLineFields = { customsProfile?: boolean; taxRate?: boolean; discountPct?: boolean; lineEta?: boolean };
export type OrderLineDraft = {
  clientId: string;
  line_no: number;
  item_id: string;
  item_description: string;
  qty: number;
  unit: string;
  unit_price: number;
  gross_weight_kg: number;
  note: string;
  item_customs_profile_id?: string;
  tax_rate?: number;
  discount_pct?: number;
  expected_eta_line?: string;
};
export function newOrderLine(index: number, defaults?: Partial<OrderLineDraft>): OrderLineDraft;
export function orderLinesTotal(lines: OrderLineDraft[]): number;
```

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from 'vitest';
import { newOrderLine, orderLinesTotal } from '../types';

describe('order-intake line helpers', () => {
  it('creates a blank line with a unique clientId and 1-based line_no', () => {
    const line = newOrderLine(0);
    expect(line.line_no).toBe(1);
    expect(line.qty).toBe(1);
    expect(line.clientId).toMatch(/^line-/);
  });
  it('sums qty × unit_price across lines', () => {
    const lines = [newOrderLine(0, { qty: 2, unit_price: 10 }), newOrderLine(1, { qty: 3, unit_price: 5 })];
    expect(orderLinesTotal(lines)).toBe(35);
  });
});
```

- [ ] **Step 2: Run — Expected FAIL** (`npx vitest run src/shared/components/order-intake/__tests__/orderIntakeTypes.test.ts`).

- [ ] **Step 3: Implement `types.ts`:**

```ts
export type OrderLineFields = { customsProfile?: boolean; taxRate?: boolean; discountPct?: boolean; lineEta?: boolean };

export type OrderLineDraft = {
  clientId: string;
  line_no: number;
  item_id: string;
  item_description: string;
  qty: number;
  unit: string;
  unit_price: number;
  gross_weight_kg: number;
  note: string;
  item_customs_profile_id?: string;
  tax_rate?: number;
  discount_pct?: number;
  expected_eta_line?: string;
};

export function newOrderLine(index: number, defaults: Partial<OrderLineDraft> = {}): OrderLineDraft {
  return {
    clientId: `line-${Date.now()}-${index}`,
    line_no: index + 1,
    item_id: '',
    item_description: '',
    qty: 1,
    unit: 'PCS',
    unit_price: 0,
    gross_weight_kg: 0,
    note: '',
    ...defaults,
  };
}

export function orderLinesTotal(lines: OrderLineDraft[]): number {
  return lines.reduce((total, line) => total + (Number(line.qty) || 0) * (Number(line.unit_price) || 0), 0);
}
```

- [ ] **Step 4: Run — Expected PASS.**
- [ ] **Step 5: Commit** `git add src/shared/components/order-intake/types.ts src/shared/components/order-intake/__tests__/orderIntakeTypes.test.ts && git commit -m "feat(order-intake): shared line-draft types + helpers"`

---

## Task 2: Move `FormSection` + `SummaryTile` atoms to @shared

**Files:**
- Create: `src/shared/components/order-intake/FormSection.tsx`, `src/shared/components/order-intake/SummaryTile.tsx`, `src/shared/components/order-intake/index.ts`
- Modify: `src/features/purchase-orders/components/PurchaseOrderForm.tsx` (import from shared, delete local copies) — done in Task 4.

- [ ] **Step 1: `FormSection.tsx`** — copy the component verbatim from the bottom of `PurchaseOrderForm.tsx` (lines ~745-767):

```tsx
import { Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function FormSection({ children, description, title }: { children: ReactNode; description: ReactNode; title: string }) {
  return (
    <Paper withBorder p="sm" className="purchase-order-form-section">
      <Stack gap="sm">
        <Stack gap={1} className="purchase-order-form-section-title">
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">{description}</Text>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 2: `SummaryTile.tsx`** — copy verbatim (lines ~769-780):

```tsx
import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function SummaryTile({ label, tone = 'default', value }: { label: string; tone?: 'default' | 'accent'; value: ReactNode }) {
  return (
    <div className={`purchase-order-form-summary-tile ${tone === 'accent' ? 'is-accent' : ''}`}>
      <Text size="xs" c="dimmed" fw={700}>{label}</Text>
      <Text component="div" fw={800} size="sm" lineClamp={1} className="tabular-nums">{value}</Text>
    </div>
  );
}
```

(The `purchase-order-*` CSS classes are global styles; keeping the class names means no CSS move is needed.)

- [ ] **Step 3: `index.ts`** barrel:

```ts
export { FormSection } from './FormSection';
export { SummaryTile } from './SummaryTile';
export { OrderLineItemsEditor } from './OrderLineItemsEditor';
export { newOrderLine, orderLinesTotal, type OrderLineDraft, type OrderLineFields } from './types';
```

- [ ] **Step 4: Typecheck** `npx tsc --noEmit` → PASS (new files self-contained; `OrderLineItemsEditor` export resolves in Task 3).
- [ ] **Step 5: Commit** `git add src/shared/components/order-intake && git commit -m "feat(order-intake): shared FormSection + SummaryTile atoms"`

---

## Task 3: Shared `OrderLineItemsEditor`

**Files:** Create `src/shared/components/order-intake/OrderLineItemsEditor.tsx`

**Interfaces produced:**
```ts
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

- [ ] **Step 1: Implement `OrderLineItemsEditor.tsx`** — the shared rail+detail editor (generalized from the PO form's inline block, lines 497-737, gating customs/tax/disc/lineEta by `fields`):

```tsx
import { ActionIcon, NumberFormatter, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput, UnstyledButton } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useRef } from 'react';

import type { Item } from '@shared/api/items';
import { DateTimeField } from '@shared/components/DateField';
import { useI18n } from '@shared/i18n';

import { SummaryTile } from './SummaryTile';
import type { OrderLineDraft, OrderLineFields } from './types';

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

const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function OrderLineItemsEditor({
  lines, activeId, onActiveChange, onChange, onAdd, onRemove,
  items, itemOptions, fields = {}, currencyCode, onItemSelected, customsOptionsFor,
}: OrderLineItemsEditorProps) {
  const { t } = useI18n();
  const railListRef = useRef<HTMLDivElement>(null);
  const active = lines.find((line) => line.clientId === activeId) ?? lines[0] ?? null;
  const activeIndex = active ? lines.findIndex((line) => line.clientId === active.clientId) : -1;
  const activeItem = items.find((candidate) => candidate.id === active?.item_id);
  const lineComplete = (line: OrderLineDraft) => Boolean(line.item_id) && num(line.qty) > 0;
  const activeAmount = active ? num(active.qty) * num(active.unit_price) : 0;
  const customsOptions = customsOptionsFor?.(activeItem) ?? [];

  return (
    <div className="purchase-order-line-workspace">
      <div className="purchase-order-line-rail">
        <div className="purchase-order-line-rail-list" ref={railListRef}>
          {lines.map((line, index) => {
            const item = items.find((candidate) => candidate.id === line.item_id);
            const amount = num(line.qty) * num(line.unit_price);
            const isActive = active?.clientId === line.clientId;
            return (
              <div
                key={line.clientId} role="button" tabIndex={0} data-line-id={line.clientId}
                onClick={() => onActiveChange(line.clientId)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActiveChange(line.clientId); } }}
                className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${lineComplete(line) ? '' : ' is-incomplete'}`}
              >
                <div className="purchase-order-line-rail-item-main">
                  <div className="purchase-order-line-rail-index">#{index + 1}{lineComplete(line) ? null : <span className="purchase-order-line-rail-dot" />}</div>
                  <div className="purchase-order-line-rail-copy">
                    <Text fw={700} size="sm" lineClamp={1}>{item?.item_code ?? line.item_description ?? t('orderIntake.chooseItem')}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{item?.item_name ?? line.item_description ?? t('orderIntake.itemNotSelected')}</Text>
                  </div>
                </div>
                <div className="purchase-order-line-rail-side">
                  <Text fw={800} size="sm" className="tabular-nums"><NumberFormatter value={amount} thousandSeparator decimalScale={2} /></Text>
                </div>
                <ActionIcon className="purchase-order-line-rail-delete" variant="subtle" color="red" size="sm"
                  aria-label={t('orderIntake.deleteLine')} disabled={lines.length === 1}
                  onClick={(event) => { event.stopPropagation(); onRemove(line.clientId); }}>
                  <IconTrash size={14} />
                </ActionIcon>
              </div>
            );
          })}
          <UnstyledButton type="button" className="purchase-order-line-rail-add" onClick={onAdd}>
            <IconPlus size={14} /><span>{t('orderIntake.addLine')}</span>
          </UnstyledButton>
        </div>
      </div>

      <div className="purchase-order-line-detail">
        {active ? (
          <Stack gap="sm">
            <Text fw={700}>{t('orderIntake.editingLine', { index: activeIndex + 1 })}</Text>
            <SummaryTile
              label={t('orderIntake.lineAmount')} tone="accent"
              value={<><NumberFormatter value={activeAmount} thousandSeparator decimalScale={2} />{currencyCode ? ` ${currencyCode}` : ''}</>}
            />
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
              <Select
                label={t('orderIntake.item')} data={itemOptions} value={active.item_id || null} placeholder={t('orderIntake.chooseItem')}
                onChange={(value) => {
                  const item = items.find((candidate) => candidate.id === value);
                  onChange(active.clientId, {
                    item_id: value ?? '',
                    item_description: item?.item_name_en ?? item?.item_name ?? active.item_description,
                    unit: item?.base_uom ?? active.unit,
                  });
                  onItemSelected?.(active.clientId, item);
                }}
                searchable required
              />
              {fields.customsProfile ? (
                <Select label={t('orderIntake.hsCode')} data={customsOptions} value={active.item_customs_profile_id ?? ''}
                  onChange={(value) => onChange(active.clientId, { item_customs_profile_id: value ?? '' })} searchable clearable />
              ) : (
                <TextInput label={t('orderIntake.itemDescription')} value={active.item_description}
                  onChange={(event) => onChange(active.clientId, { item_description: event.currentTarget.value })} />
              )}
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
              <NumberInput label={t('quotations.quantity')} min={0} value={active.qty} thousandSeparator="," decimalScale={4}
                onChange={(value) => onChange(active.clientId, { qty: num(value, 1) })} />
              <TextInput label={t('forms.unit')} value={active.unit} onChange={(event) => onChange(active.clientId, { unit: event.currentTarget.value })} />
              <NumberInput label={t('orderIntake.grossKg')} min={0} value={active.gross_weight_kg} thousandSeparator="," decimalScale={3}
                onChange={(value) => onChange(active.clientId, { gross_weight_kg: num(value) })} />
              {fields.lineEta ? (
                <DateTimeField label={t('orderIntake.lineEta')} value={active.expected_eta_line ?? ''}
                  onChange={(value) => onChange(active.clientId, { expected_eta_line: value ?? '' })} />
              ) : null}
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="sm">
              <NumberInput label={t('quotations.unitPrice')} min={0} value={active.unit_price} thousandSeparator="," decimalScale={2}
                onChange={(value) => onChange(active.clientId, { unit_price: num(value) })} />
              {fields.taxRate ? (
                <NumberInput label={t('orderIntake.taxPct')} min={0} max={100} suffix="%" value={active.tax_rate ?? 0} decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { tax_rate: num(value) })} />
              ) : null}
              {fields.discountPct ? (
                <NumberInput label={t('orderIntake.discPct')} min={0} max={100} suffix="%" value={active.discount_pct ?? 0} decimalScale={2}
                  onChange={(value) => onChange(active.clientId, { discount_pct: num(value) })} />
              ) : null}
            </SimpleGrid>
            <Textarea label={t('orderIntake.lineNote')} value={active.note} autosize minRows={2}
              onChange={(event) => onChange(active.clientId, { note: event.currentTarget.value })} />
          </Stack>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` → PASS after Task 7 adds the `orderIntake.*` i18n keys (do Task 7 first if the `MessageKey` type blocks compilation).
- [ ] **Step 3: Commit** `git add src/shared/components/order-intake/OrderLineItemsEditor.tsx && git commit -m "feat(order-intake): shared rail+detail line editor with field config"`

---

## Task 4: PO form consumes the shared editor + atoms

**Files:** Modify `src/features/purchase-orders/components/PurchaseOrderForm.tsx`

> Replace the inline 240-line line-workspace block (lines 497-737) with the shared editor, and delete the local `FormSection`/`SummaryTile` (import from shared). PO maps `PoLineDraft ↔ OrderLineDraft`.

- [ ] **Step 1: Imports.** Add `import { FormSection, SummaryTile, OrderLineItemsEditor, type OrderLineDraft } from '@shared/components/order-intake';` and delete the local `FormSection`/`SummaryTile` function definitions at the bottom of the file.

- [ ] **Step 2: Mapping helpers** (add near the top of the module):

```tsx
const poLineToOrderLine = (line: PoLineDraft): OrderLineDraft => ({
  clientId: line.clientId, line_no: line.line_no, item_id: line.item_id, item_description: line.item_description,
  qty: line.qty_ordered, unit: line.unit, unit_price: line.unit_price, gross_weight_kg: line.gross_weight_kg, note: line.notes,
  item_customs_profile_id: line.item_customs_profile_id, tax_rate: line.tax_rate, discount_pct: line.discount_pct,
  expected_eta_line: line.expected_eta_line,
});
const orderPatchToPoPatch = (patch: Partial<OrderLineDraft>): Partial<PoLineDraft> => ({
  ...(patch.item_id !== undefined ? { item_id: patch.item_id } : {}),
  ...(patch.item_description !== undefined ? { item_description: patch.item_description } : {}),
  ...(patch.qty !== undefined ? { qty_ordered: patch.qty } : {}),
  ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
  ...(patch.unit_price !== undefined ? { unit_price: patch.unit_price } : {}),
  ...(patch.gross_weight_kg !== undefined ? { gross_weight_kg: patch.gross_weight_kg } : {}),
  ...(patch.note !== undefined ? { notes: patch.note } : {}),
  ...(patch.item_customs_profile_id !== undefined ? { item_customs_profile_id: patch.item_customs_profile_id } : {}),
  ...(patch.tax_rate !== undefined ? { tax_rate: patch.tax_rate } : {}),
  ...(patch.discount_pct !== undefined ? { discount_pct: patch.discount_pct } : {}),
  ...(patch.expected_eta_line !== undefined ? { expected_eta_line: patch.expected_eta_line } : {}),
});
```

- [ ] **Step 3: Replace the inline `<div className="purchase-order-line-workspace">…</div>`** (inside the `mode === 'create'` lines panel) with the shared editor, keeping the surrounding `Paper`/header/notices:

```tsx
<OrderLineItemsEditor
  lines={draft.lines.map(poLineToOrderLine)}
  activeId={activeLineId}
  onActiveChange={setActiveLineId}
  onChange={(clientId, patch) => updateLine(clientId, orderPatchToPoPatch(patch))}
  onAdd={addLine}
  onRemove={removeLine}
  items={masterData.items}
  itemOptions={masterData.itemOptions}
  currencyCode={selectedCurrency?.currency_code ?? null}
  fields={{ customsProfile: true, taxRate: true, discountPct: true, lineEta: true }}
  customsOptionsFor={(item) => buildCustomsOptions(item)}
  onItemSelected={(clientId, item) =>
    updateLine(clientId, {
      item_customs_profile_id:
        item?.customs_profiles?.find((profile) => profile.is_default)?.id ?? item?.customs_profiles?.[0]?.id ?? '',
    })
  }
/>
```

Remove the now-unused `focusLineId`/`itemInputRef`/`railListRef` wiring and the `activeLineItem`/`activeCustomsOptions`/`activeLineAmount` locals that only fed the deleted inline editor (keep anything still referenced elsewhere). Keep `updateLine`, `addLine`, `removeLine`, `newLineDraft`.

- [ ] **Step 4: Verify PO create still works.** `npx tsc --noEmit` → PASS; `npm run check:boundaries` → PASS. Manual: open a CONFIRMED quotation → Create PO → line editor renders (item/HS/qty/unit/gross/lineEta/price/tax/disc/note), RFQ-line prefill still populates, PO saves.

- [ ] **Step 5: Commit** `git commit -am "refactor(po): consume shared order-intake editor + atoms"`

---

## Task 5: RFQ backend + DTO — `customer_contract_ref`

**Files:** Modify `kbi-mock-api/src/modules/mockV1/mockV1.service.js`, `kbi-mock-api/mock-data/quotation_requests.json`, `src/shared/api/quotationRequests.ts`

- [ ] **Step 1: Backend seed.** In `mock-data/quotation_requests.json`, add `"customer_contract_ref": "KBI-CT-2026-001"` (representative) to each RFQ row.

- [ ] **Step 2: Backend create.** In `mockV1.service.js` `createQuotationRequest`, add `customer_contract_ref: body.customer_contract_ref || null` to the inserted record (mirror `customer_po_ref`). Grep `customer_po_ref` in that function and add the field beside it. (`getQuotationRequest` spreads the record, so it round-trips.)

- [ ] **Step 3: Smoke** (server up): `curl -s -X POST localhost:3001/api/v1/quotation-requests -H "Content-Type: application/json" -d '{"customer_ref":"KBI","customer_contract_ref":"CT-1","supplier_id":"<real>","lines":[]}'` → response `data.customer_contract_ref === "CT-1"`.

- [ ] **Step 4: FE DTO.** In `src/shared/api/quotationRequests.ts` add `customer_contract_ref: string | null;` to `QuotationRequestV1` (after `customer_po_ref`) and `customer_contract_ref?: string | null;` to `CreateQuotationRequestPayload`.

- [ ] **Step 5: Typecheck** `npx tsc --noEmit` → PASS.
- [ ] **Step 6: Commit** `git add kbi-mock-api/src/modules/mockV1/mockV1.service.js kbi-mock-api/mock-data/quotation_requests.json src/shared/api/quotationRequests.ts && git commit -m "feat(rfq): add KBI customer_contract_ref"`

---

## Task 6: Rebuild RFQ form to near-PO parity on the shared core

**Files:** Modify `src/features/quotation-requests/components/QuotationRequestForm.tsx`; Delete `src/features/quotation-requests/components/QuotationRequestLineEditor.tsx`

> The RFQ form keeps its code-based header state and PO-parity layout using the shared `FormSection`/`SummaryTile`/`OrderLineItemsEditor`. It maps its `OrderLineDraft[]` to `CreateQuotationRequestLinePayload[]` on submit. Fields config **omits** customs/tax/disc/lineEta (RFQ exclusions).

- [ ] **Step 1: Replace the file** with the version below (header = KBI-owned near-PO parity minus excluded fields; shared editor for lines):

```tsx
import { Alert, Button, Group, NumberInput, SimpleGrid, Stack, Text, Textarea, TextInput, Select } from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createQuotationRequest, type CreateQuotationRequestLinePayload, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { DateField } from '@shared/components/DateField';
import { FormSection, OrderLineItemsEditor, SummaryTile, newOrderLine, orderLinesTotal, type OrderLineDraft } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import { useRfqMasterData } from '../hooks/useRfqMasterData';
import { rfqModeOptions } from '../model/quotationRequestModel';

type Props = { onCancel: () => void; onCreated: (request: QuotationRequestV1) => void };

const num = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

export function QuotationRequestForm({ onCancel, onCreated }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const masterData = useRfqMasterData();

  const [customerRef, setCustomerRef] = useState('KBI');
  const [customerPoRef, setCustomerPoRef] = useState('');
  const [customerContractRef, setCustomerContractRef] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [incoterm, setIncoterm] = useState<string | null>('FOB');
  const [mode, setMode] = useState<string | null>('SEA_FCL');
  const [currency, setCurrency] = useState<string | null>('USD');
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('Hai Phong (VNHPH)');
  const [readyDate, setReadyDate] = useState<string | null>(null);
  const [volume, setVolume] = useState<number | string>('');
  const [containerType, setContainerType] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<OrderLineDraft[]>([newOrderLine(0)]);
  const [activeLineId, setActiveLineId] = useState<string | null>(() => null);

  const selectedSupplier = masterData.suppliers.find((supplier) => supplier.id === supplierId);
  const totalWeight = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.gross_weight_kg) || 0), 0), [lines]);
  const poTotal = orderLinesTotal(lines);
  const validLineCount = lines.filter((line) => line.item_id && line.qty > 0).length;
  const canSubmit = Boolean(customerRef.trim() && supplierId && incoterm && mode && currency && validLineCount > 0);

  const updateLine = (clientId: string, patch: Partial<OrderLineDraft>) =>
    setLines((current) => current.map((line) => (line.clientId === clientId ? { ...line, ...patch } : line)));
  const addLine = () => {
    const next = newOrderLine(lines.length);
    setLines((current) => [...current, next]);
    setActiveLineId(next.clientId);
  };
  const removeLine = (clientId: string) =>
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.clientId !== clientId).map((line, index) => ({ ...line, line_no: index + 1 }))));

  const createMutation = useMutation({
    mutationFn: () =>
      createQuotationRequest({
        customer_ref: customerRef.trim() || null,
        customer_po_ref: customerPoRef.trim() || null,
        customer_contract_ref: customerContractRef.trim() || null,
        supplier_id: supplierId,
        incoterm_code: incoterm,
        mode,
        currency_code: currency,
        origin_port: originPort.trim() || null,
        destination_port: destinationPort.trim() || null,
        desired_cargo_ready_date: readyDate,
        gross_weight_kg: totalWeight,
        volume_cbm: num(volume),
        container_type: containerType.trim() || null,
        note: note.trim() || null,
        lines: lines
          .filter((line) => line.item_id && line.qty > 0)
          .map<CreateQuotationRequestLinePayload>((line, index) => ({
            line_no: index + 1,
            item_id: line.item_id,
            item_description: line.item_description || null,
            qty: line.qty,
            unit: line.unit || null,
            unit_price: num(line.unit_price),
            gross_weight_kg: num(line.gross_weight_kg),
            note: line.note || null,
          })),
      }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(request);
    },
  });

  return (
    <form className="purchase-order-form" onSubmit={(event) => { event.preventDefault(); if (canSubmit) createMutation.mutate(); }}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700} size="lg">{t('quotationRequests.formTitle')}</Text>
            <Text c="dimmed" size="sm">{t('quotationRequests.formSubtitle')}</Text>
          </div>
          <Group gap="xs">
            <Button type="button" variant="subtle" leftSection={<IconX size={16} />} onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="submit" loading={createMutation.isPending || masterData.isLoading} disabled={!canSubmit} leftSection={<IconDeviceFloppy size={16} />}>{t('common.save')}</Button>
          </Group>
        </Group>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>{(createMutation.error as Error).message}</Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <SummaryTile label={t('quotationRequests.field.customerRef')} value={customerRef || 'KBI'} />
          <SummaryTile label={t('quotationRequests.field.supplier')} value={selectedSupplier?.supplier_name ?? '—'} />
          <SummaryTile label={t('quotationRequests.field.incoterm')} value={incoterm ?? '—'} />
          <SummaryTile label={t('quotationRequests.field.weightDerived')} value={totalWeight.toLocaleString()} tone="accent" />
        </SimpleGrid>

        <div className="purchase-order-form-core-grid">
          <FormSection title={t('quotationRequests.section.identification')} description={t('quotationRequests.section.identificationHint')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput label={t('quotationRequests.field.customerRef')} value={customerRef} onChange={(e) => setCustomerRef(e.currentTarget.value)} required />
              <TextInput label={t('quotationRequests.field.customerPoRef')} value={customerPoRef} onChange={(e) => setCustomerPoRef(e.currentTarget.value)} />
              <TextInput label={t('quotationRequests.field.customerContractRef')} value={customerContractRef} onChange={(e) => setCustomerContractRef(e.currentTarget.value)} />
            </SimpleGrid>
          </FormSection>

          <FormSection title={t('quotationRequests.section.commercial')} description={t('quotationRequests.section.commercialHint')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select label={t('quotationRequests.field.supplier')} data={masterData.supplierOptions} value={supplierId} searchable required
                onChange={(value) => { const s = masterData.suppliers.find((i) => i.id === value); setSupplierId(value); setCurrency(s?.default_currency_code ?? currency); setIncoterm(s?.default_incoterm_code ?? incoterm); }} />
              <Select label={t('quotationRequests.field.incoterm')} data={masterData.incotermOptions} value={incoterm} onChange={setIncoterm} searchable required />
              <Select label={t('quotationRequests.field.mode')} data={rfqModeOptions} value={mode} onChange={setMode} required />
              <Select label={t('quotations.currency')} data={masterData.currencyOptions} value={currency} onChange={setCurrency} searchable required />
            </SimpleGrid>
          </FormSection>

          <FormSection title={t('quotationRequests.section.logistics')} description={t('quotationRequests.section.logisticsHint')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput label={t('quotations.originPort')} description={`${t('purchaseOrders.originCountry')}: ${selectedSupplier?.country ?? '-'}`} value={originPort} onChange={(e) => setOriginPort(e.currentTarget.value)} />
              <TextInput label={t('quotations.destinationPort')} description={`${t('purchaseOrders.destinationCountry')}: VN`} value={destinationPort} onChange={(e) => setDestinationPort(e.currentTarget.value)} />
              <DateField label={t('quotationRequests.field.readyDate')} value={readyDate} onChange={setReadyDate} />
              <NumberInput label={t('quotationRequests.field.volume')} value={volume} onChange={setVolume} min={0} decimalScale={2} />
              <TextInput label={t('quotationRequests.field.container')} value={containerType} onChange={(e) => setContainerType(e.currentTarget.value)} />
            </SimpleGrid>
            <Textarea label={t('quotationRequests.field.note')} value={note} onChange={(e) => setNote(e.currentTarget.value)} autosize minRows={2} mt="sm" />
          </FormSection>
        </div>

        <div className="purchase-order-form-section purchase-order-lines-panel" style={{ padding: 'var(--mantine-spacing-sm)' }}>
          <Group justify="space-between" align="flex-start" mb="sm">
            <div>
              <Text fw={700}>{t('quotationRequests.field.lines')}</Text>
              <Text size="sm" c="dimmed">{t('quotationRequests.linesHint')}</Text>
            </div>
            <SummaryTile label={t('quotationRequests.field.requestTotal')} tone="accent" value={poTotal.toLocaleString()} />
          </Group>
          <OrderLineItemsEditor
            lines={lines} activeId={activeLineId} onActiveChange={setActiveLineId}
            onChange={updateLine} onAdd={addLine} onRemove={removeLine}
            items={masterData.items} itemOptions={masterData.items.map((item) => ({ value: item.id, label: `${item.item_code} - ${item.item_name_en ?? item.item_name}` }))}
            currencyCode={currency}
            fields={{}}
            onItemSelected={(clientId, item) => { if (item?.unit_price_usd != null) updateLine(clientId, { unit_price: Number(item.unit_price_usd) || 0 }); }}
          />
        </div>
      </Stack>
    </form>
  );
}
```

- [ ] **Step 2: Delete** `src/features/quotation-requests/components/QuotationRequestLineEditor.tsx`. Grep `QuotationRequestLineEditor` and `createEmptyLine` across `src` and remove/replace any remaining imports (the page/detail should not reference them).

- [ ] **Step 3: Verify.** `npx tsc --noEmit` → PASS (after Task 7 i18n). `npm run check:boundaries` → PASS (RFQ imports only `@shared/*`, not `@features/purchase-orders`). Manual: New RFQ → header shows PO-parity fields incl. KBI PO no + contract; the shared line editor rail+detail works; save → RFQ created with `customer_contract_ref` + lines.

- [ ] **Step 4: Commit** `git add src/features/quotation-requests && git commit -m "refactor(rfq): rebuild form to PO parity on shared order-intake core"`

---

## Task 7: i18n keys

**Files:** Modify `src/shared/i18n/messages.ts`

- [ ] **Step 1:** Add to BOTH EN and VI maps (grep an existing `quotationRequests.field.customerRef` to locate each map):

EN:
```ts
'orderIntake.item': 'Item',
'orderIntake.itemDescription': 'Item description',
'orderIntake.hsCode': 'HS code',
'orderIntake.chooseItem': 'Choose item',
'orderIntake.itemNotSelected': 'Item not selected',
'orderIntake.grossKg': 'Gross kg',
'orderIntake.lineEta': 'Line ETA',
'orderIntake.taxPct': 'Tax %',
'orderIntake.discPct': 'Disc %',
'orderIntake.lineNote': 'Line note',
'orderIntake.lineAmount': 'Line amount (qty × unit price)',
'orderIntake.addLine': 'Add line',
'orderIntake.deleteLine': 'Delete line',
'orderIntake.editingLine': 'Editing line #{index}',
'quotationRequests.field.customerContractRef': 'KBI contract no',
'quotationRequests.field.requestTotal': 'Request total',
'quotationRequests.section.identification': 'Request identification',
'quotationRequests.section.identificationHint': 'KBI references for this request.',
'quotationRequests.section.commercial': 'Supplier and commercial terms',
'quotationRequests.section.commercialHint': 'Supplier defaults prefill currency and incoterm.',
'quotationRequests.section.logistics': 'Logistics and cargo',
'quotationRequests.section.logisticsHint': 'Route, desired ready date, and cargo hints.',
```
VI:
```ts
'orderIntake.item': 'Mặt hàng',
'orderIntake.itemDescription': 'Mô tả mặt hàng',
'orderIntake.hsCode': 'Mã HS',
'orderIntake.chooseItem': 'Chọn mặt hàng',
'orderIntake.itemNotSelected': 'Chưa chọn mặt hàng',
'orderIntake.grossKg': 'Trọng lượng (kg)',
'orderIntake.lineEta': 'ETA dòng',
'orderIntake.taxPct': 'Thuế %',
'orderIntake.discPct': 'CK %',
'orderIntake.lineNote': 'Ghi chú dòng',
'orderIntake.lineAmount': 'Thành tiền (SL × đơn giá)',
'orderIntake.addLine': 'Thêm dòng',
'orderIntake.deleteLine': 'Xoá dòng',
'orderIntake.editingLine': 'Đang sửa dòng #{index}',
'quotationRequests.field.customerContractRef': 'Số hợp đồng KBI',
'quotationRequests.field.requestTotal': 'Tổng yêu cầu',
'quotationRequests.section.identification': 'Định danh yêu cầu',
'quotationRequests.section.identificationHint': 'Tham chiếu của KBI cho yêu cầu này.',
'quotationRequests.section.commercial': 'Nhà cung cấp & điều khoản',
'quotationRequests.section.commercialHint': 'Default của NCC tự điền currency và incoterm.',
'quotationRequests.section.logistics': 'Logistics & hàng hoá',
'quotationRequests.section.logisticsHint': 'Tuyến, ngày sẵn hàng mong muốn, thông tin hàng.',
```

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` → PASS (unblocks Tasks 3 and 6).
- [ ] **Step 3: Commit** `git commit -am "i18n(order-intake): shared editor + RFQ parity labels"`

---

## Task 8: Docs + full verify

**Files:** Modify `docs/API_CONTRACT.md`, `docs/FE_rule.md`

- [ ] **Step 1: API_CONTRACT.md** — document `customer_contract_ref` on the Quotation Request entity + create payload.
- [ ] **Step 2: FE_rule.md** — note the RFQ create form shares the order-intake core with PO create (KBI-owned values, near-full parity minus `exchange_rate`/`po_type`/`payment_term`/line customs·tax·discount/`quotation_id`); shared editor lives in `@shared/components/order-intake`.
- [ ] **Step 3: Verify:** `cd PROJECT-PRODUCT/frontend && npm run verify` → PASS; `cd kbi-mock-api && npm run mock:smoke` → PASS.
- [ ] **Step 4: E2E (both up):** New RFQ → header shows KBI PO no + KBI contract + supplier/incoterm/mode/currency + route + ready date + volume/container; the shared rail+detail line editor adds/edits/removes lines; save creates the RFQ with `customer_contract_ref` + lines. Then create a PO from a CONFIRMED quotation → the **same** line editor renders with customs/tax/disc/lineEta columns; PO saves. `npm run check:boundaries` green.
- [ ] **Step 5: Commit** `git commit -am "docs: shared order-intake form + RFQ customer_contract_ref"`

---

## Self-Review (plan vs design)

- Shared config-driven core in @shared + PO/RFQ adapters → Tasks 1-4, 6. ✅
- RFQ near-full PO parity, KBI-owned; excludes exchange_rate/po_type/payment_term/line customs·tax·disc/quotation_id → Task 6 header + `fields={{}}`. ✅
- KBI PO no (`customer_po_ref`) + KBI contract (`customer_contract_ref`) present on RFQ → Task 5 + 6. ✅
- Boundary respected (RFQ imports only @shared) → Task 6 Step 3, Task 8 Step 4. ✅
- No backend contract churn beyond additive `customer_contract_ref`; RFQ stays code-based, PO id-based → Tasks 5-6 mapping. ✅
- Type-name consistency: `OrderLineDraft`, `OrderLineFields`, `newOrderLine`, `orderLinesTotal`, `OrderLineItemsEditor` used identically across Tasks 1/3/4/6. ✅
