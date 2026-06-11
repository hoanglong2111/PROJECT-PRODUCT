# KBFE Module Docs

This folder groups current GD1 business documentation by frontend module.

## Current GD1 Modules

| Module | Docs | Main frontend area |
|---|---|---|
| Purchase Orders | `../context/PROJECT_CONTEXT.md` | `frontend/src/features/purchase-orders` |
| Delivery Orders | `delivery-orders/README.md` | `frontend/src/features/delivery-orders` |
| Shipments | `shipments/shipment.md`, `shipments/import-shipment-sop-sla.md` | `frontend/src/features/shipments` |
| Tasks | `tasks/po-stage-tasks.md` | `frontend/src/features/tasks` |
| Dashboard / Workflow | `dashboard-workflow/README.md` | `frontend/src/features/dashboard`, `frontend/src/features/workflow` |
| DTO | `dto/README.md` | route/implementation pending |
| Master Data | `master-data/README.md` | route/implementation pending |
| Platform | `platform/README.md` | `frontend/src/features/settings`, `frontend/src/features/profile` |

## Boundaries

- Current product baseline is GD1 Procurement & Import Tracking from PO onward: `PO -> DO -> Shipment -> DTO`.
- Relationship: `PO 1-n DO`, `DO 1-1 Shipment`.
- DO and DTO are distinct. DO is Delivery Order between PO and Shipment; DTO is Domestic Transport Order for inland trucking.
- Runtime code may still use legacy names in places; docs should use the canonical business names above.
- Future GD2/GD3 planning is summarized under `docs/future/`.
