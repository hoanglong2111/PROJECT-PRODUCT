# Frontend Component Structure Architecture

Use this when extracting components or deciding where code belongs.

## Current Structure

```text
src/components/   shared components
src/routes/       route-level screens
src/hooks/        reusable hooks
src/stores/       Zustand stores
src/utils/        shared pure helpers
src/api/          types and fetch functions
```

## Extraction Rules

Extract when:

- the same UI appears in multiple screens.
- the component has a clear entity/pattern responsibility.
- the route file becomes hard to scan.

Keep local when:

- it is used once.
- it depends heavily on route-local state.
- extraction would hide simple rendering logic.

## Shared Components

Prefer existing shared components:

- `EntityLink`
- `StatusBadge`
- `DelayBadge`
- `EmptyState`

Add new shared components for:

- RiskBadge.
- DocumentChecklist.
- ClosureGateSummary.
- EntityHeader.
- FilterToolbar.
- FlowTagBadge.
- FulfillmentProgress.
- SourceLineTable.
- LineItemsEditor.

## Route Files

Route files may own:

- data fetching hooks.
- filter composition.
- selected entity id.
- drawer/tab/modal open state.
- route-specific subcomponents.

Avoid putting API mutation implementations directly in JSX blocks.
