# KBFE Module Docs

This folder groups current GD1 documentation by implementation module.

## Current GD1 Modules

| Module | Docs | Main code |
|---|---|---|
| Procurement | `procurement/purchase-requests.md`, `procurement/purchase-orders.md`, `procurement/approvals.md` | `src/features/purchase-requests`, `src/features/purchase-orders`, `server/modules/purchaseRequests`, `server/modules/purchaseOrders` |
| Shipments | `shipments/shipment.md`, `shipments/import-shipment-sop-sla.md` | `src/features/delivery-orders`, `server/modules/deliveryOrders`, `server/services/milestones.ts`, `server/services/landedCost.ts` |
| Tasks | `tasks/po-stage-tasks.md` | `src/features/tasks`, `server/modules/tasks`, `server/services/poStageTasks.ts` |
| Dashboard / Workflow | `dashboard-workflow/README.md` | `src/features/dashboard`, `src/features/workflow`, `server/modules/dashboard` |
| Integrations | `integrations/erp-wms-outbox.md` | `server/services/reliability.ts`, `server/services/logisticsPurchaseOrders.ts`, `server/services/milestones.ts` |
| Platform | `platform/README.md` | `server/modules/auth`, `server/modules/users`, `server/modules/search`, `server/modules/health`, `src/features/settings`, `src/features/profile` |

## Boundaries

- Current product baseline is GD1 Procurement & Import Tracking.
- Runtime code may still use `delivery_orders` for the GD1 Shipment concept.
- Future GD2/GD3/MCP planning docs live under `docs/future/`.
- One-off prompts and local command notes live under `docs/archive/`.
