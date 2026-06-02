---
name: kbfe-frontend
description: Use when implementing or refactoring KBFE GD1 React frontend code: routes, Mantine screens, TanStack Query, Zustand filters, entity deep links, PR/PO/Shipment/milestone/task UI, and backend API migration.
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

- App shell/routing: `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/routeRoles.ts`
- Feature route pages: `src/features/<feature>/page.tsx`
- Feature-local UI/API/hooks/constants: `src/features/<feature>/components`, `api.ts`, `hooks.ts`, `constants.ts`
- API/types compatibility: `src/api/logistics.ts`; shared implementation lives under `src/shared/api`
- Deep links: `src/shared/hooks/useEntityParam.ts`
- Shared state: `src/shared/stores/workspaceStore.ts`

## GD1 Screen Model

| Screen | Must keep visible |
|---|---|
| Dashboard | PR approval queue, PO delivery risk, shipment risk, task workload, landed-cost attention. |
| Workflow | PR -> PO -> Shipment -> milestones -> tasks/cost traceability. |
| PR | PR lines, approval status, required date, conversion progress, linked PO. |
| PO | supplier, revision, status, source PR lines, shipment progress, landed cost. |
| Shipment | legacy route may be `/delivery-orders`; show shipment lines, mode, milestones, documents, customs, costs. |
| Tasks | PO-stage task, assignee, status, due date, blocker, linked milestone. |

## State Ownership

- TanStack Query owns server data.
- Zustand owns persistent filters/preferences.
- URL query params own shareable entity context.
- Local component state owns transient UI state only.

## Query Keys

Use stable keys:

- `['purchase-requests']`
- `['purchase-orders']`
- `['shipments']`
- `['shipment-milestones', shipmentId]`
- `['tasks']`
- `['task-templates']`

Legacy `['delivery-orders']` can remain until code migrates.

## Deep Links

Preferred GD1 params:

- `pr`
- `po`
- `shipment`
- `task`

Legacy `do` params may remain while the runtime still uses delivery-order naming. Closing detail should remove only its own param. Cross-entity links should preserve unrelated params.

## Mutations

Mutation UI must show validation, loading, error, success, and invalidation.

High-value invalidations:

- PR submit/approve/reject/convert: PR, PO, workflow, dashboard.
- PO send/confirm/revise: PO, tasks, workflow, dashboard.
- Shipment create/milestone update: shipment, PO, tasks, workflow, dashboard.
- Cost create/update: shipment, PO, dashboard.
- Task update: tasks, PO, shipment, workflow, dashboard.

## UX And Accessibility

- Every icon-only action needs `aria-label` and tooltip.
- Use concrete risk reasons, not only color.
- Keep empty/loading/error states for async screens.
- Dense ERP tables should remain usable on mobile through horizontal scroll.
- Do not expose write actions before backend validation exists unless explicitly building mock scope.

## Done

- `pnpm typecheck` passes for code changes.
- Query params and cross-entity links still work.
- New write UI has validation, loading, error, success, and invalidation.
- GD1 naming is used in new UI text; legacy names are compatibility-only.
