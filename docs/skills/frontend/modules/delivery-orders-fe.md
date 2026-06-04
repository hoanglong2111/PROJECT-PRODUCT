# Shipment Frontend Module

Use this when implementing the legacy `frontend/src/features/delivery-orders/page.tsx` route or a future shipment route.

## Naming

GD1 canonical name is `Shipment`. Current runtime and route may still say Delivery Orders or DO. Treat that as compatibility only.

## Query

Current compatibility:

- `fetchDeliveryOrders` with query key `delivery-orders`

Target GD1:

- `fetchShipments` with query key `shipments`
- `fetchShipmentMilestones`
- `fetchShipmentCosts`

## State

Use Zustand for:

- `shipmentSearch`
- `shipmentStatusFilter`
- `shipmentRiskOnly`
- `shipmentModeFilter`

Use URL params:

- preferred: `shipment`
- legacy: `do`
- context: `pr`, `po`

## Filtering

Search dimensions:

- shipment number
- PO number
- PR number
- supplier/forwarder
- B/L or AWB
- container number
- vessel/flight

Risk is:

- overdue/missing milestone actual date
- missing required document
- customs yellow/red
- cost allocation pending
- linked task blocked/overdue
- ETA passed without ATD

## Detail

Use tabs:

- Overview
- Lines
- Milestones
- Documents
- Customs
- Costs
- Tasks
- Audit

Selected detail should remain synchronized with route params.

## Mutations

Target actions:

- create shipment from PO lines
- update milestone actual date
- upload milestone document
- add/update shipment cost
- update customs stream
- trigger/inspect warehouse-arrival event

Invalidate shipment, PO, tasks, workflow, dashboard after mutations.
