---
name: kbfe-frontend
description: Use when implementing or refactoring KBFE React frontend code: routes, Mantine screens, TanStack Query, Zustand filters, entity deep links, PR/PO/DO/task UI, and backend API migration.
---

# KBFE Frontend Skill

## Stack

Use the existing stack: React, TypeScript, Vite, React Router, TanStack Query, Zustand, Mantine, Tabler Icons. Do not add a new UI/state framework unless requested.

## Load Order

1. `docs/context/PROJECT_CONTEXT.md`
2. A focused domain or data-model doc
3. This file
4. Only the matching architecture/pattern/module reference

| Need | Reference |
|---|---|
| Routing/deep links | `architecture/routing.md`, `patterns/entity-deep-links.md` |
| Local/server state | `architecture/state-management.md`, `architecture/data-fetching.md` |
| Mutations/forms | `architecture/forms-validation.md`, `patterns/query-mutations.md` |
| Tables/drawers/tabs/states | files under `patterns/` |
| Page specifics | matching file under `modules/` |

## Source Map

- Routes: `src/routes/*`
- API/types: `src/api/logistics.ts`
- Deep links: `src/hooks/useEntityParam.ts`
- Shared state: `src/stores/workspaceStore.ts`
- Shared UI: `src/components/*`
- Delay: `src/utils/delay.ts`
- Shell: `src/components/AppShellLayout.tsx`

## State Ownership

- TanStack Query owns server data.
- Zustand owns persistent filters/preferences.
- URL query params own shareable entity context.
- Local component state owns transient UI state only.

## Query And Mutation Rules

- Use stable keys: `['purchase-requests']`, `['purchase-orders']`, `['delivery-orders']`, `['tasks']`.
- Include filters in keys when backend list filtering is added.
- Mutations invalidate affected entity lists plus dashboard/workflow where relevant.
- Show loading and normalized API errors.

## Deep Links

Use `pr`, `po`, `do`, `task` query params. Closing detail should remove only its own param. Use `EntityLink` for cross-entity navigation and disabled links for missing ids.

## Screen Rules

| Screen | Must keep visible |
|---|---|
| Dashboard | cross-module metrics, risk queue, business flow distribution |
| Workflow | PR/PO/DO/task relationship, all five business-flow tabs |
| PR | line items, flow tags, fulfillment/risk filters, linked PO/DO |
| PO | source PR lines, supplier, SAP state, linked DO, flow tags |
| DO | source lines, shipment/container behavior, flow filter, risk/doc/task state |
| Tasks | role/status/required filters, progress, blockers, parent links |

## UX And Accessibility

- Every icon-only action needs `aria-label` and tooltip.
- Use `calcDelay` until backend returns canonical delay fields.
- Show concrete risk reasons, not only risk severity.
- Keep empty/loading/error states for async screens.
- Keep dense ERP layout readable on mobile via horizontal scroll.

## Done

- `pnpm typecheck` passes.
- Query params and cross-entity links still work.
- New write UI has validation, loading, error, success, and invalidation.
- No new shared abstraction unless behavior repeats.
