# GD1 Operating Model

This document is the project-wide operating truth for GD1 Procurement & Import Tracking. It summarizes the workflow, hard rules, SLA timers, and closure criteria from `GD1_Technical_Requirements.docx`.

For the table/type/constraint design, use `docs/database/GD1_DOCUMENT_ERD.md`.

## Business Goal

GD1 replaces Excel/email tracking for PR/PO and import shipments. The platform must trace demand back to PR lines, show where each shipment is, enforce SOP deadlines, calculate landed cost by PO line, and emit ERP/WMS integration events at the correct gates.

## End-To-End Flow

```text
1. PR
   Buyer/requester creates purchase request manually or from template.

2. Approval
   Approval matrix resolves approvers by department and value.

3. PO
   Buyer converts approved PR lines into one or more supplier POs.

4. Shipment
   Logistics creates SEA/AIR shipment from one or more PO lines.

5. Milestones
   Shipment advances through 10 standard milestones from booking to EDO/delivery.

6. Cost
   Finance records shipment costs and allocates landed cost to PO lines.

7. ERP/WMS
   Confirmed PO syncs to ERP. Delivered shipment emits warehouse-arrival event for later WMS/GRN work.
```

## Actors

| Actor | GD1 responsibility |
|---|---|
| Requester / Buyer | Create PR, revise rejected PR, convert PR lines to PO, send PO, update supplier confirmation. |
| Approver / Manager | Approve/reject PR according to approval matrix and escalation timeout. |
| Logistics | Create shipment, maintain forwarder/carrier, update milestones, manage B/L or AWB and delivery schedule. |
| Customs Broker / Customs | Prepare draft declaration, submit official declaration, record customs stream and clearance. |
| Finance | Enter landed cost components, issue/track settlement work, support ERP accounting sync. |
| Admin | Maintain approval matrix and PO-stage task templates. |

## State Machines

### PR

| State | Entry condition | Allowed next states |
|---|---|---|
| `DRAFT` | New PR or rejected PR revised | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | Requester submits PR | `PARTIALLY_APPROVED`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `PARTIALLY_APPROVED` | Some approval steps completed | `APPROVED`, `REJECTED`, `CANCELLED` |
| `APPROVED` | Final approval completed | `CONVERTED`, `CLOSED`, `CANCELLED` |
| `REJECTED` | Any approver rejects | `DRAFT`, `CANCELLED` |
| `CONVERTED` | All PR line quantities converted to PO | `CLOSED` |
| `CLOSED` | No further sourcing needed | terminal |
| `CANCELLED` | Cancelled by requester/manager | terminal |

### PO

| State | Entry condition | Allowed next states |
|---|---|---|
| `DRAFT` | PO created from PR lines or manually | `SENT`, `CANCELLED` |
| `SENT` | PO sent to supplier | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Supplier confirms PO | `IN_PRODUCTION`, `READY_TO_SHIP`, `CANCELLED` |
| `IN_PRODUCTION` | Supplier reports production | `READY_TO_SHIP`, `CANCELLED` |
| `READY_TO_SHIP` | Supplier reports cargo ready | `SHIPPED` |
| `SHIPPED` | Linked shipment reaches `ATD` | `RECEIVED` |
| `RECEIVED` | Quantity received meets tolerance | `CLOSED` |
| `CLOSED` | Payment/archive complete | terminal |
| `CANCELLED` | Cancelled with reason | terminal |

### Shipment

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
| 3 | `PICK_UP` | Pickup evidence, truck/vehicle if available. |
| 4 | `BL_ISSUED` | B/L or AWB, CI, Packing List. |
| 5 | `GATE_IN_POL` | Gate-in at port of loading. |
| 6 | `ATD` | Actual departure. |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Draft/submitted customs declaration. |
| 8 | `AN_ATA` | Arrival Notice and actual arrival. |
| 9 | `CUSTOM_CLEARED` | Customs stream and clearance result. |
| 10 | `EDO_DELIVERY` | EDO/D/O, delivery, POD, warehouse arrival event. |

## Hard Rules

| Rule | System behavior |
|---|---|
| PR quantity control | `qty_converted` per PR line cannot exceed `qty_requested`. |
| Partial PR conversion | A PR can stay approved while some line quantity remains unconverted. |
| PO revision | Editing a PO after `SENT` or `CONFIRMED` creates `revision + 1` and requires supplier reconfirmation. |
| PO over shipment | Sum of shipment line quantity per PO line cannot exceed ordered quantity plus `tolerance_over_pct`. |
| PO received tolerance | A PO line can close when received quantity meets `qty_ordered * (1 - tolerance_under_pct)`. |
| Landed cost | Shipment cost allocation recalculates PO line landed cost whenever cost or allocation method changes. |
| Task blocking | A PO cannot advance when current-stage task is `BLOCKED` if hard-block mode is enabled. |
| Milestone auto-close | A linked task becomes `DONE` when its shipment milestone receives `actual_date`. |
| Audit | Task status changes, approval actions, PO revisions, milestone updates, and cost changes must be auditable. |
| Idempotency | POST create APIs must deduplicate retries with `Idempotency-Key`; same key with different payload is a conflict. |
| Optimistic locking | Updates to versioned transactional entities must reject stale client versions. |
| Integration reliability | ERP, WMS/GD2, and internal integration events must be enqueued through a transactional outbox before external delivery. |

## SLA Timers

| Stage | Action | SLA / due rule |
|---|---|---|
| Intake and quotation | Preliminary response | Within 1 hour. |
| Intake and quotation | Send quotation | Within 8 hours. |
| Intake and quotation | Booking after AIR/FCL confirmation | Within 4 hours. |
| Documents | Review Draft B/L, CI, PL | Within 2 hours after draft received. |
| Documents | Debit Note OF/AF | Within 3 hours after Final B/L or AWB. |
| Documents | Arrival Notice | At least 2 days before ATA. |
| Customs | Draft declaration | At least 3 days before ETA. |
| Customs | Official declaration after KBI confirmation | Within 2 hours. |
| Release and delivery | Check release | 2 days before ETA. |
| Release and delivery | KBI delivery schedule response | Within 2 hours. |
| Settlement | Upload dossier and Final Debit Note | Within 5 days after ATA. |

Use business hours and tenant holiday calendars when those support tables exist. Until then, document whether timers use calendar time or business time.

## Integration Events

| Event | Direction | Trigger |
|---|---|---|
| PO Created | Platform -> ERP | PO status becomes `CONFIRMED`. |
| PO Revised | Platform -> ERP | PO revision is created. |
| GRN Created | Platform -> ERP | Future GD2 GRN finalized. |
| Supplier Invoice | ERP -> Platform | Invoice posted in ERP. |
| Payment Confirmed | ERP -> Platform | Payment reconciled. |
| `shipment.arrived_at_warehouse` | GD1 -> GD2 WMS | Shipment milestone `EDO_DELIVERY` gets actual date. |

## Integration And Automation Rules

| Area | Operating rule |
|---|---|
| Outbox | Any PO confirmation, PO revision, ERP sync request, or warehouse-arrival event is written to outbox in the same transaction as the business state change. A separate publisher may deliver to Kafka, RabbitMQ, REST ERP, or another broker. |
| Inbox/raw events | Partner webhook, polling, email, and SFTP inputs are captured idempotently before applying milestone/status changes. Raw payloads are retained for replay and audit. |
| Webhook | Forwarder realtime events enter through HTTPS POST endpoints and map to canonical 10 milestone codes. Manual user updates remain authoritative when there is a conflict. |
| Carrier polling | Carrier REST polling runs on a configurable cadence, normally every 4 hours, to refresh ETA/ETD/vessel/flight and milestone evidence. |
| Email/SFTP fallback | IMAP rule-based extraction and daily SFTP CSV batches are fallback channels when partner APIs are unavailable. |
| Scheduler | SLA and task scans run at least every 15 minutes once the background worker is enabled; overdue work triggers in-app/email/Slack-style notification channels as configured. |
| Dashboard read models | High-volume dashboards use materialized views, aggregate tables, or snapshot rows instead of recalculating cross-module metrics on every request. |

## Dashboard Outcomes

GD1 dashboards should expose:

- PRs pending approval and overdue approval steps.
- POs past ETA without `ATD`.
- Shipments by in-transit, delayed, at-customs, delivered.
- Missing milestone documents.
- Landed cost pending allocation.
- Task workload, overdue tasks, blocked tasks.
