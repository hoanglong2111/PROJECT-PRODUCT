# Dashboard Frontend Module

Use this when implementing `src/features/dashboard/page.tsx`.

## Queries

Current data:

- `fetchPurchaseRequests`
- `fetchPurchaseOrders`
- `fetchDeliveryOrders`
- `fetchLogisticsTasks`

## Derived Values

- PR risk count: PR with `delay_days > 0`.
- Active DO: status not `DELIVERED`.
- Blocked tasks: task status `BLOCKED`.
- Missing document orders: DO with `missing_documents.length > 0`.
- Risk rows: DO with delay, blocked task, or missing documents.

## Components

Use:

- Metric card component.
- Alert for cross-module risk.
- Table for risk queue.
- Module link cards/buttons.

## Future Improvements

- Add query error states.
- Add refresh/last updated.
- Add backend risk summary endpoint.
- Add chart only when trend data exists.
