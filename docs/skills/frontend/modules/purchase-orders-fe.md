# Purchase Orders Frontend Module

Use this when implementing `frontend/src/features/purchase-orders/page.tsx`.

## Query

Use `fetchPurchaseOrders` with query key `purchase-orders`. Target GD1 data should include source PR lines, revision, supplier confirmation, ETA/ETD, shipment progress, and landed-cost summary.

## State

Current state:

- local search string
- selected PO
- drawer open state

URL param:

- `po`

## Filtering

Search dimensions:

- `po_no`
- supplier
- source PR
- item lines
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
- source PR lines
- PO lines and quantities
- linked shipments
- landed cost allocation
- PO-stage tasks

## Mutations

Target actions:

- send PO
- confirm supplier response
- revise PO
- cancel PO
- create shipment from selected PO lines

Invalidate PO, PR, shipment, tasks, workflow, dashboard after mutations.
