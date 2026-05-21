# Delivery Orders Frontend Module

Use this when implementing `src/features/delivery-orders/page.tsx`.

## Query

Use `fetchDeliveryOrders` with query key `delivery-orders`.

## State

Use Zustand for:

- `doSearch`
- `doStatusFilter`
- `doRiskOnly`

Use URL params:

- `do`
- `pr`

Use local state:

- selected DO id.

## Filtering

Search dimensions:

- DO number.
- PR code.
- PO number.
- supplier name.
- item name.

Risk is:

- warehouse delay.
- blocked tasks.
- missing documents.
- SAP sync not `SYNCED`.

## Detail

Selected detail is inline below the table today. Keep route-param selection synchronized with selected id.

Future detail tabs should be added incrementally without breaking the table.

## Future Mutations

- update status.
- sync SAP.
- upload documents.
- update planned/actual warehouse entry.
- close DO.

Mutations should invalidate DO, tasks, workflow, dashboard, and related PR/PO.
