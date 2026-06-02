# GD1 Database ERD

This document points to the canonical GD1 table/type/constraint design derived from `GD1_Technical_Requirements.docx`.

Canonical ERD:

- `docs/database/GD1_DOCUMENT_ERD.md`

Mermaid overview:

- `docs/database/PHASE1_PROCUREMENT_IMPORT_ERD.mermaid`

Archived alternates:

- `docs/archive/database/ERD.mermaid`
- `docs/archive/database/ERD_DBML.md`

## GD1 Tables

| Group | Tables |
|---|---|
| PR | `purchase_request`, `purchase_request_line`, `approval_matrix_config` |
| PO | `purchase_order`, `purchase_order_line` |
| Shipment | `shipment`, `shipment_line`, `shipment_milestone`, `shipment_cost` |
| Task | `po_stage_task`, `po_task_template` |

External FK targets such as tenant, user, department, supplier, item, incoterm, and currency are intentionally not expanded because the GD1 document does not define their schema.

## Relationship Summary

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> shipment_cost
```

PO-stage tasks attach to `purchase_order` and can be generated from `po_task_template`. Approval rules are resolved through `approval_matrix_config`.

## Migration Note

The runtime database currently has older logistics-control-tower tables and names such as `purchase_requests`, `purchase_orders`, and `delivery_orders`. Treat those as implementation/runtime compatibility. GD1 design docs use the singular document table names above.

Do not rename runtime tables without a migration plan that maps:

| GD1 table | Runtime compatibility candidate |
|---|---|
| `purchase_request` | `purchase_requests` |
| `purchase_request_line` | `purchase_request_lines` |
| `purchase_order` | `purchase_orders` |
| `purchase_order_line` | `purchase_order_lines` |
| `shipment` | `delivery_orders` |
| `shipment_line` | `delivery_order_source_lines` |
| `shipment_milestone` | new table needed |
| `shipment_cost` | `finance_charge_lines` partial only |
| `po_stage_task` | `logistics_tasks` partial only |
| `po_task_template` | new table needed |
| `approval_matrix_config` | new table needed |

## Constraint Source

All constraints, indexes, enum types, common columns, and business rules are maintained in `GD1_DOCUMENT_ERD.md`. Keep this file as an index/summary to avoid duplicate schema drift.
