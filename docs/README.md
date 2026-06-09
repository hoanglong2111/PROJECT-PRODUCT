# KBFE Docs

This folder is product and business reference for the KBFE frontend. It is not an AI-agent instruction system.

## Current Business Baseline

GD1 focuses on Procurement & Import Tracking.

```text
PO -> DO -> Quotation versions -> Final quotation -> Confirm DO -> Shipment -> 10 Milestones -> Documents + Landed Cost
```

Canonical relationship:

```text
Purchase Order 1 -> N Delivery Orders
Delivery Order 1 -> 1 Shipment
```

DO workflow:

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

## Read Order For Frontend Work

1. `context/PROJECT_CONTEXT.md` for product scope, entities, routes, and vocabulary.
2. `context/OPERATING_MODEL.md` for state machines, hard rules, SLA, and workflow behavior.
3. One focused module doc under `modules/` when a screen needs business detail.

Do not treat files in `docs/` as agent instructions. Use them only to clarify UI behavior, labels, states, and business meaning.

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

## Audit Notes

- `docs/archive/` contains older or historical notes. PR/Approval/Integration files there are not current GD1 frontend truth unless explicitly re-approved.
- `docs/future/` contains planning for later phases such as GD2 WMS, GD3 MRP, costing, and SCM roadmap.
- Runtime code may still expose legacy names such as `delivery_orders`; frontend changes should preserve compatibility until a deliberate migration is implemented.

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
