# GD1 Import Shipment, SOP, And SLA Workflow

This document maps the FDS-KBI SOP into frontend shipment behavior.

```text
PO -> DO confirmed -> Shipment booking -> 10 milestones -> Documents -> Costs -> Customs cleared -> DTO -> EDO delivery
```

## Scope

In scope:

- SEA/AIR shipment tracking.
- One shipment created from one confirmed DO.
- Shipment lines derived from DO lines / PO lines.
- 10 standard milestone rows per shipment.
- Document upload attached to shipment or milestone.
- Customs stream green/yellow/red.
- Landed cost input and allocation.
- DTO trigger after customs clearance.
- SOP SLA tracking, notification, and escalation.

Out of scope:

- Warehouse putaway/scanning.
- Full accounting ledger.
- Live carrier integration guarantees; forwarder API is best effort with manual fallback.

## 10 Milestones

| Seq | Code | Meaning | Required data |
|---:|---|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmed | Booking/forwarder confirmation. |
| 2 | `CARGO_READY` | Cargo ready at origin | Supplier ready date/note. |
| 3 | `PICK_UP` | Pickup | Pickup actual date and evidence if available. |
| 4 | `BL_ISSUED` | B/L or AWB issued | B/L/AWB, Commercial Invoice, Packing List. |
| 5 | `GATE_IN_POL` | Gate-in at port of loading | POL gate-in evidence. |
| 6 | `ATD` | Actual time of departure | Vessel/flight actual departure. |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Customs draft/submitted | Draft or submitted declaration. |
| 8 | `AN_ATA` | Arrival Notice / ATA | Arrival notice and actual arrival. |
| 9 | `CUSTOM_CLEARED` | Customs cleared | Customs stream and clearance confirmation. |
| 10 | `EDO_DELIVERY` | EDO and delivery | EDO/D/O, POD, warehouse-arrival event. |

## Document Rules

Documents can be uploaded per shipment milestone. Common document types:

- `INVOICE`
- `PACKING_LIST`
- `BL`
- `AWB`
- `CO`
- `CUSTOMS_DECL`
- `ARRIVAL_NOTICE`
- `EDO`
- `POD`
- `DEBIT_NOTE`
- `OTHER`

Important gates:

- `BL_ISSUED` should have B/L or AWB plus Commercial Invoice and Packing List.
- `CUSTOM_DRAFT_SUBMITTED` should have customs declaration evidence.
- `AN_ATA` should have Arrival Notice.
- `CUSTOM_CLEARED` should have customs clearance result.
- `EDO_DELIVERY` should have EDO/D/O and POD or delivery minutes.

## Customs Stream

| Stream | Handling |
|---|---|
| `GREEN` | Goods clear immediately once declaration is accepted. |
| `YELLOW` | Additional documents/information required. |
| `RED` | Field inspection required; manager escalation may be needed. |

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

Whenever `shipment_cost` changes, recalculate landed cost for all affected PO lines.

## SOP / SLA Stages

| Stage | Action | SLA / due rule | Owner |
|---|---|---|---|
| Intake and quotation | Preliminary response | Within 1 hour | FDS Sales |
| Intake and quotation | Send quotation | Within 8 hours | FDS Sales |
| Intake and quotation | Booking after KBI confirmation | Within 4 hours | FDS Sales / Ops |
| Documents | Review Draft B/L, CI, PL | Within 2 hours after draft | FDS Ops |
| Documents | Debit Note OF/AF | Within 3 hours after Final B/L/AWB | FDS Finance |
| Documents | Arrival Notice | At least 2 days before ATA | FDS Ops |
| Customs | Draft declaration | At least 3 days before ETA | Customs Broker / Ops |
| Customs | Official declaration | Within 2 hours after KBI confirmation | Customs Broker / Ops |
| Release and delivery | Check release | At least 2 days before ETA | FDS Ops |
| Release and delivery | KBI confirms schedule | Within 2 hours | KBI / FDS Ops |
| Settlement | Upload dossier + Final Debit Note | Within 5 days after ATA | FDS Finance |

## Integration

| Event | Trigger |
|---|---|
| Forwarder webhook | Milestone event with actual date. |
| Carrier polling | ETA/vessel/flight updates every 4 hours if configured. |
| Email parsing fallback | Extract milestone triggers from email. |
| Manual override | Ops updates milestone in UI. |
| DTO creation | `CUSTOM_CLEARED.actual_date` is recorded. |
| Warehouse arrival | `EDO_DELIVERY.actual_date` is recorded. |

Conflict resolution: if API/email/manual updates disagree, preserve manual entry and flag discrepancy for review.

## Closure Criteria

A shipment is operationally complete when:

- milestone `EDO_DELIVERY` has actual date
- required milestone documents are uploaded
- customs stream is cleared or exception approved
- landed cost is recorded and allocated
- linked tasks are done or waived
- DTO/POD status is complete when inland delivery is required
- warehouse-arrival event has been emitted
