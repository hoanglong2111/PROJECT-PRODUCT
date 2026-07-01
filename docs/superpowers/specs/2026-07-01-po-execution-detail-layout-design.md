# PO Execution Detail — Final Layout Refactor (Design)

Date: 2026-07-01
Scope: `frontend/src/features/purchase-orders` — PO detail screen
Status: Approved-pending (brainstorming output)

## Goal

Restructure the Purchase Order detail screen from a flat stack of equal-weight
sections into the "final layout" from the product request, so an operator can
answer at a glance: *what state is this PO in, what's missing, which LOT is
ready, can I create a DO.*

This is a **layout + presentation** refactor only. It uses data and API
endpoints that already exist. It intentionally **excludes** the heavier
behaviour tracks (DO readiness reasons, merge/swap popups, mobile
tabs/action-sheets, and a global colour/badge sweep) — those are separate
future increments.

## Target layout

```
+--------------------------------------------------------------+
| PO-KBI-2026-001  Confirmed  Import  Contract KBI-CN-2026-001 |  <- Control header
| Supplier: FUJIAN KANGBO MOTOR PARTS                          |     (sticky, 2-tier)
|                         [Edit]  [Send PO/Confirm]  [Create DO]  [More] |
+--------------------------------------------------------------+

+------------+------------+------------+------------+
| Amount     | Lines      | Fulfillment| ETA        |   <- Execution summary (4 cards)
+------------+------------+------------+------------+

+--------------------------------------------------------------+
| Commercial & Logistics (compact chips + timeline band)       |   <- 1 slim band
+--------------------------------------------------------------+

+---------------------------+----------------------------------+
| PO Lines                  | LOT Planning Board                |   <- hybrid grid
| (dense table)             | (workspace)                       |      >=1500px: 2 col
+---------------------------+----------------------------------+      <1500px: stacked

+--------------------------------------------------------------+
| Supplier Confirmations  ·  Notes                             |   <- Supporting footer
+--------------------------------------------------------------+
```

## Decisions locked during brainstorming

1. **Scope** = final proposed layout only (not readiness/merge/swap/mobile).
2. **PO Lines vs LOT board** = hybrid: two columns only when the content area is
   `>= 1500px`; below that, PO Lines (full dense table) stacks above a
   full-width LOT board.
3. **Header Create DO** = present as a primary action, but in this increment it
   only smooth-scrolls to the LOT board (real readiness wiring is deferred).

## Sections

### 1. PO Control Header (`PoControlHeader.tsx`, new)

Replaces the current `purchase-order-detail-hero` header block inside
`PurchaseOrderDetailPanel`.

- **Tier 1 — identity:** `po_no` · `StatusBadge` · type badge (`po_type`) ·
  `Contract {contract_no}` badge. Supplier name on the line below.
- **Tier 2 — actions, with hierarchy:**
  - Primary (state-driven): `DRAFT` → **Send PO**; `SENT` → **Confirm**;
    otherwise no state primary.
  - **Create DO** (secondary-primary): smooth-scrolls to the LOT board section
    (uses a ref/anchor on the board). No readiness logic this increment.
  - Secondary: **Edit** (enabled only when `status === 'DRAFT'`, unchanged rule).
  - **More (⋯) menu** (Mantine `Menu`): **Close** now; room for Export later.
- Sticky: `position: sticky; top: 0` within the panel; verify against the
  app-shell scroll container during implementation and fall back to non-sticky
  if the container doesn't cooperate.
- Existing behaviour preserved: send mutation, confirm modal trigger, edit
  workbench toggle, the "confirmation enabled only after sent" hint, and the
  send-error alert all keep working; they are just relocated.

### 2. Execution Summary (`PoExecutionSummary.tsx`, new)

Four cards in a `dl-metrics-strip`, replacing the current four `PoHeroFact`
signal tiles:

- **Amount** — `totalPoAmount(lines)` + currency code.
- **Lines** — line count + "x/y lotted" (count of lines whose
  `getPoLineLotState` is `full`).
- **Fulfillment** — mini progress showing summed quantities:
  Ordered · Confirmed · Lotted · Shipped · Received.
  *Caveat:* units are mixed across lines (SET/PCS…), so this shows raw summed
  numbers with a neutral "units" label — it is a signal, not an accounting total.
- **ETA** — planned ETA date + On time / Late status, reusing the existing
  delay logic (`getDateDelayDays`) already used in `PurchaseOrderDetailInfo`.

### 3. Commercial & Logistics band (`PurchaseOrderDetailInfo.tsx`, slimmed)

Compress the current two-panel card into one slim full-width band:

- Top: compact chip row — **Financial** (`currency` · `Rate {exchange_rate}`),
  **Trade** (`incoterm` · `payment_term`), **Transport** (`transport_mode` ·
  `po_type`).
- Below: keep the existing **Logistics Timeline** (CRD/ETD → ETA → Warehouse)
  largely as-is — it is already good and useful.
- Notes move out of this card into the Supporting footer.

### 4. PO Lines ∥ LOT Board (grid wrapper in `PurchaseOrderDetailPanel.tsx`)

- Wrap `<PoLinesTable>` and `<LotPlanningBoard>` in a CSS grid container.
- `@media (min-width: 1500px)` → two columns (PO Lines left, LOT board right).
  Below → single column, PO Lines first (full-width dense table intact), LOT
  board second.
- The LOT board thereby rises **above** Supplier Confirmations.
- **No change** to LOT board internals, drag/drop, split modal, or Create-DO-
  from-selected-LOTs behaviour. Only its position and container change.
- Add an anchor (ref or `id`) so the header Create DO can scroll to it.

### 5. Supporting footer

- `PurchaseOrderConfirmationsPanel` (unchanged) moves to the bottom.
- **Notes**: if `order.notes` present, render a small notes card here.
- **Audit**: the API exposes no audit-trail data today → omit (no empty frame).

## Model change

Add one pure selector to `model/purchaseOrderModel.ts`, matching the existing
`getPurchaseOrderSummary` / `totalPoAmount` style:

```ts
export function getPoFulfillment(lines: PurchaseOrderLineV1[]): {
  ordered: number; confirmed: number; lotted: number; shipped: number; received: number;
  lottedLines: number; totalLines: number;
}
```

Pure, display-only aggregation (sum of `toNumber(qty_*)` across lines +
`getPoLineLotState === 'full'` count). Not filter logic. Covered by a unit test
in `model/__tests__/purchaseOrderModel.test.ts`.

## CSS

All new rules go in `src/styles/purchase-orders.css` (domain file), namespaced
`purchase-order-*` / `po-*`, reusing `dl-*` design-language classes where they
fit (`dl-metrics-strip` for the summary, `dl-page-header` idiom for the control
bar). Keep responsive `@media` rules beside the rules they modify, per the
frontend styling rules. No new global CSS file needed.

## Out of scope (future increments)

- DO Readiness bar with per-blocker reasons ("why Create DO is disabled").
- Drag/drop drop-zone highlighting redesign, "same item found" merge highlight.
- Move/Merge/Split quantity popup; Swap LOT/line action with confirmation
  (these also need new backend endpoints — only move/split/reorder exist today).
- Mobile tabs + action sheet; tablet-specific card reflow.
- Global colour/badge semantic standardisation sweep (teal/blue/orange/red/gray).
  New elements introduced here will follow the intended semantics, but existing
  elements are not swept in this pass.

## Testing / verification

- `npm run typecheck`, `npm run lint` (zero errors), `npm run test` for the new
  `getPoFulfillment` unit test.
- Manual: verify the detail screen at wide (>=1500px content) and narrow
  widths; verify Create DO scrolls to the board; verify existing actions
  (Send / Confirm / Edit / Close) still work from their new positions.
- `npm run verify` before finishing.

## Risks

- **Sticky header** may need adjustment depending on the real scroll container;
  fall back to static positioning if sticky misbehaves.
- **Two-column density**: at ~750px per column the dense PO Lines table already
  uses `table-layout: fixed` + compact number formatting, so it should hold; if
  it feels cramped in practice, the 1500px breakpoint can be raised.
