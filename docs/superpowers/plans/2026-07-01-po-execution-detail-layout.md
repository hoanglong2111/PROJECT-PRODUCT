# PO Execution Detail — Final Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Purchase Order detail screen into the approved "final layout" (Control header → 4 summary cards → Commercial & Logistics band → PO Lines ∥ LOT board hybrid grid → Supporting footer) using only existing data and APIs.

**Architecture:** Extract the header and summary into two new presentational components, slim the commercial card into one band, and re-orchestrate `PurchaseOrderDetailPanel` to compose the new order with a hybrid CSS-grid workspace. One pure model selector aggregates fulfillment quantities. No behaviour, filter, drag/drop, or backend changes.

**Tech Stack:** React 18 + TypeScript, Mantine v9, Tabler icons, TanStack Query v5, Vitest (jsdom, no React Testing Library), global domain CSS.

## Global Constraints

- npm only; Node `>=20.19.0`. Do not add dependencies (no React Testing Library — component tasks are verified by typecheck/lint/build + manual visual check; only pure selectors get unit tests).
- Presentation/layout only: **do not** change filter logic, drag/drop, split modal, mutations, or business rules. Move/reuse existing behaviour; don't rewrite it.
- Keep ESLint at **zero errors** and add no new warnings.
- CSS lives in `src/styles/purchase-orders.css`, classes namespaced `purchase-order-*` / `po-*`; reuse `dl-*` classes (`dl-metrics-strip` on a Mantine `SimpleGrid`, per existing usage). Keep `@media` rules beside the rules they modify.
- Use Mantine components and Tabler icons; theme tokens (`--kbfe-*`) not literals; never restore pure white/black surfaces.
- Copy in the PO detail components is English literals today (e.g. "Send PO", "Close"); keep that style — do not introduce `useI18n` plumbing in this pass.
- Work on branch `po-detail-layout-refactor`. Stage only files each task touches; never stage the user's unrelated pre-existing working-tree changes.

---

### Task 1: `getPoFulfillment` model selector (pure, TDD)

**Files:**
- Modify: `frontend/src/features/purchase-orders/model/purchaseOrderModel.ts`
- Test: `frontend/src/features/purchase-orders/model/__tests__/purchaseOrderModel.test.ts`

**Interfaces:**
- Consumes: `toNumber`, `getPoLineLotState` (already in the model), `PurchaseOrderLineV1`.
- Produces:
  ```ts
  export function getPoFulfillment(lines: PurchaseOrderLineV1[]): {
    ordered: number; confirmed: number; lotted: number; shipped: number; received: number;
    lottedLines: number; totalLines: number;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Append to `model/__tests__/purchaseOrderModel.test.ts` (reuses the existing `poLine` factory in that file):

```ts
import { getPoFulfillment } from '../purchaseOrderModel';

describe('getPoFulfillment', () => {
  it('returns all zeros for no lines', () => {
    expect(getPoFulfillment([])).toEqual({
      ordered: 0, confirmed: 0, lotted: 0, shipped: 0, received: 0, lottedLines: 0, totalLines: 0,
    });
  });

  it('sums quantities across lines and counts fully-lotted lines', () => {
    const lines = [
      poLine({ qty_ordered: 100, qty_confirmed: 100, qty_lotted: 100, qty_shipped: 0, qty_received: 0 }),
      poLine({ qty_ordered: 240, qty_confirmed: 240, qty_lotted: 240, qty_shipped: 0, qty_received: 0 }),
    ];
    expect(getPoFulfillment(lines)).toEqual({
      ordered: 340, confirmed: 340, lotted: 340, shipped: 0, received: 0, lottedLines: 2, totalLines: 2,
    });
  });

  it('does not count a partially-lotted line as fully lotted', () => {
    const lines = [
      poLine({ qty_ordered: 100, qty_confirmed: 100, qty_lotted: 60 }),
      poLine({ qty_ordered: 50, qty_confirmed: 50, qty_lotted: 50 }),
    ];
    const result = getPoFulfillment(lines);
    expect(result.lottedLines).toBe(1);
    expect(result.totalLines).toBe(2);
    expect(result.lotted).toBe(110);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- purchaseOrderModel`
Expected: FAIL — `getPoFulfillment is not a function` (or import error).

- [ ] **Step 3: Write the implementation**

Add to `model/purchaseOrderModel.ts` (near `getPurchaseOrderSummary`):

```ts
// Display-only aggregation of per-line fulfillment quantities for the PO
// execution summary. Quantities are summed as raw numbers; units may differ
// per line (SET/PCS…), so this is a signal, not an accounting total.
export function getPoFulfillment(lines: PurchaseOrderLineV1[]) {
  return (lines ?? []).reduce(
    (acc, line) => {
      acc.ordered += toNumber(line.qty_ordered);
      acc.confirmed += toNumber(line.qty_confirmed);
      acc.lotted += toNumber(line.qty_lotted);
      acc.shipped += toNumber(line.qty_shipped);
      acc.received += toNumber(line.qty_received);
      acc.totalLines += 1;
      if (getPoLineLotState(line) === 'full') acc.lottedLines += 1;
      return acc;
    },
    { ordered: 0, confirmed: 0, lotted: 0, shipped: 0, received: 0, lottedLines: 0, totalLines: 0 },
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- purchaseOrderModel`
Expected: PASS (all three new cases green).

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/purchase-orders/model/purchaseOrderModel.ts \
        frontend/src/features/purchase-orders/model/__tests__/purchaseOrderModel.test.ts
git commit -m "feat(po): add getPoFulfillment selector for execution summary"
```

---

### Task 2: PoControlHeader component + wire into panel

**Files:**
- Create: `frontend/src/features/purchase-orders/components/PoControlHeader.tsx`
- Modify: `frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx`
- Modify: `frontend/src/styles/purchase-orders.css`

**Interfaces:**
- Consumes: `StatusBadge` (`@shared/components/StatusBadge`), `PurchaseOrderV1` (`@shared/api/purchaseOrders`).
- Produces:
  ```ts
  export function PoControlHeader(props: {
    order: PurchaseOrderV1;
    canEdit: boolean; canSend: boolean; canConfirm: boolean; sendPending: boolean;
    onEdit: () => void; onSend: () => void; onConfirm: () => void;
    onClose: () => void; onCreateDo: () => void;
  }): JSX.Element
  ```

- [ ] **Step 1: Create the component**

Create `components/PoControlHeader.tsx`:

```tsx
import { Badge, Button, Group, Menu, Text, Title } from '@mantine/core';
import { IconCircleCheck, IconDotsVertical, IconPencil, IconSend, IconTruckDelivery, IconX } from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { StatusBadge } from '@shared/components/StatusBadge';

// Two-tier PO control header: identity (top) + prioritised actions (below).
// Action hierarchy: primary is state-driven (Send PO for DRAFT, Confirm for
// SENT); Create DO is a workspace jump; Edit is secondary; Close lives in the
// More menu so the primary action reads clearly.
export function PoControlHeader({
  canConfirm,
  canEdit,
  canSend,
  onClose,
  onConfirm,
  onCreateDo,
  onEdit,
  onSend,
  order,
  sendPending,
}: {
  order: PurchaseOrderV1;
  canEdit: boolean;
  canSend: boolean;
  canConfirm: boolean;
  sendPending: boolean;
  onEdit: () => void;
  onSend: () => void;
  onConfirm: () => void;
  onClose: () => void;
  onCreateDo: () => void;
}) {
  return (
    <div className="purchase-order-control-header">
      <div className="purchase-order-control-identity">
        <Group gap="xs" wrap="wrap" className="purchase-order-control-title-row">
          <Title order={3}>{order.po_no}</Title>
          <StatusBadge status={order.status} />
          <Badge size="sm" variant="light" className="purchase-order-nowrap-badge">
            {order.po_type || 'STANDARD'}
          </Badge>
          {order.contract_no ? (
            <Badge size="sm" variant="light" color="blue" className="purchase-order-nowrap-badge">
              Contract {order.contract_no}
            </Badge>
          ) : null}
        </Group>
        <Text c="dimmed" size="sm" mt={4}>
          {order.supplier?.supplier_name ?? order.supplier_id}
        </Text>
      </div>

      <Group gap="xs" wrap="nowrap" className="purchase-order-control-actions">
        <Button variant="light" leftSection={<IconPencil size={16} />} disabled={!canEdit} onClick={onEdit}>
          Edit
        </Button>
        {canSend ? (
          <Button leftSection={<IconSend size={16} />} loading={sendPending} onClick={onSend}>
            Send PO
          </Button>
        ) : null}
        {canConfirm ? (
          <Button color="teal" leftSection={<IconCircleCheck size={16} />} onClick={onConfirm}>
            Confirm
          </Button>
        ) : null}
        <Button variant="light" color="teal" leftSection={<IconTruckDelivery size={16} />} onClick={onCreateDo}>
          Create DO
        </Button>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Button variant="subtle" px="sm" aria-label="More actions">
              <IconDotsVertical size={18} />
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconX size={16} />} onClick={onClose}>
              Close
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the control header**

Append to `src/styles/purchase-orders.css`:

```css
/* PO execution detail — control header (2-tier, sticky) */
.purchase-order-control-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--kbfe-space-sm);
  padding: var(--kbfe-space-sm) var(--kbfe-space-md);
  border: 1px solid var(--kbfe-border-primary);
  border-radius: var(--mantine-radius-md);
  background: var(--kbfe-surface-elevated);
  box-shadow: var(--kbfe-shadow-sm);
}

.purchase-order-control-identity {
  min-width: 0;
}

.purchase-order-control-title-row {
  row-gap: 4px;
}

.purchase-order-control-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}
```

- [ ] **Step 3: Wire the component into the panel (replace the header block only)**

In `PurchaseOrderDetailPanel.tsx`, replace the identity/actions markup inside the hero (currently lines ~112–160: the outer `<Group … purchase-order-detail-hero-inner>` containing the title `<div>` and the actions `<Group>`) with a single `<PoControlHeader … />`. Keep the `<SimpleGrid … purchase-order-detail-signal-grid>` and the two alerts/hints below it **unchanged** for now (Task 3 replaces the signal grid).

Add the import at the top with the other local imports:
```tsx
import { PoControlHeader } from './PoControlHeader';
```

Replace the `<Paper … purchase-order-detail-hero>` opening through the closing `</Group>` of the actions with:
```tsx
      <PoControlHeader
        order={order}
        canEdit={canEdit}
        canSend={canSend}
        canConfirm={canConfirm}
        sendPending={sendMutation.isPending}
        onEdit={() => setEditOpen(true)}
        onSend={() => sendMutation.mutate()}
        onConfirm={() => setConfirmOpen(true)}
        onClose={onClose}
        onCreateDo={() => lotBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <Paper withBorder p={0} className="purchase-order-detail-hero">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="purchase-order-detail-signal-grid">
          {/* existing PoHeroFact tiles stay here for now */}
          <PoHeroFact label="Supplier" value={order.supplier?.supplier_name ?? order.supplier_id} />
          <PoHeroFact label="Lines" value={String(lines.length)} />
          <PoHeroFact label="Amount" value={amount || '-'} />
          <PoHeroFact label="LOT / ETA" value={`${lotCount} LOT / ${containerCount} cont / ${eta}`} />
        </SimpleGrid>
        {sendMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="md">
            {getApiErrorMessage(sendMutation.error)}
          </Alert>
        ) : null}
        {!canConfirm ? (
          <Text size="xs" c="dimmed" mt="xs">
            Supplier confirmation is enabled only after the PO is sent.
          </Text>
        ) : null}
      </Paper>
```

Add the LOT board scroll ref near the top of the component body (after the mutations, before `if (detailQuery.isLoading)` is fine, but it must be declared unconditionally):
```tsx
  const lotBoardRef = useRef<HTMLDivElement>(null);
```
Update the React import to include `useRef`:
```tsx
import { type ReactNode, useRef, useState } from 'react';
```

Attach the ref to the LOT planning section by wrapping the existing planning block in a div. Change the `planningQuery` render block wrapper to:
```tsx
      <div ref={lotBoardRef}>
        {planningQuery.isLoading ? (
          /* …unchanged loader… */
        ) : planningQuery.isError || !planningQuery.data ? (
          /* …unchanged error… */
        ) : (
          <LotPlanningBoard planning={planningQuery.data} canManage={canManage} />
        )}
      </div>
```

Remove the now-unused imports from the panel if they are no longer referenced after this task: `Badge`, `Button`, `Group`, `Title`, `IconCircleCheck`, `IconPencil`, `IconSend`, `IconX`. (Keep `Alert`, `Loader`, `Paper`, `SimpleGrid`, `Stack`, `Text`, `IconAlertTriangle`, and `BackActionButton`, which the edit workbench branch still uses.) Verify with lint in Step 4 and delete exactly those that lint reports as unused.

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: no type errors; zero lint errors (fix any unused-import errors by removing the dead imports named above).

- [ ] **Step 5: Manual visual check**

Run: `cd frontend && npm run dev`, open a PO detail. Confirm: two-tier header with identity + `[Edit] [Send PO|Confirm] [Create DO] [⋯]`; the More menu shows Close; Create DO scrolls down to the LOT board; header stays pinned on scroll. Existing Send/Confirm/Edit/Close still work.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/purchase-orders/components/PoControlHeader.tsx \
        frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx \
        frontend/src/styles/purchase-orders.css
git commit -m "feat(po): add two-tier PO control header with action hierarchy"
```

---

### Task 3: PoExecutionSummary component + replace signal grid

**Files:**
- Create: `frontend/src/features/purchase-orders/components/PoExecutionSummary.tsx`
- Modify: `frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx`
- Modify: `frontend/src/styles/purchase-orders.css`

**Interfaces:**
- Consumes: `getPoFulfillment`, `totalPoAmount`, `getDateDelayDays`, `dateOnly` (model); `PurchaseOrderLineV1`, `PurchaseOrderV1`.
- Produces: `export function PoExecutionSummary(props: { order: PurchaseOrderV1; lines: PurchaseOrderLineV1[] }): JSX.Element`

- [ ] **Step 1: Create the component**

Create `components/PoExecutionSummary.tsx`:

```tsx
import { Badge, Group, Progress, SimpleGrid, Text } from '@mantine/core';

import type { PurchaseOrderLineV1, PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { dateOnly, getDateDelayDays, getPoFulfillment, totalPoAmount } from '../model/purchaseOrderModel';

// Execution summary: four decision cards (Amount / Lines / Fulfillment / ETA).
export function PoExecutionSummary({ lines, order }: { order: PurchaseOrderV1; lines: PurchaseOrderLineV1[] }) {
  const currency = order.currency?.currency_code ?? '';
  const amount = `${totalPoAmount(lines).toLocaleString()} ${currency}`.trim();
  const f = getPoFulfillment(lines);
  const plannedEta = order.logistics_timeline?.unloading_port?.eta ?? order.expected_eta;
  const actualAta = order.logistics_timeline?.unloading_port?.ata;
  const delay = getDateDelayDays(plannedEta, actualAta);
  const eta = dateOnly(plannedEta) || '-';
  const etaStatus = !actualAta
    ? { color: 'gray', label: 'Planned' }
    : delay && delay > 0
      ? { color: 'red', label: `${delay}d late` }
      : { color: 'teal', label: 'On time' };
  const lottedPct = f.ordered > 0 ? Math.min(100, Math.round((f.lotted / f.ordered) * 100)) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="dl-metrics-strip purchase-order-summary-strip">
      <SummaryCard label="Amount" value={amount || '-'} sub={currency ? `Currency ${currency}` : 'Order value'} />
      <SummaryCard label="Lines" value={String(f.totalLines)} sub={`${f.lottedLines}/${f.totalLines} lotted`} />

      <div className="purchase-order-summary-card">
        <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
          Fulfillment
        </Text>
        <Progress value={lottedPct} color="teal" size="sm" mt={8} mb={8} aria-label="Lotted progress" />
        <Group gap={10} className="purchase-order-summary-fulfillment">
          <Stat label="Ord" value={f.ordered} />
          <Stat label="Conf" value={f.confirmed} />
          <Stat label="Lot" value={f.lotted} />
          <Stat label="Ship" value={f.shipped} />
          <Stat label="Recv" value={f.received} />
        </Group>
      </div>

      <div className="purchase-order-summary-card">
        <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
          ETA
        </Text>
        <Text fw={900} size="lg" className="tabular-nums">
          {eta}
        </Text>
        <Badge size="sm" color={etaStatus.color} variant="light" mt={4}>
          {etaStatus.label}
        </Badge>
      </div>
    </SimpleGrid>
  );
}

function SummaryCard({ label, sub, value }: { label: string; value: string; sub: string }) {
  return (
    <div className="purchase-order-summary-card">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={900} size="lg" className="tabular-nums" title={value}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {sub}
      </Text>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="purchase-order-summary-stat">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={800} className="tabular-nums">
        {value.toLocaleString()}
      </Text>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for the summary strip**

Append to `src/styles/purchase-orders.css`:

```css
/* PO execution detail — summary strip cards */
.purchase-order-summary-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--kbfe-space-sm) var(--kbfe-space-md);
  border: 1px solid var(--kbfe-border-primary);
  border-radius: var(--mantine-radius-md);
  background: var(--kbfe-surface-elevated);
  box-shadow: var(--kbfe-shadow-sm);
}

.purchase-order-summary-fulfillment {
  flex-wrap: wrap;
  row-gap: 6px;
}

.purchase-order-summary-stat {
  display: flex;
  flex-direction: column;
  min-width: 44px;
}
```

- [ ] **Step 3: Replace the signal grid in the panel**

In `PurchaseOrderDetailPanel.tsx`: add import
```tsx
import { PoExecutionSummary } from './PoExecutionSummary';
```
Replace the temporary hero `<Paper … purchase-order-detail-hero>` block from Task 2 (the `SimpleGrid` of `PoHeroFact` tiles plus the alert/hint) with:
```tsx
      <PoExecutionSummary order={order} lines={lines} />

      {sendMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(sendMutation.error)}
        </Alert>
      ) : null}
      {!canConfirm ? (
        <Text size="xs" c="dimmed">
          Supplier confirmation is enabled only after the PO is sent.
        </Text>
      ) : null}
```
Delete the now-unused `PoHeroFact` function at the bottom of the file and its `ReactNode` import if unused. Remove `SimpleGrid` from the panel's Mantine import if no longer referenced. The `lotCount`, `containerCount`, `eta`, and `amount` locals may now be unused in the panel — remove any that lint flags (they are recomputed inside `PoExecutionSummary`).

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: no type errors; zero lint errors (remove any locals/imports lint reports unused).

- [ ] **Step 5: Manual visual check**

Run dev server; confirm four cards render: Amount, Lines (`x/y lotted`), Fulfillment (progress bar + Ord/Conf/Lot/Ship/Recv), ETA (date + On time/Planned/late badge).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/purchase-orders/components/PoExecutionSummary.tsx \
        frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx \
        frontend/src/styles/purchase-orders.css
git commit -m "feat(po): add execution summary cards (amount/lines/fulfillment/eta)"
```

---

### Task 4: Slim Commercial & Logistics band

**Files:**
- Modify: `frontend/src/features/purchase-orders/components/PurchaseOrderDetailInfo.tsx`
- Modify: `frontend/src/styles/purchase-orders.css`

**Interfaces:**
- Unchanged public signature: `PurchaseOrderDetailInfo({ lines, order })`. Internally drops the standalone Amount block (now in the summary) and renders a compact chip row + the existing timeline. Notes stay for now (Task 5 relocates them).

- [ ] **Step 1: Rework the header + commercial panel**

In `PurchaseOrderDetailInfo.tsx`, replace the top `<Group … purchase-order-detail-header>` block (the "Commercial overview" title + the `purchase-order-amount-block`) with a slim title and drop the amount block:
```tsx
      <div className="purchase-order-detail-header w-full">
        <Text fw={800}>Commercial &amp; logistics</Text>
        <Text size="xs" c="dimmed">
          Terms and logistics timing for this purchase order.
        </Text>
      </div>
```
Replace the `<div className="purchase-order-commercial-panel">` containing the three `InfoCard`s with a compact chip row:
```tsx
        <div className="purchase-order-commercial-chips">
          <CommercialChip label="Financial" value={currencyCode} meta={`Rate ${order.exchange_rate ?? '-'}`} />
          <CommercialChip label="Trade" value={order.incoterm?.incoterm_code ?? '-'} meta={order.payment_term || '-'} />
          <CommercialChip label="Transport" value={transportMode} meta={order.po_type || '-'} />
        </div>
```
Replace the `InfoCard` helper function with a `CommercialChip` helper:
```tsx
function CommercialChip({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <div className="purchase-order-commercial-chip">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="sm" lineClamp={1} title={value}>
        {value || '-'}
      </Text>
      <Text size="xs" c="dimmed" lineClamp={1} title={meta}>
        {meta || '-'}
      </Text>
    </div>
  );
}
```
The `amount` local and `totalPoAmount` import in this file are now unused — remove them. Remove the now-unused icon imports for `InfoCard` (`IconCoins`, `IconFileInvoice`, `IconTruckDelivery`) if lint flags them. Keep the timeline and its icons untouched.

- [ ] **Step 2: Add CSS for the chip row**

Append to `src/styles/purchase-orders.css`:

```css
/* PO execution detail — compact commercial chip row */
.purchase-order-commercial-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kbfe-space-sm);
}

.purchase-order-commercial-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
  padding: 6px var(--kbfe-space-sm);
  border: 1px solid var(--kbfe-border-primary);
  border-radius: var(--mantine-radius-sm);
  background: color-mix(in srgb, var(--kbfe-border-primary) 5%, transparent);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: no type errors; zero lint errors.

- [ ] **Step 4: Manual visual check**

Run dev server; confirm the commercial card is now a single slim band: title, three compact chips (Financial/Trade/Transport), and the logistics timeline below. No duplicate Amount (it lives in the summary now).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/purchase-orders/components/PurchaseOrderDetailInfo.tsx \
        frontend/src/styles/purchase-orders.css
git commit -m "refactor(po): slim commercial card into compact chips + timeline band"
```

---

### Task 5: Layout orchestration — hybrid grid + Supporting footer

**Files:**
- Modify: `frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx`
- Modify: `frontend/src/styles/purchase-orders.css`

**Interfaces:**
- Consumes: all components wired in Tasks 2–4, `order.notes`.
- Produces: final composed detail panel; no new exports.

- [ ] **Step 1: Reorder the panel body into the final layout**

In `PurchaseOrderDetailPanel.tsx`, arrange the returned `<Stack gap="lg">` children in this exact order and wrap the PO-lines + LOT-board pair in a workspace grid; move confirmations + notes into a Supporting footer:
```tsx
    <Stack gap="lg">
      <PoControlHeader … />

      <PoExecutionSummary order={order} lines={lines} />

      {sendMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(sendMutation.error)}
        </Alert>
      ) : null}
      {!canConfirm ? (
        <Text size="xs" c="dimmed">
          Supplier confirmation is enabled only after the PO is sent.
        </Text>
      ) : null}

      <PurchaseOrderDetailInfo order={order} lines={lines} />

      <div className="purchase-order-detail-workspace">
        <div className="purchase-order-detail-workspace-lines">
          <PoLinesTable lines={lines} currencyCode={order.currency?.currency_code ?? ''} />
        </div>
        <div className="purchase-order-detail-workspace-lots" ref={lotBoardRef}>
          {planningQuery.isLoading ? (
            <Paper withBorder p="lg">
              <Group justify="center">
                <Loader size="sm" />
                <Text c="dimmed">Loading LOT planning...</Text>
              </Group>
            </Paper>
          ) : planningQuery.isError || !planningQuery.data ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(planningQuery.error)}
            </Alert>
          ) : (
            <LotPlanningBoard planning={planningQuery.data} canManage={canManage} />
          )}
        </div>
      </div>

      <div className="purchase-order-detail-supporting">
        <PurchaseOrderConfirmationsPanel purchaseOrderId={id} />
        {order.notes ? (
          <Paper withBorder p="md" className="purchase-order-notes-card">
            <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
              Notes
            </Text>
            <Text size="sm" mt={4}>
              {order.notes}
            </Text>
          </Paper>
        ) : null}
      </div>

      <SupplierConfirmationModal … />
    </Stack>
```
Keep `Group` in the Mantine import (used by the loader). Ensure `lotBoardRef` now lives on `purchase-order-detail-workspace-lots` (remove the temporary wrapper div from Task 2). `SupplierConfirmationModal` props unchanged.

- [ ] **Step 2: Remove Notes from the commercial band**

In `PurchaseOrderDetailInfo.tsx`, delete the trailing `order.notes` block (the `<div className="purchase-order-detail-notes">…</div>`) — notes now render in the Supporting footer. Remove any import left unused by that deletion.

- [ ] **Step 3: Add CSS for the hybrid workspace grid + supporting footer**

Append to `src/styles/purchase-orders.css`:

```css
/* PO execution detail — PO lines ∥ LOT board workspace.
   Single column by default; two columns only on very wide content so the
   dense PO-lines table keeps enough width. */
.purchase-order-detail-workspace {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--kbfe-space-md);
  align-items: start;
}

.purchase-order-detail-workspace-lines,
.purchase-order-detail-workspace-lots {
  min-width: 0;
}

@media (min-width: 1500px) {
  .purchase-order-detail-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.purchase-order-detail-supporting {
  display: flex;
  flex-direction: column;
  gap: var(--kbfe-space-md);
}

.purchase-order-notes-card {
  background: var(--kbfe-surface-elevated);
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: no type errors; zero lint errors.

- [ ] **Step 5: Manual visual check at two widths**

Run dev server. At a wide window (content ≥1500px, e.g. sidebar collapsed on a large monitor) confirm PO Lines and LOT board sit side by side. Narrow the window: they stack (full-width table, then full-width LOT board). Confirm LOT board is above Supplier Confirmations; Notes render in the footer; Create DO still scrolls to the board.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/purchase-orders/components/PurchaseOrderDetailPanel.tsx \
        frontend/src/features/purchase-orders/components/PurchaseOrderDetailInfo.tsx \
        frontend/src/styles/purchase-orders.css
git commit -m "feat(po): compose final execution-detail layout with hybrid workspace grid"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full verify pipeline**

Run: `cd frontend && npm run verify`
Expected: lint, boundaries, typecheck, tests, and build all pass.

- [ ] **Step 2: Regression sweep of existing behaviour**

With the dev server, confirm end-to-end that nothing regressed: Send PO (DRAFT), Confirm (SENT → opens modal), Edit (DRAFT → edit workbench), Close (More menu → back to list), LOT drag/reorder, split modal, select LOTs + Create Internal DO from the board, PO-lines search/filter chips, row expand. All must behave exactly as before this refactor.

- [ ] **Step 3: Final commit (only if Step 1/2 required fixes)**

```bash
git add -A frontend/src/features/purchase-orders frontend/src/styles/purchase-orders.css
git commit -m "fix(po): resolve verification findings for execution-detail layout"
```

---

## Self-Review

**Spec coverage:**
- Control header 2-tier + action hierarchy + More menu + sticky → Task 2. ✓
- Create DO scrolls to LOT board → Task 2 (ref) + Task 5 (ref relocation). ✓
- 4 summary cards incl. Fulfillment (ordered/confirmed/lotted/shipped/received) → Task 1 (selector) + Task 3. ✓
- Compact Commercial & Logistics band (chips + timeline) → Task 4. ✓
- PO Lines ∥ LOT board hybrid grid (2-col ≥1500px, else stacked) → Task 5. ✓
- LOT board promoted above Supplier Confirmations; Supporting footer (Confirmations + Notes; Audit omitted) → Task 5. ✓
- No behaviour/filter/drag-drop/backend changes; presentation only → enforced by Global Constraints + Task 6 regression sweep. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full code; the only `…` marks are explicit "unchanged, keep existing markup" references, not omitted new code. ✓

**Type consistency:** `getPoFulfillment` return shape (`ordered/confirmed/lotted/shipped/received/lottedLines/totalLines`) is defined in Task 1 and consumed identically in Task 3. `PoControlHeader`/`PoExecutionSummary` prop names match their call sites in Tasks 2/3/5. `lotBoardRef` is a `useRef<HTMLDivElement>` created in Task 2 and reattached in Task 5. ✓
