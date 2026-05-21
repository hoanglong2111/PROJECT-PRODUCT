# Purchase Orders Frontend Module

Use this when implementing `src/features/purchase-orders/page.tsx`.

## Query

Use `fetchPurchaseOrders` with query key `purchase-orders`.

## State

Current state:

- local search string.
- selected PO.
- drawer open state.

URL param:

- `po`

## Filtering

Search dimensions:

- PO number.
- supplier code.
- supplier name.
- source PR codes.
- linked DO numbers.

## Detail

Drawer opens when:

- user clicks row action.
- route contains matching `?po=`.

Show source PR and linked DO via `EntityLink`.

## Future Mutations

- retry SAP sync.
- inspect sync logs.
- close/refresh PO fulfillment.

Invalidate PO, related PR, related DO, workflow, and dashboard after mutations.
