# Master-Data Layout Redesign Design

## Goal

Fix the shared master-data layout issues across all nine tabs without changing backend contracts, data values, filtering semantics, or the broader theme system.

## Problems

1. The Add/Clear action cluster lives in the same wrapping toolbar row as search/status/entity filters. When filters wrap, the action buttons can land on an isolated floating line.
2. Fixed-layout tables use very narrow utility columns, but headers do not opt into nowrap, so short labels such as status and taxable split across lines.
3. Identity/name columns without explicit widths absorb remaining fixed-layout table space, especially Charge Code, while useful free-text columns are squeezed.

## Decisions

- Split `MasterDataToolbar` into a filters zone and a dedicated action row.
- Remove the inline result count from the toolbar; keep counts in the table footer area.
- Keep `StatusDot` for status filter segments.
- Add `StatusToggle` for read-only table status cells.
- Add a master-data-only `.md-table` class for nowrap headers and table polish.
- Add `align` support to `ReferenceColumn` so icon/toggle/badge columns can be centered consistently.
- Give identity columns bounded widths and leave true long-text columns flexible.
- Keep `ListPagination` unchanged. Add a local fallback count line when a master-data result set has at most `LIST_PAGE_SIZE` rows.

## Scope

Touched surfaces are limited to master-data shared components, master-data column builders, and master-data CSS classes:

- `MasterDataToolbar`
- `ReferenceDataPanel`
- `TaskTemplatesSection`
- `referenceColumns`
- `StatusToggle`
- `components.css`

## Non-Goals

- No backend, mock API, or data-contract changes.
- No i18n value changes.
- No shared `ListPagination` changes.
- No dependency or framework migration.
