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

Routes are defined in `src/App.tsx`.

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

1. Add the screen in `src/routes`.
2. Register it in `src/App.tsx`.
3. Add navigation in `AppShellLayout` if it is primary.
4. Add route/deep-link behavior to docs if the page owns entity context.
5. Add a UI/UX module spec and FE module spec.
