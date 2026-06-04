# Frontend Data Fetching Architecture

Use this when changing TanStack Query usage, API clients, mock data, or cache invalidation.

## Current State

Data is loaded from backend API helpers in `frontend/src/api/logistics.ts`; no client-side mock fallback is used.

Current compatibility query keys:

- `purchase-requests`
- `purchase-orders`
- `delivery-orders` as legacy shipment data
- `tasks`
- `dashboard-stats`
- `global-search`

Target GD1 query keys:

- `shipments`
- `shipment-milestones`
- `shipment-costs`
- `task-templates`

## Fetching Rules

- Keep fetch functions outside route files.
- Keep TypeScript types close to API layer until generated contracts exist.
- Use stable query keys.
- Include filter objects in query keys once API filtering exists.

## Future API Client

Target modules:

```text
frontend/src/api/client.ts
frontend/src/api/purchaseRequests.ts
frontend/src/api/purchaseOrders.ts
frontend/src/api/shipments.ts
frontend/src/api/tasks.ts
frontend/src/api/taskTemplates.ts
```

Avoid direct `axios` calls from route components.

## Invalidation Rules

- PR mutation invalidates PR list/detail, PO, workflow, dashboard.
- PO mutation invalidates PO list/detail, related PRs, shipments, tasks, workflow, dashboard.
- Shipment mutation invalidates shipment list/detail, related PO, tasks, workflow, dashboard.
- Milestone mutation invalidates shipment, milestones, tasks, PO, dashboard.
- Cost mutation invalidates shipment, costs, related PO landed-cost views, dashboard.
- Task mutation invalidates tasks, related PO, shipment, workflow, dashboard.

## Error Handling

Render:

- validation errors near forms
- not-found entity context in warning/empty state
- integration failures as Alert with specific reason
