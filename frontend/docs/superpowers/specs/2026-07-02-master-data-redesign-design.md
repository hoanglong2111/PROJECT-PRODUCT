# Master-Data Screen Redesign Design

Date: 2026-07-02

## Context

The Master-Data feature at `src/features/master-data/` has nine tabs:

- Items
- Suppliers
- Forwarders and Carriers
- Task Templates
- Currencies
- Incoterms
- Transport Modes
- Charge Codes
- UoMs

The mock API already returns the documented fields, but the UI has three issues:

- Dense tables stack too many values in each row.
- Some documented fields are not visible in list views.
- Filter toolbars use inconsistent layouts across tabs.

## Goal

Create a unified, cleaner visual language across all Master-Data tabs with no backend or API changes.

## Approved Design

- Use a hybrid column model: one stacked identity cell plus key attributes promoted to their own columns.
- Keep tables compact enough to avoid large horizontal scroll.
- Use one standardized toolbar skeleton on every tab:
  `[Search] [Status segmented: All / active dot / inactive dot] [entity filters] [count] [Clear] [Add]`.
- Replace text status badges in table rows with green or red status dots and tooltips.
- Keep `ActiveBadge` for modal and detail contexts.
- Use icon-only controls where semantics are self-explanatory:
  primary forwarder, taxable charge, and transport applicability dots.
- Keep Rev/Cost as compact tags because finance semantics are too risky for pure icons.
- Move low-value list fields such as barcode, notes, bank details, and full required-document text into modal/detail views.

## Shared Building Blocks

- `src/features/master-data/components/ReferenceDataPanel.tsx`
- `src/features/master-data/components/referenceColumns.tsx`
- `src/shared/components/ListPagination.tsx`
- `src/shared/components/HeaderLabel.tsx`
- `src/shared/components/EmptyState.tsx`
- `src/shared/components/FilterToolbar.tsx`
- `src/features/master-data/model/masterDataStore.ts`

## New Components

- `src/shared/components/StatusDot.tsx`
  - Props: `{ active: boolean }`
  - Renders a small filled green/teal dot for active and red dot for inactive.
  - Wraps the dot in a Mantine tooltip using `masterData.activeStatus` and `masterData.inactiveStatus`.

- `src/features/master-data/components/MasterDataToolbar.tsx`
  - Provides the unified toolbar shell.
  - Props include search value/change handler, status value/change handler, `filters?: ReactNode`, count, clear and add handlers.
  - Uses a shared select width constant for filter alignment.
  - Uses segmented status control instead of a status `Select`.

## Target Columns

| Tab | Columns |
| --- | --- |
| Items | STT, Item(code/name+en), Category, Type, UOM(base + purchase conversion hint), HS Code, Origin, Ref Price USD, status dot, actions |
| Suppliers | STT, Supplier(code/name+en), Type, Country(+City), Contact(person+email/phone), Terms(currency/incoterm+payment), Lead(days), status dot, actions |
| Forwarders | STT, Forwarder(code/name), Type, Country, Contact, primary icon, status dot, actions |
| Carriers | STT, Carrier(code/name), Type, SCAC/IATA, Route, Booking(person+email), status dot, actions |
| Charge Codes | STT, Charge(code/name-en+vn), Group, Category, UOM, Rev/Cost tag, taxable icon, F/L/A/D/R mode dots, status dot, actions |
| UoMs | STT, UoM(code/name-en+vn), Description, status dot, Updated, actions |
| Currencies | STT, Code/name, Symbol, Decimals, status dot, Updated, actions |
| Incoterms | STT, Code, Name(+vn), Description, status dot, actions |
| Transport Modes | STT, Code/name, Type, Description, status dot, actions |
| Task Templates | Per SOP group: Sort, Task(name+desc), Milestone, SLA, Department, Assignee, status dot, actions |

## Implementation Notes

- Migrate Items to the shared `ReferenceDataPanel`.
- Keep Task Templates grouped by SOP phase, but use the shared toolbar and status dot styling.
- Move Charge Code filters into the shared toolbar `filters` slot.
- Reuse existing store state and pagination behavior.
- Do not change backend, mock API contracts, or create/edit modal behavior except where table-only fields are removed from list columns.

## Verification

- Walk all nine tabs and confirm fields populate from the mock API.
- Confirm status dot tooltips and icon tooltips work.
- Confirm the filter toolbar skeleton is consistent everywhere.
- Confirm segmented status filters All, Active, and Inactive.
- Confirm Clear resets filters and count is correct.
- Confirm client-side pagination and continuous STT still work.
- Run frontend build and type checks.
