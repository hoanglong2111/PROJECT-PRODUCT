# Quotation fee-line redesign — compact table, show-but-disable

**Date:** 2026-06-30
**Scope:** `PROJECT-PRODUCT/frontend` only. Presentation change; no payload/API contract change.

## Problem

The quotation create form renders each fee through `QuotationChargeLineRow`, which
**hides** the qty / UOM / unit-price inputs until a `Switch` is turned on. A disabled
fee is therefore just a lonely toggle, and every revealed input repeats its own label,
making enabled sections visually heavy and inconsistent.

Requirement: when a fee is toggled **off**, keep its inputs **visible but disabled**
(greyed, not editable) rather than hidden — without turning the form into a wall of grey
inputs.

## Decision

Replace the per-row `Group` layout with a **compact table** per fee block. Columns are
labelled once in a header row; each fee is a row; disabled rows are dimmed with their
inputs rendered but `disabled`.

## Design

### Row states
- **On** — full opacity, inputs editable, computed total on the right.
- **Off** — row dimmed (`opacity ~0.55`), every input rendered but `disabled`, total cell shows `—`.
- **On but no price** — editable, total shows `—` until a unit price is entered (an enabled
  empty row reads as "needs input", not "0").

### Disabled rows keep seeded defaults, greyed
When off: qty shows `1`, UOM shows the catalog default (e.g. `BL`) — greyed, not blank — so
the row previews what you get the moment you tick it on. Unit price stays empty (no sensible
default price).

### Columns (header row, once)
`☐ | Fee | Qty | UOM | Unit price | Total`. Numeric columns right-aligned, `tabular-nums`.

### Charge-code mapping — demoted to text
Mandatory rows no longer carry an inline charge-code `Select`. The **Fee** column shows the
catalog fee name with the resolved code as a dimmed suffix, e.g. `DO fee · DOF`. Re-mapping
inline is dropped (rare action, doubles row width). The default-code resolution logic in
`QuotationForm` is unchanged — only its inline editor is removed.

### Other / arising fees — same table, editable Fee column
The group-chip filter stays above the table. Rows here use an **editable Fee `Select`**
(filtered by the selected group) instead of static text, plus a trailing trash column.
"Add fee" appends a row. Empty state keeps the dimmed hint.

### Section grouping
Catalog sections (Origin / Intl freight / VN local / Customs-transport) render as
**subheader rows spanning the table**, inside one continuous table per fee block — not four
stacked mini-tables.

### Responsive
Desktop-first internal console. No bespoke mobile card layout. Wrap the table in a
`Table.ScrollContainer` so narrow widths scroll horizontally instead of breaking.

## Component shape

- Retire `QuotationChargeLineRow` (the `Group`-based row).
- Add `QuotationFeeTable` rendering header + rows, reused by both the **Mandatory** and
  **Other** sections via props: `editableFee`, `removable`, `onToggle?`, plus the existing
  charge-code options / uoms / state handlers.
- Per-line state types (`ChargeLineState`, `MandatoryLineState`, `OtherLine`) are unchanged.
- `QuotationForm` payload-building (`createMutation` flatMap/map, line renumbering) is
  **untouched** — backend still computes amount/tax/total per line.

## Out of scope
- No change to the backend, charge-code master, or API contract.
- No re-map-code-inline feature (can be added later as a popover if a real need appears).
- No mobile card reflow.

## Verification
`npm run verify` (boundaries + typecheck + test + build). Manual: every fee row shows
disabled inputs when off; ticking it on enables inputs and computes the total; the Other
section filters by group and adds/removes rows; subtotal and Create behave as before.
