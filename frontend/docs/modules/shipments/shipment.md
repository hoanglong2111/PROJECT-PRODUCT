# Shipment Entity

GD1 uses `shipment` for SEA/AIR import execution and tracking.

```text
purchase_order -> delivery_order -> shipment -> shipment_milestone -> shipment_cost -> domestic_transport_order
```

## Purpose

Shipment tracks:

- SEA/AIR import movement.
- Forwarder/carrier and B/L or AWB identity.
- Route, ETD/ETA, ATD/ATA.
- Confirmed DO and shipped quantities derived from DO lines / PO lines.
- 10 standard milestones.
- Customs stream: green, yellow, red.
- Documents uploaded per shipment or milestone.
- Landed cost inputs for allocation to PO lines.
- Customs-cleared trigger for DTO.
- EDO delivery / warehouse-arrival event.

## Tables

| Table | Purpose |
|---|---|
| `shipment` | Shipment header linked 1:1 to a confirmed DO, with mode, forwarder, carrier, route, B/L/AWB, dates, status, and customs stream. |
| `shipment_line` | Lines derived from the owning DO lines / PO lines, with shipped quantity and lot number. |
| `shipment_milestone` | 10 runtime checkpoints with planned/actual date, source, recorder, and note. |
| `shipment_cost` | Shipment-level cost components and allocation method. |

## Header Shape

| Field | Meaning |
|---|---|
| `shipment_no` | Business shipment code. |
| `mode` | `SEA` or `AIR`. |
| `forwarder_id` | Forwarder master reference. |
| `carrier` | Shipping line or airline. |
| `vessel_flight` | Vessel name or flight number. |
| `bl_awb_no` | Bill of Lading or Air Waybill. |
| `container_no` | Container numbers when applicable. |
| `pol`, `pod` | Port of loading and port of discharge. |
| `etd`, `eta` | Estimated departure/arrival. |
| `atd`, `ata` | Actual departure/arrival. |
| `status` | Shipment state machine. |
| `customs_stream` | `GREEN`, `YELLOW`, or `RED`. |

## Shipment Line

Each `shipment_line` row includes:

- `shipment_id`
- `purchase_order_line_id`
- `qty_shipped`
- `lot_no`

Rules:

- One confirmed DO can create at most one active shipment.
- One shipment belongs to exactly one confirmed DO.
- A shipment can contain multiple PO lines through that DO's lines.
- A PO can have many shipments indirectly because one PO can have many DOs.

## Status And Milestone Mapping

| Milestone code | Shipment status after actual date |
|---|---|
| `BOOKING_CONFIRMED` | `BOOKING_CONFIRMED` |
| `CARGO_READY` | `CARGO_READY` |
| `PICK_UP` | `PICKED_UP` |
| `BL_ISSUED` | `BL_ISSUED` |
| `GATE_IN_POL` | `GATE_IN_POL` |
| `ATD` | `IN_TRANSIT` |
| `CUSTOM_DRAFT_SUBMITTED` | `CUSTOMS_DRAFT` |
| `AN_ATA` | `ARRIVED` |
| `CUSTOM_CLEARED` | `CUSTOMS_CLEARED` |
| `EDO_DELIVERY` | `DELIVERED` |

## Rules

- A shipment must contain at least one active `shipment_line`.
- A shipment must belong to exactly one confirmed DO.
- `shipment_line.qty_shipped > 0`.
- Total shipped quantity per PO line cannot exceed ordered quantity plus tolerance.
- Each new shipment must generate exactly 10 active `shipment_milestone` rows.
- Milestone uniqueness: `(shipment_id, sequence_no)` and `(shipment_id, milestone_code)`.
- `eta >= etd` when both exist.
- `ata >= atd` when both exist.
- `DELIVERED` requires `EDO_DELIVERY.actual_date`.
- Customs stream is required once customs result is known.
- `CUSTOM_CLEARED` can trigger DTO creation.
- `EDO_DELIVERY.actual_date` emits warehouse-arrival event for later WMS/GRN work.

## Cost Rules

- `shipment_cost.amount >= 0`.
- `exchange_rate > 0`.
- Allocation method is `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY`.
- Changing cost or allocation method recalculates landed cost on affected PO lines.

## UI Notes

Shipment board should show shipment number, owning DO, PO references, mode, forwarder, carrier, B/L/AWB, ETA/ATA, status, customs stream, milestone progress, missing documents, cost allocation status, DTO status, and next action.

Detail should prioritize overview, owning DO, selected final quotation, milestone timeline, PO lines, documents, costs, tasks, DTO, incidents, and audit history.
