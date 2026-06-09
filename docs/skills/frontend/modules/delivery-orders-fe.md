# Delivery Orders Frontend Module

Use this when implementing `frontend/src/features/delivery-orders/page.tsx`.

## Query

- Use `fetchDeliveryOrders` with query key `['delivery-orders']`. Expose DO header, items, warehouses, transport type, and confirmation status.
- Use `fetchQuotationsForDO` with query key `['delivery-orders', doId, 'quotations']` to fetch the versions of quotations linked to the DO.

## State

Use Zustand for:

- `doSearch`
- `doStatusFilter`
- `doTransportFilter`
- `selectedQuotationVersionLeft`, `selectedQuotationVersionRight` (for side-by-side version comparison)

Use URL param:

- `do`

## Filtering

Search dimensions:

- DO code
- PO reference
- Origin warehouse
- Destination warehouse

Core filters:

- Draft
- Confirmed
- Ready to ship
- In transit
- Delivered
- Closed
- Cancelled

## Detail Drawer / Panel

Drawer/panel opens when:

- User clicks a row or action icon.
- Route contains matching `?do=`.

Tabs inside the DO Drawer:
1. **General**: DO info, items list with quantities, linked PO.
2. **Quotation**:
   - Current quote details, freight amount, and status.
   - 1-hour countdown timer for SENT status (calculated from `sentAt` + 1 hour).
   - Version list table.
   - Side-by-side version comparison panel utilizing a structured diff-like UI.
3. **Audit**: State transition logs.

## Mutations

Target actions:

- Confirm DO (origin, destination, transport mode, dates)
- Cancel DO
- **Quotation actions**:
  - `sendQuotation(doId, payload)` -> transitions quotation status to SENT, sets `sentAt`.
  - `rejectQuotation(doId, quotationId, reason)` -> transitions to REJECTED.
  - `approveQuotation(doId, quotationId)` -> transitions to FINAL.

Invalidate `delivery-orders`, `purchase-orders`, `workflow`, and `dashboard` after mutations.
