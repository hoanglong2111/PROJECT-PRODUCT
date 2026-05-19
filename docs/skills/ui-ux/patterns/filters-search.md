# Filters And Search Pattern

Use this for toolbar design on entity lists, boards, calendars, and risk queues.

## Toolbar Anatomy

```text
Search | Status filter | Role/filter group | Risk toggle | Count/loading state
```

## Search

- Search should cover business codes and names users remember.
- Placeholder should list searchable dimensions: `PR, item, contract, buyer`.
- Keep search visible on all list pages.

## Filters

- Use Select for status, role, priority, warehouse, supplier.
- Use Switch for binary filters: `Risk only`, `Required only`.
- Use date picker/calendar controls for deadline and due-date ranges.
- Keep default filter as inclusive as possible.

## Count And Loading

- Show `N shown` near filters.
- Show a small loader during background refetch.
- Avoid full-page spinners for simple filter changes.

## Reset Behavior

- Preserve route entity query params unless the user explicitly clears context.
- Reset filters only through an obvious action if many filters exist.
