# Purchase Requests Frontend Module

Use this when implementing `src/routes/PurchaseRequests.tsx`.

## Query

Use `fetchPurchaseRequests` with query key `purchase-requests`.

## State

Use Zustand for:

- `prSearch`
- `prStatusFilter`
- `prRiskOnly`

Use URL param:

- `pr`

Use local state for:

- selected PR.
- drawer open state.

## Filtering

Search dimensions:

- PR code.
- item code.
- item name.
- production contract.
- purchasing manager.

Risk-only currently means `delay_days > 0`.

## Detail

Drawer opens when:

- user clicks row action.
- route contains matching `?pr=`.

Close removes `pr` param.

## Future Mutations

- create/edit PR.
- submit approval.
- approve/reject.
- convert to PO.

Add forms only after API validation exists or explicit mock scope is requested.
