# Error Loading Empty Pattern

Use this when implementing async or filterable surfaces.

## Loading

- Use Skeletons for tables/cards during initial load.
- Use small Loader near toolbar for background refetch.
- Avoid blocking the whole page for filter changes.

## Empty

Use `EmptyState` for:

- no records in module.
- filters match no records.
- linked entity not found.

Empty copy should say what is missing and why it matters.

## Error

Use Alert for:

- API failures.
- SAP sync failures.
- validation blockers.
- missing linked entity context.

Error messages should name the affected entity or operation.

## Permission

When permissions exist, show disabled action with reason or a permission-aware empty state. Do not hide every unavailable action if the missing ability affects workflow understanding.
