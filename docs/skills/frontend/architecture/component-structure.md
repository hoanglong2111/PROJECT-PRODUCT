# Frontend Component Structure Architecture

Use this when extracting components or deciding where code belongs.

## Current Structure

```text
src/app/          app shell, route config, route role config
src/features/     feature-owned route pages and local components/hooks/API/constants
src/shared/       cross-feature API, auth, components, hooks, i18n, stores, theme, utils
src/models/       shared TypeScript contracts
src/routes/       temporary compatibility re-exports only
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
