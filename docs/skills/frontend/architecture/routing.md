# Frontend Routing Architecture

Use this when changing routes, deep links, navigation, or page-level context.

## Current Routes

```text
/                  -> Dashboard
/workflow          -> Workflow
/purchase-requests -> PurchaseRequests
/purchase-orders   -> PurchaseOrders
/delivery-orders   -> DeliveryOrders
/tasks             -> Tasks
```

Routes are defined in `src/app/routes.tsx`; `src/app/App.tsx` composes the router shell and guards. `src/App.tsx` is a compatibility re-export.

## Query Param Contract

Use query params for shareable entity context:

- `pr`
- `po`
- `do`
- `task`

Examples:

```text
/purchase-requests?pr=PR-2026-000145
/purchase-orders?po=PO-4500098123
/delivery-orders?do=DO-2026-000087
/tasks?task=TASK-2026-000553
/workflow?do=DO-2026-000087
```

## Rules

- Use `useEntityParam` for entity open/close behavior.
- Preserve unrelated query params unless explicitly clearing context.
- Cross-entity navigation should use `EntityLink`.
- Do not store shareable context only in local state.

## Adding A Route

1. Add the route component in `src/features/<feature>/page.tsx` and export it from `src/features/<feature>/index.ts`.
2. Register the lazy import in `src/app/routes.tsx`.
3. Add or reuse role sets in `src/app/routeRoles.ts` when the route is protected.
4. Add navigation in `AppShellLayout` if it is primary.
5. Add route/deep-link behavior to docs if the page owns entity context.
6. Add a UI/UX module spec and FE module spec.
