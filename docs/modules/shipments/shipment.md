# Shipment Entity

GD1 uses `shipment` for the import lot created from one or more PO lines. The current runtime may still call this concept `delivery_order` or expose `/delivery-orders`; treat that as a compatibility name until migration.

```text
purchase_order_line -> shipment_line -> shipment -> shipment_milestone -> shipment_cost
```

## Purpose

Shipment tracks:

- SEA/AIR import movement
- forwarder/carrier and B/L or AWB identity
- route, ETD/ETA, ATD/ATA
- one or many PO lines in the shipment
- 10 standard milestones
- customs stream green/yellow/red
- documents uploaded per milestone
- landed cost inputs for allocation to PO lines
- warehouse-arrival event for later WMS/GRN work

## Tables

| Table | Purpose |
|---|---|
| `shipment` | Shipment header: number, mode, forwarder, carrier, route, B/L/AWB, dates, status, customs stream. |
| `shipment_line` | Bridge from shipment to PO line with shipped quantity and lot number. |
| `shipment_milestone` | 10 runtime checkpoints with planned/actual date, source, recorder, note. |
| `shipment_cost` | Shipment-level cost components and allocation method. |

## Header Shape

| Field | Meaning |
|---|---|
| `shipment_no` | business shipment code |
| `mode` | `SEA` or `AIR` |
| `forwarder_id` | supplier master reference where supplier type is forwarder |
| `carrier` | shipping line or airline |
| `vessel_flight` | vessel name or flight number |
| `bl_awb_no` | Bill of Lading or Air Waybill |
| `container_no` | JSON array of container numbers |
| `pol`, `pod` | port of loading and port of discharge |
| `etd`, `eta` | estimated departure/arrival |
| `atd`, `ata` | actual departure/arrival |
| `status` | shipment state machine |
| `customs_stream` | `GREEN`, `YELLOW`, `RED` |

## Shipment Line

Each `shipment_line` row includes:

- `shipment_id`
- `purchase_order_line_id`
- `qty_shipped`
- `lot_no`

One shipment can contain multiple PO lines. One PO line can be split across multiple shipments.

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
- `shipment_line.qty_shipped > 0`.
- Total shipped quantity per PO line cannot exceed `qty_ordered * (1 + tolerance_over_pct / 100)`.
- Each new shipment must generate exactly 10 active `shipment_milestone` rows.
- Milestone uniqueness: `(shipment_id, sequence_no)` and `(shipment_id, milestone_code)`.
- `eta >= etd` when both exist.
- `ata >= atd` when both exist.
- `DELIVERED` requires `EDO_DELIVERY.actual_date`.
- `container_no` must be a JSON array when present.
- Customs stream is only required once customs result is known.
- When `EDO_DELIVERY.actual_date` is recorded, emit `shipment.arrived_at_warehouse` for GD2/WMS.

## Cost Rules

- `shipment_cost.amount >= 0`.
- `exchange_rate > 0`.
- Allocation method is `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY`.
- Changing cost or allocation method must recalculate `purchase_order_line.landed_cost_alloc`.

## UI Notes

Shipment board should show shipment number, linked PO lines, mode, forwarder, carrier, B/L/AWB, ETA/ATA, status, customs stream, milestone progress, missing documents, cost allocation status, and next action.

Detail should prioritize overview, milestone timeline, PO lines, documents, costs, tasks, and audit history.

## API Notes

Create shipment payload should include:

```ts
{
  mode: 'SEA' | 'AIR',
  forwarder_id?: string,
  carrier?: string,
  vessel_flight?: string,
  bl_awb_no?: string,
  container_no?: string[],
  pol?: string,
  pod?: string,
  etd?: string,
  eta?: string,
  po_lines: [{ purchase_order_line_id: string, qty_shipped: number, lot_no?: string }]
}
```

Milestone update must validate milestone code and state transition. Cost update must trigger landed-cost recalculation.
