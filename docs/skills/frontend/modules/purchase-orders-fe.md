# Purchase Orders Frontend Module

Use this when implementing `frontend/src/features/purchase-orders/page.tsx`.

## Query

Use `fetchPurchaseOrders` with query key `['purchase-orders']`. Target GD1 data should include revision, supplier confirmation, ETA/ETD, LOTs, DOs, and shipment progress.

## State

Current state:

- local search string
- selected PO
- drawer open state
- drag-and-drop state (for LOT assignment)

URL param:

- `po`

## Filtering

Search dimensions:

- `po_no`
- supplier
- item lines
- delivery order number
- shipment number
- supplier reference

Core filters:

- sent
- confirmed
- in production
- ready to ship
- shipped
- received
- cancelled
- revision pending supplier reconfirmation

## Detail

Drawer opens when:

- user clicks row action
- route contains matching `?po=`

Show:

- PO header, revision, supplier, terms
- PO lines and quantities
- **LOT Management board** (enables splitting LOTs and dragging items between them)
- **Linked Delivery Orders (DOs)** and confirmation status
- **Linked shipments**
- PO-stage tasks

## Mutations

Target actions:

- send PO
- confirm supplier response
- revise PO
- cancel PO
- split LOT / reassign items to LOT (drag-and-drop)
- confirm DO
- create shipment from DO lines

Invalidate `purchase-orders`, `delivery-orders`, `shipments`, `tasks`, `workflow`, and `dashboard` after mutations.
