# Delivery Order Module

Delivery Order (DO) is the operational unit between Purchase Order and Shipment.

DO is not DTO. DTO means Domestic Transport Order and belongs to inland trucking after shipment customs clearance.

## Relationship

```text
Purchase Order 1 -> N Delivery Orders
Delivery Order 1 -> 1 Shipment
Shipment 1 -> 0..1 Domestic Transport Order
```

- A PO can create many DOs.
- Each DO belongs to exactly one PO.
- Each confirmed DO proceeds to exactly one Shipment / delivery execution record.
- DTO is created/enabled later for domestic trucking when shipment reaches customs clearance or delivery planning.

## DO Workflow

Business target:

```text
Create DO
-> Select warehouse / delivery address
-> Create quotation v1
-> Revise quotation if needed
-> Create quotation v2, v3...
-> Select final quotation
-> Confirm DO
-> Proceed to shipment / delivery
```

Current backend V1 runtime:

```text
DRAFT
-> READY_FOR_QUOTATION
-> QUOTATION_CONFIRMED
-> ASSIGNED_TO_SHIPMENT
-> CLOSED
CANCELLED
```

The frontend Delivery Orders page reads real DO rows from `/api/v1/delivery-orders` through `src/shared/api/deliveryOrders.ts` and a compatibility adapter in `src/shared/api/logistics.ts`.

## DO Data

Core DO fields:

- PO reference
- Selected PO lines / DO lines
- Warehouse / delivery address
- Origin warehouse when applicable
- Destination warehouse when applicable
- Transport/service type
- Delivery dates
- Quotation versions
- Selected final quotation
- Confirmation status and confirmed date
- Linked shipment

Current V1 response-backed fields:

- DO number
- PO reference
- PO supplier
- Transport mode
- Planned cargo ready date, ETD, ETA
- Origin and destination address
- Warehouse name
- LOT links
- DO lines derived from active PO LOT lines
- DO lifecycle status

## Quotation Rules

- A DO can have quotation v1, v2, v3...
- Quotation revisions are preserved for audit.
- Users can compare quotation versions side-by-side.
- Exactly one quotation version/candidate must be selected as final before DO confirmation.
- A DO cannot be confirmed without a selected final quotation.

## Confirmation Rules

A DO can be confirmed only when:

- warehouse / delivery address is selected
- at least one DO line exists
- final quotation is selected
- required delivery dates are present

After confirmation, the next operational step is Shipment / delivery execution.

## Frontend Integration Notes

- The backend-preferred create path is `POST /api/v1/delivery-orders/from-lots`, using selected active PO LOT IDs.
- The current DO list/detail screen uses real backend DO data.
- The current DO detail screen can run real lifecycle actions: ready for quotation, confirm quotation, assign to shipment, cancel, and close.
- Quotation comparison and document upload panels remain UI-only compatibility views until matching backend endpoints are added.
- Shipment creation from assigned DO remains pending backend/API integration.
