# Entity Deep Links Pattern

Use this when implementing cross-entity navigation or query-param selected detail.

## Core Hook

Use `src/hooks/useEntityParam.ts` for:

- opening entity context.
- closing entity context.
- preserving unrelated query params.

## Cross-Entity Component

Use `EntityLink` for links between PR, PO, DO, Task, and Workflow.

## Expected Behavior

- Clicking a row action opens detail and writes the query param.
- Closing detail removes that query param.
- Opening a related entity navigates to its route with the right param.
- Missing linked entity renders disabled action with helpful tooltip.

## Common Cases

```text
PR detail -> PO links
PR detail -> DO links
PO detail -> source PR links
PO detail -> linked DO links
DO detail -> workflow/PR/PO/task links
Task detail -> workflow/DO/PR/PO links
```

## Tests To Add Later

- query param opens matching drawer/detail.
- close removes only that param.
- disabled links show missing reason.
