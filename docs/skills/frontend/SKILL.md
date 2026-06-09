---
name: kbfe-frontend
description: Use when implementing or refactoring KBFE GD1 React frontend code: routes, Mantine screens, TanStack Query, Zustand filters, entity deep links, PO/DO/Quotation/Shipment/milestone/task UI, and backend API migration.
---

# KBFE GD1 Frontend Skill

## Stack

Use the existing stack: React, TypeScript, Vite, React Router, TanStack Query, Zustand, Mantine, Tabler Icons. Do not add a new UI/state framework unless requested.

## Load Order

1. `docs/context/PROJECT_CONTEXT.md`
2. `docs/context/OPERATING_MODEL.md`
3. A focused domain or data-model doc
4. This file
5. Only the matching architecture/pattern/module reference

## Source Map

- App shell/routing: `frontend/src/app/App.tsx`, `frontend/src/app/routes.tsx`, `frontend/src/app/routeRoles.ts`
- Feature route pages: `frontend/src/features/<feature>/page.tsx`
- Feature-local UI/API/hooks/constants: `frontend/src/features/<feature>/components`, `api.ts`, `hooks.ts`, `constants.ts`
- API/types compatibility: `frontend/src/api/logistics.ts`; shared implementation lives under `frontend/src/shared/api`
- Deep links: `frontend/src/shared/hooks/useEntityParam.ts`
- Shared state: `frontend/src/shared/stores/workspaceStore.ts`

## GD1 Screen Model

| Screen | Must keep visible |
|---|---|
| Dashboard | PO delivery risk, DO status, quotation pending, shipment risk, task workload, landed-cost attention. |
| Workflow | PO -> DO -> Quotation -> Shipment -> milestones -> tasks/cost traceability. |
| PO | General Info, items, LOT management (drag-and-drop), revision, supplier confirmation, DO links, shipment progress, landed cost. |
| DO | origin/destination warehouse, transport type, status, linked PO, linked shipment, confirm action. |
| Quotation | version history, current content, send/reject/approve actions, page-to-page comparison. |
| Shipment | shipment lines, mode, milestones, document management (import/edit/Draft B/L), customs, costs. |
| Tasks | PO-stage task, assignee, status, due date, blocker, linked milestone. |

## State Ownership

- TanStack Query owns server data.
- Zustand owns persistent filters/preferences.
- URL query params own shareable entity context.
- Local component state owns transient UI state only.

## Query Keys

Use stable keys:

- `['purchase-orders']`
- `['delivery-orders']`
- `['quotations']`
- `['shipments']`
- `['shipment-milestones', shipmentId]`
- `['tasks']`
- `['task-templates']`

## Deep Links

Preferred GD1 params:

- `po`
- `do`
- `quotation`
- `shipment`
- `task`

Closing detail should remove only its own param. Cross-entity links should preserve unrelated params.

## Mutations

Mutation UI must show validation, loading, error, success, and invalidation.

High-value invalidations:

- PO send/confirm/revise: PO, DO, tasks, workflow, dashboard.
- DO create/confirm/update: DO, PO, shipment, workflow, dashboard.
- Quotation send/reject/approve: quotation, DO, workflow, dashboard.
- Shipment create/milestone update: shipment, DO, PO, tasks, workflow, dashboard.
- Cost create/update: shipment, PO, dashboard.
- Task update: tasks, PO, shipment, workflow, dashboard.

## UX And Accessibility

- Every icon-only action needs `aria-label` and tooltip.
- Use concrete risk reasons, not only color.
- Keep empty/loading/error states for async screens.
- Dense ERP tables should remain usable on mobile through horizontal scroll.
- Do not expose write actions before backend validation exists unless explicitly building mock scope.

## Theme System

The KBFE theme system has 3 layers that work together:

### Layer 1: Mantine Color Tuple (buildTheme)
- `frontend/src/shared/theme/theme.ts` — `buildTheme(colorPresetId, eventThemeId)` returns a Mantine theme with `primaryColor` and `colors` tuple.
- `frontend/src/shared/theme/colorPresets.ts` — 9 presets: teal, ocean, forest, sunset, midnight, lavender, rose, amber, slate.
- `frontend/src/shared/theme/eventThemes.ts` — 9 event themes with optional `accentOverride` for seasonal colors.
- `cssVariablesResolver` exposes `--mantine-color-{name}-{i}` for both light and dark tuples.

### Layer 2: CSS Variables (theme.css)
- `frontend/src/theme.css` — defines `--kbfe-*` tokens keyed on `data-kbfe-appearance` × `data-kbfe-visual-theme` × `data-kbfe-color-preset` × `data-kbfe-resolved-color-scheme`.
- Custom components use `var(--kbfe-primary-color)`, `var(--kbfe-background-primary)`, etc.
- `data-kbfe-density='compact'` reduces spacing tokens.

### Layer 3: Dataset Attributes (WorkspacePreferencesContext)
- `frontend/src/shared/preferences/WorkspacePreferencesContext.tsx` — stores preferences in localStorage and sets dataset attributes on `<html>`.
- Attributes: `data-kbfe-appearance`, `data-kbfe-color-preset`, `data-kbfe-event-theme`, `data-kbfe-visual-theme`, `data-kbfe-density`, `data-kbfe-resolved-color-scheme`.

### Adding a New Color Preset
1. Add to `colorPresets.ts`: `{ id, primaryColor, colors: { light: [...], dark: [...] } }`.
2. Add CSS rule in `theme.css`: `html[data-kbfe-color-preset='<id>'] { --kbfe-primary-color: ...; }`.
3. Add translation keys in `messages.ts`: `settings.colorPresets.<id>`.
4. Add label in `labels.ts`: `colorPresetLabels`.

### Adding a New Event Theme
1. Add to `eventThemes.ts`: `{ id, emoji, colorPresetId, accentOverride? }`.
2. Add translation keys in `messages.ts`: `settings.eventThemes.<id>`.
3. The `accentOverride` modifies Mantine's shade 6 (light) and shade 7 (dark).

### Backend Sync (Phase 6)
- Preferences sync via `GET/PUT /api/users/me/preferences`.
- Server stores in `user_preferences` table.
- localStorage acts as offline cache; server is source of truth when online.

## Done

- `pnpm --dir frontend typecheck` passes for code changes.
- Query params and cross-entity links still work.
- New write UI has validation, loading, error, success, and invalidation.
- GD1 naming is used in new UI text; legacy names are compatibility-only.
- Theme system: color presets work, event themes apply, dark mode + compact density functional.
- LOT drag-and-drop provides visual feedback and updates DO references.
- Quotation version comparison renders side-by-side with diff highlighting.
