# Frontend Component Structure Architecture

Use this when extracting components or deciding where code belongs.

## Current Structure

```text
frontend/src/app/          app shell, route config, route role config
frontend/src/features/     feature-owned route pages and local components/hooks/API/constants
frontend/src/shared/       cross-feature API, auth, components, hooks, i18n, stores, theme, utils
frontend/src/models/       shared TypeScript contracts
frontend/src/app/routes.tsx route config; route pages live in frontend/src/features/
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

## Feature Page Files

Feature page files may own:

- data fetching hooks.
- filter composition.
- selected entity id.
- drawer/tab/modal open state.
- route-specific subcomponents.

Avoid putting API mutation implementations directly in JSX blocks.
