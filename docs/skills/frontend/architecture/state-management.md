# Frontend State Management Architecture

Use this when changing Zustand state, local component state, filters, or selected entity behavior.

## State Layers

Use the smallest state owner that works:

- URL query params: shareable entity context.
- TanStack Query: server/mock data.
- Zustand: cross-page UI filters and compact state.
- React local state: drawer open state, selected row id, temporary UI state.
- Form state: create/edit/approval/update forms.

## Zustand Rules

Current store: `src/stores/workspaceStore.ts`.

Good Zustand use:

- persisted or cross-route filters.
- role/status/risk toggles.
- compact mode.

Avoid Zustand for:

- fetched entity data.
- one-off drawer open state.
- derived values that can be computed from query data.

## URL State

Use query params for selected entity because users share links and move between screens.

Examples:

- selected PR: `?pr=...`
- selected DO: `?do=...`
- selected task: `?task=...`

## Derived State

Compute close to the component when cheap:

- filtered rows.
- counts.
- completed task ratio.
- visible risk rows.

Move derived state to backend/API once real services exist.
