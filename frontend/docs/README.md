# KBFE Docs

This folder is the business reference for the KBFE frontend. It is not an AI-agent instruction system.

## Source Of Truth

The canonical business documents are:

- `offical/SOP.md`: FDS-KBI operating SOP, roles, quotation, handover, documents, billing, SLA, and incident escalation.
- `offical/TRD.md`: GD1 technical requirement summary for Procurement & Import Tracking.

Use every other doc as a frontend-friendly summary derived from those two files.

## Current GD1 Business Baseline

GD1 digitizes procurement and import tracking:

```text
PO -> DO -> Shipment -> DTO
```

Core scope:

- Purchase Order lifecycle from PO creation onward.
- Delivery Order (DO) planning and confirmation.
- Relationship: one PO has many DOs; one DO has exactly one Shipment.
- PO revision/versioning.
- SEA/AIR import Shipment tracking.
- 10 shipment milestones from booking to EDO delivery.
- Domestic Transport Order (DTO) after customs clearance / inland delivery planning.
- Shipment documents, landed-cost allocation, SLA timers, tasks, audit trail, and incident escalation.

Out of scope for GD1:

- Bin/rack WMS and warehouse scanning.
- BOM, production orders, MRP, and forecast planning.
- Purchase Request (PR), unless explicitly reintroduced by product decision.
- Full accounting ledger beyond debit note/invoice/debt-reconciliation workflow visibility.

## Read Order For Frontend Work

1. `offical/SOP.md` and `offical/TRD.md` when auditing business correctness.
2. `context/PROJECT_CONTEXT.md` for product scope, entities, routes, and vocabulary.
3. `context/OPERATING_MODEL.md` for state machines, hard rules, SLA, and workflow behavior.
4. One focused module doc under `modules/` when a screen needs business detail.

## Current Module Docs

| Module | Path |
|---|---|
| Project context | `context/PROJECT_CONTEXT.md` |
| Operating model | `context/OPERATING_MODEL.md` |
| Delivery Orders | `modules/delivery-orders/README.md` |
| Shipments | `modules/shipments/shipment.md` |
| Shipment SOP/SLA | `modules/shipments/import-shipment-sop-sla.md` |
| PO-stage tasks | `modules/tasks/po-stage-tasks.md` |
| Dashboard / Workflow | `modules/dashboard-workflow/README.md` |
| DTO | `modules/dto/README.md` |
| Master Data | `modules/master-data/README.md` |
| Platform support | `modules/platform/README.md` |
| Frontend API integration | `modules/platform/api-integration.md` |

## Cleanup Notes

- `docs/archive/` was removed because it contained historical/generated notes that should not drive current frontend implementation.
- Future phase details are summarized in `future/README.md`; generated expanded ERDs and roadmap drafts were removed to avoid drift.
- DO and DTO are distinct entities. DO is the PO-to-shipment planning/confirmation unit; DTO is domestic trucking.

## Local Frontend Run

```bash
cd frontend
npm ci
npm run dev
```

Verification:

```bash
cd frontend
npm run verify
```
