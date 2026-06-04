# Frontend Routing Architecture

Use this when changing routes, deep links, navigation, or page-level context.

## Current Routes

```text
/                  -> Dashboard
/workflow          -> Workflow
/purchase-requests -> PurchaseRequests
/purchase-orders   -> PurchaseOrders
/delivery-orders   -> Legacy Shipment board route
/tasks             -> Tasks
```

Routes are defined in `frontend/src/app/routes.tsx`.

## Query Param Contract

Preferred GD1 params:

- `pr`
- `po`
- `shipment`
- `task`

Legacy compatibility:

- `do` can remain while runtime still uses delivery-order naming.

Examples:

```text
/purchase-requests?pr=PR-2026-000145
/purchase-orders?po=PO-2026-000145
/delivery-orders?shipment=SHP-2026-000087
/tasks?task=TASK-2026-000553
/workflow?shipment=SHP-2026-000087
```

## Rules

- Use `useEntityParam` for entity open/close behavior.
- Preserve unrelated query params unless explicitly clearing context.
- Cross-entity navigation should use `EntityLink`.
- Do not store shareable context only in local state.

## Adding A Route

1. Add the route component in `frontend/src/features/<feature>/page.tsx` and export it.
2. Register the lazy import in `frontend/src/app/routes.tsx`.
3. Add or reuse role sets in `frontend/src/app/routeRoles.ts` when protected.
4. Add navigation in `AppShellLayout` if primary.
5. Add route/deep-link behavior to docs if the page owns entity context.
6. Add a UI/UX module spec and FE module spec.
