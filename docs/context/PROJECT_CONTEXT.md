# KBFE Project Context

KBFE is the Kim Binh Supply Chain Platform frontend for GD1: Procurement & Import Tracking.

Canonical GD1 flow:

```text
Purchase Order -> Delivery Order -> Import Shipment -> Domestic Transport Order
```

`docs/offical/SOP.md` and `docs/offical/TRD.md` are the source of truth. This document is a normalized frontend summary.

## GD1 Product Scope

In scope:

- Purchase Order (PO): current starting point, supplier order, revision/versioning, sent/confirmed/shipped/received lifecycle.
- Delivery Order (DO): delivery planning and confirmation unit created from PO lines.
- PO to DO relationship: one PO can create many DOs; each DO belongs to exactly one PO.
- DO to Shipment relationship: one confirmed DO creates exactly one Shipment.
- Shipment: SEA/AIR import tracking linked 1:1 to a confirmed DO.
- Shipment 10 milestones: booking, cargo ready, pickup, B/L or AWB, gate-in, ATD, customs draft, arrival notice/ATA, customs clearance, EDO delivery.
- Domestic Transport Order (DTO): inland trucking after `CUSTOMS_CLEARED`; DTO is not the same entity as DO.
- Freight-forwarding quotation and confirmation handled in the SOP intake stage before booking/service confirmation.
- Shipment documents: CI, PL, CO/CQ, Draft/Final B/L or AWB, customs declaration, Arrival Notice, EDO/D/O, POD, insurance/debit-note documents when applicable.
- Landed cost allocation to PO lines by value, weight, or quantity.
- PO-stage tasks, SLA timers, overdue detection, milestone auto-close, notifications, and escalation.
- RBAC for KBI, FDS Sales, FDS Ops, FDS Finance, Admin/Manager/Director.
- Audit trail, idempotent create requests, optimistic locking, tenant isolation, and integration resilience.

Out of scope for GD1:

- Purchase Request (PR), unless explicitly reintroduced by product decision.
- Bin/rack WMS, putaway/scanning, and full warehouse operation.
- BOM, production orders, MRP, and demand forecasting.
- Full GD2/GD3 platform design.

## Core Entities

| Entity | Purpose |
|---|---|
| Purchase Order | Supplier order with PO lines, revision/versioning, terms, quantities, and lifecycle status. |
| Delivery Order | Unit between PO and Shipment. Captures selected PO lines, warehouse/delivery address, quotation selection, confirmation status, and planned dates. |
| Shipment | Import execution record for SEA/AIR, linked 1:1 to a confirmed DO. |
| Shipment Line | Quantity/lot bridge derived from DO lines / PO lines. |
| Shipment Milestone | 10 operational checkpoints with planned/actual dates, source, and notes. |
| Shipment Cost | Freight, insurance, duty, VAT, local charges, demurrage, and allocation method. |
| Domestic Transport Order | Trucking order created after customs clearance for inland delivery. |
| Task | Work item generated from PO/shipment stage templates and SLA rules. |
| Document | File attachment/version tied to shipment, milestone, task, or cost context. |
| Incident | Operational issue with severity and escalation owner. |

## Business Flow

```text
PO
-> create one or more DOs
-> select warehouse / delivery address
-> create quotation v1
-> revise quotation if needed
-> create quotation v2, v3...
-> select final quotation
-> confirm DO
-> create Shipment
-> 10 shipment milestones
-> customs cleared
-> DTO trucking
-> EDO delivery / warehouse arrival
-> settlement and closure
```

## Quotation And Confirmation

Per SOP, FDS Sales receives the request, sends an all-inclusive freight-forwarding quotation, and confirms service with KBI before Ops handover.

Rules:

- Preliminary response SLA: within 1 hour.
- Quotation SLA: within 8 hours.
- Booking after KBI confirmation: within 4 hours.
- Quotation price is fixed/all-inclusive unless KBI changes information, KBI delay causes changes, or a third-party exception applies.
- Quotation, confirmation, and changes must be auditable.
- Each KBI order has one assigned FDS point of contact.
- In the current frontend model, quotation is managed under DO before DO confirmation.
- A DO cannot be confirmed until warehouse/delivery address and final quotation are selected.

## Shipment Document Management

Shipments support document upload, review, and versioning per milestone.

| Capability | Description |
|---|---|
| Upload | Attach CI, PL, CO/CQ, Draft B/L, AWB, customs declaration, Arrival Notice, EDO/D/O, POD, and other shipment documents. |
| Review | FDS Ops reviews draft documents and requests/records KBI confirmation. |
| Versioning | Keep old versions for audit instead of overwriting silently. |
| Gates | Important milestones should surface missing required documents. |

## Technical Baseline

| Capability | Requirement |
|---|---|
| API shape | REST/OpenAPI-style responses as `{ data, meta, errors }`. |
| Idempotency | Create requests should carry `Idempotency-Key` or equivalent dedupe behavior. |
| Optimistic locking | Transactional updates should reject stale versions. |
| Audit trail | State/document/quotation/task/cost changes are append-only logs. |
| SLA scheduler | SLA and task scans run periodically, planned at 15-minute cadence. |
| Carrier tracking | Prefer webhook/API, fall back to 4-hour polling, email parsing, SFTP/CSV, or manual update. |
| Cost allocation | Recalculate PO-line landed cost when shipment cost changes. |

## Routes

| Route | Purpose |
|---|---|
| `/` | GD1 dashboard: PO risk, shipment risk, task workload, SLA attention. |
| `/workflow` | End-to-end trace from PO to DO, shipment milestones, DTO, documents, tasks, and costs. |
| `/purchase-orders` | PO list/detail, supplier confirmation, revision, PO-line progress. |
| `/delivery-orders` | DO list/detail, quotation versions, selected final quotation, confirmation, and shipment link. |
| `/shipments` | Shipment board, milestones, documents, customs, cost allocation. |
| `/tasks` | PO/shipment tasks, assignee workload, overdue/blocker handling. |
| `/settings` | Theme, language, profile, admin account management. |

## Current Gaps To Track

- PR is intentionally out of current frontend scope.
- DO and DTO must stay distinct in UI labels, API mapping, and docs.
- Some runtime models may still need migration/alignment to the PO -> DO -> Shipment -> DTO business chain.
- DTO is conceptually required by TRD after customs clearance, but frontend route/implementation may still be pending.
- Full SLA scheduler, carrier integrations, landed-cost allocation, and audit visibility should be verified before production.
