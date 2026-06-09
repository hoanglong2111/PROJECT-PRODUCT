# KBFE Module Docs

This folder groups current GD1 business documentation by implementation module.

## Current GD1 Modules

| Module | Docs | Main code |
|---|---|---|
| Purchase Orders | `../context/PROJECT_CONTEXT.md` | `frontend/src/features/purchase-orders` |
| Delivery Orders | `delivery-orders/README.md` | `frontend/src/features/delivery-orders` |
| Shipments | `shipments/shipment.md`, `shipments/import-shipment-sop-sla.md` | `frontend/src/features/shipments` |
| Tasks | `tasks/po-stage-tasks.md` | `frontend/src/features/tasks`, `backend/routes/tasks.routes.ts`, `backend/services/po-stage-task.service.ts`, `backend/models/poStageTasks.ts` |
| Dashboard / Workflow | `dashboard-workflow/README.md` | `frontend/src/features/dashboard`, `frontend/src/features/workflow`, `backend/routes/dashboard.routes.ts`, `backend/services/dashboard.service.ts` |
| DTO | `dto/README.md` | frontend implementation pending / route TBD |
| Master Data | `master-data/README.md` | frontend implementation pending / route TBD |
| Platform | `platform/README.md` | `frontend/src/features/settings`, `frontend/src/features/profile` |

## Boundaries

- Current product baseline is GD1 Procurement & Import Tracking.
- Canonical relationship: `PO 1-n DO`, `DO 1-1 Shipment`.
- DO workflow owns quotation creation, revision/versioning, final quotation selection, and confirmation.
- Runtime code may still use legacy names in places; docs should use the canonical business names above.
- Future GD2/GD3 planning docs live under `docs/future/`.
- Older PR/Approval/Integration notes live under `docs/archive/` and are not current GD1 frontend truth unless explicitly re-approved.
