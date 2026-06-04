# KBFE Module Docs

This folder groups current GD1 documentation by implementation module.

## Current GD1 Modules

| Module | Docs | Main code |
|---|---|---|
| Procurement | `procurement/purchase-requests.md`, `procurement/purchase-orders.md`, `procurement/approvals.md` | `frontend/src/features/purchase-requests`, `frontend/src/features/purchase-orders`, `backend/routes/purchase-*.routes.ts`, `backend/services/purchase-*.service.ts` |
| Shipments | `shipments/shipment.md`, `shipments/import-shipment-sop-sla.md` | `frontend/src/features/delivery-orders`, `backend/routes/delivery-orders.routes.ts`, `backend/services/delivery-order-workflow.service.ts`, `backend/models/milestones.ts`, `backend/models/landedCost.ts` |
| Tasks | `tasks/po-stage-tasks.md` | `frontend/src/features/tasks`, `backend/routes/tasks.routes.ts`, `backend/services/po-stage-task.service.ts`, `backend/models/poStageTasks.ts` |
| Dashboard / Workflow | `dashboard-workflow/README.md` | `frontend/src/features/dashboard`, `frontend/src/features/workflow`, `backend/routes/dashboard.routes.ts`, `backend/services/dashboard.service.ts` |
| Integrations | `integrations/erp-wms-outbox.md` | `backend/models/reliability.ts`, `backend/models/logisticsPurchaseOrders.ts`, `backend/models/milestones.ts` |
| Platform | `platform/README.md`, `platform/ai-harness.md`, `platform/dev-ai-harness.md` | `backend/routes/auth.routes.ts`, `backend/routes/users.routes.ts`, `backend/routes/search.routes.ts`, `backend/routes/health.routes.ts`, `.agents/harness`, `frontend/src/features/settings`, `frontend/src/features/profile` |

## Boundaries

- Current product baseline is GD1 Procurement & Import Tracking.
- Runtime code may still use `delivery_orders` for the GD1 Shipment concept.
- Future GD2/GD3/MCP planning docs live under `docs/future/`.
- One-off prompts and local command notes live under `docs/archive/`.
