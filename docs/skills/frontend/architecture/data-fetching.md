# Frontend Data Fetching Architecture

Use this when changing TanStack Query usage, API clients, mock data, or cache invalidation.

## Current State

Data is loaded from backend API helpers in `src/api/logistics.ts`; no client-side mock fallback is used.

Current query keys:

- `purchase-requests`
- `purchase-orders`
- `delivery-orders`
- `tasks`
- `dashboard-stats`
- `global-search`

## Fetching Rules

- Keep fetch functions outside route files.
- Keep TypeScript types close to API layer until generated contracts exist.
- Use stable query keys.
- Include filter objects in query keys once API filtering exists.

## Future API Client

When backend exists, add a client layer:

```text
src/api/client.ts
src/api/purchaseRequests.ts
src/api/purchaseOrders.ts
src/api/deliveryOrders.ts
src/api/tasks.ts
```

Avoid direct `axios` calls from route components.

## Invalidation Rules

- PR mutation invalidates PR list/detail, workflow, dashboard.
- PO mutation invalidates PO list/detail, related PRs, workflow, dashboard.
- DO mutation invalidates DO list/detail, related PR/PO, tasks, workflow, dashboard.
- Task mutation invalidates tasks, related DO, workflow, dashboard.
- PO/DO creation with `sourceLines[]` must invalidate PR, PO, DO, tasks, dashboard stats, and global search because relationship and remaining-quantity views all change.

## Error Handling

Render:

- validation errors near forms.
- not-found entity context in a warning/empty state.
- integration failures as Alert with specific reason.
