# Delivery Order Module

Delivery Order (DO) is the operational bridge between PO and Shipment.

## Relationship

```text
Purchase Order 1 -> N Delivery Orders
Delivery Order 1 -> 1 Shipment
```

- A PO can create many DOs.
- Each DO belongs to exactly one PO.
- Each confirmed DO proceeds to exactly one Shipment / delivery execution record.
- Shipment is not created from multiple DOs in the current business model.

## DO Workflow

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

## DO Data

Core DO fields:

- PO reference
- Selected PO lines / DO lines
- Warehouse / delivery address
- Origin warehouse when applicable
- Destination warehouse when applicable
- Transport type: `SEA`, `AIR`, `ROAD`, or `RAIL`
- Delivery dates
- Quotation versions
- Selected final quotation
- Confirmation status and confirmed date
- Linked shipment

## Quotation Rules

- A DO can have quotation v1, v2, v3...
- Quotation revisions are preserved for audit.
- Users can compare quotation versions side-by-side.
- Exactly one quotation version/candidate must be selected as final before DO confirmation.
- A DO cannot be confirmed without a selected final quotation.

## Confirmation Rules

A DO can be confirmed only when:

- warehouse / delivery address is selected
- transport type is selected
- at least one DO line exists
- final quotation is selected
- required delivery dates are present

After confirmation, the next operational step is Shipment / delivery execution.
