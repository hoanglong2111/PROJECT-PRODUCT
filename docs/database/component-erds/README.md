# Kim Binh SCM Component ERDs

Date: 2026-05-30

These draw.io XML ERDs split focused GD1 and shared-support views into smaller bounded components. They are additive documentation only.

Full GD1+GD2+GD3 roadmap ERDs have moved to `docs/future/`.

Open the `*.drawio.xml` files with diagrams.net/draw.io when discussing one module at a time, reviewing table ownership, or planning phased implementation.

For GD1 implementation-level schema, use:

- `docs/database/GD1_DOCUMENT_ERD.md` for the table/type/constraint narrative.
- `docs/database/GD1_SCHEMA.sql` for the PostgreSQL planning DDL.

## Component Map

| Component | Draw.io XML source | Main boundary |
|---|---|---|
| Shared platform and master data | `01_shared_platform_master_data.drawio.xml` | Tenant, users, RBAC, departments, items, suppliers, warehouses, reference data, sequences, idempotency. |
| GD1 procurement and approval | `02_gd1_procurement_approval.drawio.xml` | PR, PR lines, approval runtime, PO, PO lines, revisions. |
| GD1 shipment operations | `03_gd1_shipment_operations.drawio.xml` | Shipment, shipment lines, containers, milestones, costs, PO-stage tasks. |
| Documents, SLA, integration, audit | `04_documents_sla_integration_audit.drawio.xml` | Files, polymorphic documents, SLA events, notifications, audit/state logs, outbox/inbox, raw forwarder events. |

Future-phase component ERDs:

| Component | New location |
|---|---|
| GD2 WMS receiving and inventory | `docs/future/gd2-wms/05_gd2_wms_receiving_inventory.drawio.xml` |
| GD2 WMS outbound | `docs/future/gd2-wms/06_gd2_wms_outbound.drawio.xml` |
| GD3 production, MRP, forecast | `docs/future/gd3-mrp/07_gd3_production_mrp_forecast.drawio.xml` |
| Costing and financial rollups | `docs/future/costing/08_costing_financial_rollups.drawio.xml` |

## Boundary Notes

- Some entities appear in more than one component as anchor references, for example `item`, `purchase_order_line`, and `shipment`.
- In GD1 diagrams, `GD1 schema owner` means the component owns that table's primary schema view; `GD1 support schema` means an operational support table for GD1 documents, SLA, audit, or integration; `REF ... subset` means the table is intentionally reduced to relationship keys and context fields only.
- A repeated table should not be treated as a duplicate schema. Use `docs/database/GD1_SCHEMA.sql` for the full GD1-owned schema and `01_shared_platform_master_data.drawio.xml` for shared master-data ownership.
- Polymorphic links such as `document_attachment.entity_type/entity_id`, `audit_log.entity_type/entity_id`, and `outbox_event.aggregate_type/aggregate_id` are shown logically. Enforce them through backend validation, composite indexes, and audit tests.
- GD1 canonical names use `shipment`. Runtime compatibility names such as `delivery_orders` remain implementation details until a deliberate migration is done.
