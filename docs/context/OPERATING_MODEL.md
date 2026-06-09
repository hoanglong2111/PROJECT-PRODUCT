# GD1 Operating Model

This document is the project-wide operating truth for GD1 Procurement & Import Tracking. It summarizes the workflow, hard rules, SLA timers, and closure criteria from `GD1_Technical_Requirements.docx` and the FDS-KBI SOP (`SOP_FDS_KBI_R7.docx`).

For table/type/constraint design, see `docs/database/GD1_DOCUMENT_ERD.md`.

## Business Goal

GD1 replaces Excel/email tracking for PO and import shipments. The platform must trace purchase orders through delivery orders and shipments, show where cargo is, and enforce SOP/SLA deadlines.

## End-To-End Flow

```text
1. PO (Purchase Order)
   Buyer creates purchase order with General Info + item lines.
   Items are organized into LOTs (default 1 LOT).

2. DO (Delivery Order) — Incorporates Quotations
   One PO can create many DOs. Each DO belongs to one PO and defines the
   warehouse / delivery address, transport type, and delivery schedule.
   * Quotation (Sub-flow): FDS Sales creates quotation v1 under the DO,
     revises or creates v2/v3 if needed, then one final quotation is selected.
   * A DO can be confirmed only after the delivery address and final quotation
     are selected.

3. Shipment — Incorporates Documents & 10 Milestones
   Each confirmed DO proceeds to exactly one Shipment / delivery execution record.
   * Milestones (Sub-flow): Shipment goes through 10 standard milestones.
   * Documents (Sub-flow): Upload, review, and version documents per milestone.

4. Cost & Settlement — DEFERRED / SKIPPED

5. ERP / WMS Integration — DEFERRED / SKIPPED
```

## Actors

| Actor | GD1 responsibility |
|---|---|
| Buyer | Create PO, manage LOTs and DOs, send PO, update supplier confirmation, track delivery. |
| Logistics | Create shipment from a confirmed DO, maintain forwarder/carrier, update milestones, manage B/L or AWB, manage delivery schedule. |
| FDS Sales | Create and send freight-forwarding quotation to KBI under the DO, handle quotation revisions, confirm service. |
| FDS Ops | Receive handover, process documents (Draft/Final B/L, CI, PL) under the Shipment, coordinate customs, arrange delivery. |
| Customs Broker / Customs | Prepare draft declaration, submit official declaration, record customs stream and clearance. |
| Admin | Maintain approval matrix and PO-stage task templates. |

## State Machines

### PO

| State | Entry condition | Allowed next states |
|---|---|---|
| `DRAFT` | PO created manually or from template | `SENT`, `CANCELLED` |
| `SENT` | PO sent to supplier | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Supplier confirms PO | `IN_PRODUCTION`, `READY_TO_SHIP`, `CANCELLED` |
| `IN_PRODUCTION` | Supplier reports production | `READY_TO_SHIP`, `CANCELLED` |
| `READY_TO_SHIP` | Supplier reports cargo ready | `SHIPPED` |
| `SHIPPED` | Linked shipment reaches `ATD` | `RECEIVED` |
| `RECEIVED` | Quantity received meets tolerance | `CLOSED` |
| `CLOSED` | Archive complete | terminal |
| `CANCELLED` | Cancelled with reason | terminal |

### DO (Delivery Order)

| State | Entry condition | Allowed next states |
|---|---|---|
| `DRAFT` | DO created from PO / selected PO lines | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Buyer/Logistics confirms DO after warehouse/delivery address and final quotation are selected | `READY_TO_SHIP`, `CANCELLED` |
| `READY_TO_SHIP` | Cargo ready at origin warehouse | `IN_TRANSIT` |
| `IN_TRANSIT` | Cargo departed origin | `DELIVERED` |
| `DELIVERED` | Cargo arrived at destination warehouse | `CLOSED` |
| `CLOSED` | All reconciliation complete | terminal |
| `CANCELLED` | Cancelled before in-transit or by manager exception | terminal |

DO required fields:
- Warehouse / delivery address
- Origin warehouse when applicable
- Destination warehouse when applicable
- Transport type (SEA/AIR/ROAD/RAIL)
- Selected final quotation
- Confirmed date

### Quotation (Sub-flow of DO)

Managed within the DO detail view:

| State | Entry condition | Allowed next states |
|---|---|---|
| `DRAFT` | FDS Sales creates quotation v1 or revises/creates the next quotation version under the DO | `SENT`, `CANCELLED` |
| `SENT` | Quotation sent to KBI for review | `REJECTED`, `FINAL`, `CANCELLED` |
| `REJECTED` | KBI rejects or requests adjustment | `DRAFT` |
| `FINAL` | KBI approves/confirms the quotation (explicit or 1h auto-approve) | terminal |
| `CANCELLED` | Cancelled by FDS Sales or Manager | terminal |

DO quotation flow:

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

### Shipment (Incorporates Documents & Milestones)

| State | Trigger milestone |
|---|---|
| `BOOKING_PENDING` | Shipment created |
| `BOOKING_CONFIRMED` | `BOOKING_CONFIRMED` actual date |
| `CARGO_READY` | `CARGO_READY` actual date |
| `PICKED_UP` | `PICK_UP` actual date |
| `BL_ISSUED` | `BL_ISSUED` actual date |
| `GATE_IN_POL` | `GATE_IN_POL` actual date |
| `IN_TRANSIT` | `ATD` actual date |
| `CUSTOMS_DRAFT` | `CUSTOM_DRAFT_SUBMITTED` actual date |
| `ARRIVED` | `AN_ATA` actual date |
| `CUSTOMS_CLEARED` | `CUSTOM_CLEARED` actual date |
| `DELIVERED` | `EDO_DELIVERY` actual date |
| `CANCELLED` | Cancel before in-transit or by manager exception |

## Standard 10 Milestones

| Seq | Code | Data gate |
|---:|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmation, forwarder/carrier. |
| 2 | `CARGO_READY` | Supplier cargo readiness. |
| 3 | `PICK_UP` | Pickup evidence (belongs to/managed under `CARGO_READY`). |
| 4 | `BL_ISSUED` | B/L or AWB, CI, Packing List. |
| 5 | `GATE_IN_POL` | Gate-in at port of loading (belongs to/managed under `BL_ISSUED`). |
| 6 | `ATD` | Actual departure (DEFERRED / SKIPPED in current phase). |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Draft/submitted customs declaration (DEFERRED / SKIPPED in current phase). |
| 8 | `AN_ATA` | Arrival Notice and actual arrival. |
| 9 | `CUSTOM_CLEARED` | Customs stream and clearance result. |
| 10 | `EDO_DELIVERY` | EDO/D/O, delivery, POD, warehouse arrival. |

## Hard Rules

| Rule | System behavior |
|---|---|
| PO to DO | One PO can create many DOs. Each DO belongs to exactly one PO. |
| DO to Shipment | One confirmed DO proceeds to exactly one Shipment / delivery execution record. |
| DO confirmation | A DO cannot be confirmed without warehouse/delivery address, transport type, selected final quotation, and explicit confirmation. |
| PO over shipment | Sum of shipment line quantity per PO line cannot exceed ordered quantity plus `tolerance_over_pct`. |
| PO received tolerance | A PO line can close when received quantity meets `qty_ordered * (1 - tolerance_under_pct)`. |
| Quotation versioning | A DO can hold quotation v1, v2, v3...; versions can be revised, compared, and preserved for audit. |
| Final quotation selection | Exactly one quotation version/candidate must be selected as final before DO confirmation. |
| Quotation auto-approve | If KBI does not respond to a SENT quotation within 1 hour, it auto-transitions to FINAL. |
| Quotation comparison | The system must support page-to-page comparison between any two quotation versions under the DO details page. |
| Task blocking | A PO cannot advance when current-stage task is `BLOCKED` if hard-block mode is enabled. |
| Milestone auto-close | A linked task becomes `DONE` when its shipment milestone receives `actual_date`. |
| Audit | Task status changes, DO changes, quotation version changes, milestone updates, and cost changes must be auditable. |
| Idempotency | POST create APIs must deduplicate retries with `Idempotency-Key`. |
| Optimistic locking | Updates to versioned transactional entities must reject stale client versions. |

## Form UX Grouping Principle

All create/edit forms must group fields logically following human cognitive flow (the "Họ → Tên → ..." principle). Fields within each group are ordered from most general to most specific:

| Entity | Form group order |
|---|---|
| PO | Supplier → PO Type → Incoterm → Payment → Currency → Dates → Items → LOT management |
| DO | Select PO/PO lines -> Select warehouse / delivery address -> Transport type -> Delivery dates -> Create quotation v1 |
| Quotation (in DO) | DO -> Service type -> Pricing details -> Terms -> Attachments -> Submit version -> Revise/create next version if needed -> Select final quotation |
| Shipment | Confirmed DO -> Mode -> Forwarder -> Carrier -> B/L/AWB -> Route (POL/POD) -> Dates |
| Task | PO → Stage → Task name → Assignee → Due date → Linked milestone |

## SLA Timers

| Stage | Action | SLA / due rule |
|---|---|---|
| Intake and quotation | Preliminary response | Within 1 hour. |
| Intake and quotation | Send quotation | Within 8 hours. |
| Documents (in Shipment) | Review Draft B/L, CI, PL | Within 2 hours after draft received. |
| Documents (in Shipment) | Arrival Notice | At least 2 days before ATA. |
| Customs | Official declaration | Within 2 hours. |
| Release and delivery | Check release | 2 days before ETA. |

## Dashboard Outcomes

GD1 dashboards should expose:

- POs past ETA without shipping updates.
- DOs pending confirmation.
- Active shipments by milestone status.
- Overdue tasks, blocked tasks.
