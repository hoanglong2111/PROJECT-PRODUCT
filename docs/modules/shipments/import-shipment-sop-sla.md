# GD1 Import Shipment, Milestone, SOP, And SLA Workflow

This document replaces the older Sea FCL Export-specific workflow for GD1 documentation. GD1 covers import shipment tracking for SEA and AIR, with forwarder/carrier updates, milestone documents, landed cost, SLA timers, and ERP/WMS handoff.

```text
PO confirmed -> Shipment created -> 10 milestones -> Documents -> Costs -> EDO delivery -> warehouse arrival event
```

## Scope

In scope:

- SEA/AIR shipment tracking.
- One shipment containing one or more PO lines.
- One PO line split across multiple shipments.
- 10 standard milestone rows per shipment.
- Document upload attached to shipment/milestone.
- Customs stream green/yellow/red.
- Landed cost input and allocation.
- SOP SLA tracking and notifications.

Out of scope:

- Warehouse putaway/scanning.
- GRN finalization details.
- Full accounting ledger.
- Live carrier integration guarantees; forwarder API is best effort with manual fallback.

## 10 Milestones

| Seq | Code | Meaning | Required data |
|---:|---|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmed | Booking/forwarder confirmation. |
| 2 | `CARGO_READY` | Cargo ready at origin | Supplier ready date/note. |
| 3 | `PICK_UP` | Pickup | Pickup actual date, truck evidence if available. |
| 4 | `BL_ISSUED` | B/L or AWB issued | B/L/AWB, Commercial Invoice, Packing List. |
| 5 | `GATE_IN_POL` | Gate-in at port of loading | POL gate-in evidence. |
| 6 | `ATD` | Actual time of departure | Vessel/flight actual departure. |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Customs draft/submitted | Draft or submitted declaration. |
| 8 | `AN_ATA` | Arrival Notice / ATA | Arrival notice and actual arrival. |
| 9 | `CUSTOM_CLEARED` | Customs cleared | Customs stream and clearance confirmation. |
| 10 | `EDO_DELIVERY` | EDO and delivery | EDO/D/O, POD, warehouse-arrival event. |

## Shipment State Transition

Milestone actual date is the state trigger:

```text
BOOKING_PENDING
-> BOOKING_CONFIRMED
-> CARGO_READY
-> PICKED_UP
-> BL_ISSUED
-> GATE_IN_POL
-> IN_TRANSIT
-> CUSTOMS_DRAFT
-> ARRIVED
-> CUSTOMS_CLEARED
-> DELIVERED
```

`CANCELLED` is allowed before in-transit or by manager exception.

## Document Rules

Documents can be uploaded per shipment milestone. GD1 request/response examples include these document types:

- `INVOICE`
- `PACKING_LIST`
- `BL`
- `AWB`
- `CO`
- `CUSTOMS_DECL`
- `OTHER`

Important document gates:

- `BL_ISSUED` should have B/L or AWB plus Commercial Invoice and Packing List.
- `CUSTOM_DRAFT_SUBMITTED` should have customs declaration draft/submission evidence.
- `AN_ATA` should have Arrival Notice.
- `EDO_DELIVERY` should have EDO/D/O and POD or delivery minutes.

## Customs Stream

| Stream | Handling |
|---|---|
| `GREEN` | Goods clear immediately once declaration is accepted. |
| `YELLOW` | Additional documents/information required. |
| `RED` | Field inspection required; exception case may need manager handling. |

## Landed Cost

Shipment cost types:

- `FREIGHT`
- `INSURANCE`
- `CUSTOMS_DUTY`
- `VAT`
- `LOCAL_CHARGES`
- `DEMURRAGE`
- `OTHER`

Allocation methods:

| Method | Formula |
|---|---|
| `BY_VALUE` | `cost * line_value / total_shipment_value` |
| `BY_WEIGHT` | `cost * line_weight / total_shipment_weight` |
| `BY_QTY` | `cost * line_qty / total_shipment_qty` |

Whenever `shipment_cost` changes, recalculate `purchase_order_line.landed_cost_alloc` for all affected shipment lines.

## SOP / SLA Stages

| Stage | Action | SLA / due rule | Owner |
|---|---|---|---|
| Intake and quotation | Preliminary response | Within 1 hour | Buyer / Logistics |
| Intake and quotation | Send quotation | Within 8 hours | Buyer / Logistics |
| Intake and quotation | Booking after AIR/FCL confirmation | Within 4 hours | Logistics |
| Documents | Review Draft B/L, CI, PL | Within 2 hours after draft | Logistics / Docs |
| Documents | Debit Note OF/AF | Within 3 hours after Final B/L/AWB | Finance |
| Documents | Arrival Notice | At least 2 days before ATA | Logistics |
| Customs | Draft declaration | At least 3 days before ETA | Customs Broker |
| Customs | Official declaration | Within 2 hours after KBI confirmation | Customs Broker |
| Release and delivery | Check release | 2 days before ETA | Logistics |
| Release and delivery | KBI confirms schedule | Within 2 hours | Warehouse / Logistics |
| Settlement | Upload dossier + Final Debit Note | Within 5 days after ATA | Finance |

## Integration

| Event | Trigger |
|---|---|
| Forwarder webhook | Milestone event with actual date. |
| Carrier polling | ETA/vessel/flight updates every 4 hours if configured. |
| Email parsing fallback | Extract milestone triggers from email. |
| Manual override | Logistics updates milestone in UI. |
| `shipment.arrived_at_warehouse` | `EDO_DELIVERY.actual_date` is recorded. |

Conflict resolution: if API/email/manual updates disagree, preserve manual entry and flag discrepancy for review.

## Closure Criteria

A shipment is operationally complete when:

- milestone `EDO_DELIVERY` has actual date
- required milestone documents are uploaded
- customs stream is cleared or exception approved
- landed cost is recorded and allocated
- required linked PO-stage tasks are done or waived
- warehouse arrival event has been emitted

## QA Checks

- Shipment creation generates 10 milestones.
- Milestone duplicate code/sequence is rejected.
- Updating `ATD` moves shipment to `IN_TRANSIT`.
- Updating `EDO_DELIVERY` moves shipment to `DELIVERED` and emits warehouse event.
- Shipment line over-shipment beyond PO tolerance is rejected.
- Cost allocation changes landed cost on affected PO lines.
- SLA overdue rules are visible on dashboard/workload views.
