# GD1 Operating Model

This document summarizes workflow, state machines, hard rules, SLA timers, and closure criteria from `docs/offical/SOP.md` and `docs/offical/TRD.md`.

## Business Goal

GD1 replaces Excel/email tracking for procurement and import operations from PO onward. The frontend must help users see where each PO/DO/shipment/DTO is, what task is due, which SLA is at risk, and which documents or costs are missing.

## End-To-End Flow

```text
1. Purchase Order
   PO is the current frontend starting point.
   PO can be revised/versioned and confirmed by supplier.

2. Delivery Order
   One PO can create many DOs. Each DO belongs to one PO.
   DO owns warehouse/delivery address, quotation versions, final quotation
   selection, and confirmation before shipment creation.

3. Shipment
   Each confirmed DO proceeds to exactly one Shipment. SEA/AIR import
   shipment tracks booking, cargo movement, documents, customs, arrival,
   and landed cost allocation.

4. Domestic Transport Order
   DTO is triggered after shipment reaches CUSTOMS_CLEARED and manages
   inland trucking, fuel-adjusted price, driver/vehicle, delivery, and POD.

5. Settlement
   Finance prepares debit note/invoice/debt reconciliation visibility.
```

## Actors

| Actor | Responsibility |
|---|---|
| KBI | Approve quotation, confirm Draft B/L/AWB, respond to debt/invoice items. |
| FDS Sales | Receive request, respond, quote, confirm service, and hand over to Ops. |
| FDS Ops | Manage booking, schedule, shipment milestones, documents, customs coordination, and delivery tracking. |
| FDS Finance | Generate debit note, invoice, and debt reconciliation records. |
| Customs Broker | Prepare draft declaration, submit official declaration, and record customs clearance result. |
| Manager / Director | Escalation owner for SLA risk and incidents. |
| Admin | Maintain users, roles, templates, and reference data. |

## State Machines

### Purchase Order

```text
DRAFT -> SENT -> CONFIRMED -> SHIPPED -> RECEIVED -> CLOSED
CANCELLED
```

Notes:

- PO revisions must preserve history.
- PO status can be driven by shipment progress where applicable.

### Delivery Order

```text
DRAFT -> CONFIRMED -> READY_TO_SHIP -> IN_TRANSIT -> DELIVERED -> CLOSED
CANCELLED
```

Rules:

- One PO can create many DOs.
- Each DO belongs to exactly one PO.
- Each confirmed DO proceeds to exactly one Shipment.
- DO cannot be confirmed without warehouse/delivery address and selected final quotation.

### Shipment

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
CANCELLED
```

### Domestic Transport Order

```text
DRAFT -> QUOTED -> ASSIGNED -> IN_TRANSIT -> DELIVERED -> CLOSED
CANCELLED
```

DTO is normally created after shipment milestone `CUSTOMS_CLEARED`.

### Incident

```text
OPEN -> ROUTED -> IN_PROGRESS -> RESOLVED -> CLOSED
```

Severity:

- Level 1 Minor: executive accountable.
- Level 2 Major: manager accountable, director informed.
- Level 3 Critical: director accountable, manager/executive responsible.

## Standard 10 Shipment Milestones

| Seq | Code | Data gate |
|---:|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmation and forwarder/carrier. |
| 2 | `CARGO_READY` | Supplier cargo readiness. |
| 3 | `PICK_UP` | Pickup evidence. |
| 4 | `BL_ISSUED` | B/L or AWB, Commercial Invoice, Packing List. |
| 5 | `GATE_IN_POL` | Gate-in at port of loading. |
| 6 | `ATD` | Actual departure. |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Draft/submitted customs declaration. |
| 8 | `AN_ATA` | Arrival Notice and actual arrival. |
| 9 | `CUSTOM_CLEARED` | Customs stream and clearance result. |
| 10 | `EDO_DELIVERY` | EDO/D/O, POD, and warehouse arrival. |

## Hard Rules

| Rule | System behavior |
|---|---|
| PO to DO | One PO can create many DOs; each DO belongs to exactly one PO. |
| DO to Shipment | One confirmed DO proceeds to exactly one Shipment / delivery execution record. |
| DO vs DTO | DO is Delivery Order between PO and Shipment. DTO is Domestic Transport Order for inland trucking. |
| Over-shipment | Sum of shipped quantity per PO line cannot exceed ordered quantity plus tolerance. |
| Document audit | Shipment documents are versioned; critical versions are not overwritten silently. |
| Quotation audit | FDS quotation and confirmation changes must be traceable. |
| Fixed pricing | Quoted price is fixed unless SOP exception applies. |
| DTO trigger | Shipment `CUSTOMS_CLEARED` can create/enable DTO. |
| Fuel adjustment | DTO price adjustment uses Petrolimex fuel reference and `Petrol_Impact_Ratio = 0.36`. |
| Task blocking | A blocked task must preserve blocker note and owner. |
| Milestone auto-close | A linked task becomes done when its shipment milestone gets an actual date. |
| Audit | State, task, document, milestone, cost, quotation, and incident changes are auditable. |
| Idempotency | Create APIs dedupe retries. |
| Optimistic locking | Updates reject stale client versions. |

## SLA Timers

| Stage | Action | SLA / due rule |
|---|---|---|
| Intake and quotation | Preliminary response | Within 1 hour. |
| Intake and quotation | Send quotation | Within 8 hours. |
| Intake and quotation | Booking after KBI confirmation | Within 4 hours. |
| Documents | Review Draft B/L, CI, PL | Within 2 hours after draft received. |
| Documents | Debit Note OF/AF | Within 3 hours after Final B/L/AWB. |
| Documents | Arrival Notice | At least 2 days before ATA. |
| Customs | Draft declaration | At least 3 days before ETA. |
| Customs | Official declaration | Within 2 hours after KBI confirmation. |
| Release and delivery | Check release | At least 2 days before ETA. |
| Release and delivery | Confirm delivery schedule | Within 2 hours. |
| Settlement | Upload dossier and Final Debit Note | Within 5 days after ATA. |

## DTO Fuel Pricing

```text
New price = Original price * (1 + ((Petrol price at delivery - Petrol price at quote) / Petrol price at quote) * 0.36)
```

Required snapshots:

- Quotation date.
- Petrol price at quotation date.
- Delivery date.
- Petrol price at delivery date.
- Original price and adjusted price.

## Dashboard Outcomes

GD1 dashboards should expose:

- PO/DO confirmation and quotation bottlenecks.
- POs past ETA or supplier confirmation risk.
- Active shipments by milestone and customs state.
- Missing critical shipment documents.
- DTOs waiting for assignment, delivery, or POD.
- Overdue SLA checkpoints and blocked tasks.
- Incidents by severity and escalation owner.
