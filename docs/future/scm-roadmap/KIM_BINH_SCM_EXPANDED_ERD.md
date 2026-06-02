# Kim Binh SCM Expanded ERD

Date: 2026-05-28  
Mermaid source: `docs/future/scm-roadmap/KIM_BINH_SCM_EXPANDED_ERD.mermaid`

End-to-end table example: `docs/future/scm-roadmap/KIM_BINH_SCM_END_TO_END_TABLE_EXAMPLE.md`

Current GD1 component ERDs: `docs/database/component-erds/README.md`

This is a separate ERD for the expanded Kim Binh SCM Platform context. It is intentionally broader than the current GD1 baseline and should be read as a planning ERD for GD1 + GD2 + GD3.

For current GD1 implementation scope, use `docs/database/GD1_DOCUMENT_ERD.md`.

## Scope

| Layer | Included in this ERD | Implementation status |
|---|---|---|
| Shared platform | Tenant, users, roles, permissions, departments, master/reference data, audit/events/files/SLA/notifications. | Proposed platform foundation. |
| GD1 Procurement & Import | PR, approval config/runtime, PO, shipment, milestones, landed cost, tasks, ERP/forwarder integration. | Current product baseline plus operational extensions. |
| GD2 WMS | Warehouse hierarchy, ASN, GRN, QC, putaway, inventory, allocation, movement, cycle count, picking, packing, delivery. | Future phase. |
| GD3 Production/MRP | BOM, routing, work centers, production orders, MRP run/requirement/supply/shortage, suggested PR, forecast, sales order, costing. | Future phase. |

## Legend

- Physical relationship: represented as Mermaid ERD relationship lines.
- Logical relationship: documented in notes where the relationship is polymorphic, event-driven, or computed.
- Bridge table: required for many-to-many cardinality and quantity integrity.
- Append-only table: historical/event/ledger table that should not be updated or deleted as normal mutable data.

## Key Design Boundaries

GD1 official core remains 11 tables:

```text
purchase_request
purchase_request_line
purchase_order
purchase_order_line
shipment
shipment_line
shipment_milestone
shipment_cost
po_stage_task
po_task_template
approval_matrix_config
```

The expanded ERD adds:

- Shared master/reference data to remove free-text FKs.
- Approval runtime tables to store individual approval instances and steps.
- Document/file tables for milestone and entity attachments.
- SLA and notification tables for SOP enforcement.
- Outbox/inbox/idempotency tables for reliable integration.
- WMS and MRP tables from the pitch deck roadmap and mind map.

## Core Traceability Chain

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> asn
  -> goods_receipt_note
  -> grn_line
  -> inventory_stock
  -> production_order_component
  -> material_issue
```

MRP closes the loop:

```text
mrp_shortage
  -> mrp_suggested_pr
  -> purchase_request
```

## Relationship Notes

| Relationship | Type | Note |
|---|---|---|
| `purchase_order_line` <-> `shipment` through `shipment_line` | Bridge | Required for partial shipments and consolidated shipments. |
| `shipment` -> `shipment_milestone` | Physical | A shipment should have exactly 10 active milestone slots. |
| `shipment_cost` -> `purchase_order_line` through shipment lines | Logical/computed | Allocation engine writes rollup to `purchase_order_line.landed_cost_alloc`. |
| `po_stage_task.linked_shipment_milestone` -> `shipment_milestone.milestone_code` | Logical | Auto-close by milestone code and linked PO/shipment context. |
| `approval_instance.entity_type/entity_id` | Polymorphic | Can target PR or PO; DB needs composite index and backend validation. |
| `document_attachment.entity_type/entity_id` | Polymorphic | Can target PR, PO, shipment, milestone, task, or cost. |
| `audit_log.entity_type/entity_id` | Polymorphic | Append-only generic audit. |
| `outbox_event.aggregate_type/aggregate_id` | Polymorphic/event | Reliability pattern for ERP, WMS, and internal events. |
| `inventory_movement.ref_doc_type/ref_doc_id` | Polymorphic ledger reference | Append-only stock movement history. |
| `mrp_supply.source_type/source_id` | Polymorphic planning reference | Can represent on-hand, PO incoming, shipment incoming, MO output. |

## Mermaid

Render the standalone Mermaid source in:

```text
docs/future/scm-roadmap/KIM_BINH_SCM_EXPANDED_ERD.mermaid
```

The separate source file is kept outside this Markdown document so it can be pasted directly into Mermaid, draw.io, or documentation tooling.

## Component Draw.io XML ERDs

The full expanded ERD above remains the complete source. Smaller component ERDs are available as draw.io XML files for focused review:

| Component | Draw.io XML source |
|---|---|
| Shared platform and master data | `docs/database/component-erds/01_shared_platform_master_data.drawio.xml` |
| GD1 procurement and approval | `docs/database/component-erds/02_gd1_procurement_approval.drawio.xml` |
| GD1 shipment operations | `docs/database/component-erds/03_gd1_shipment_operations.drawio.xml` |
| Documents, SLA, integration, audit | `docs/database/component-erds/04_documents_sla_integration_audit.drawio.xml` |
| GD2 WMS receiving and inventory | `docs/future/gd2-wms/05_gd2_wms_receiving_inventory.drawio.xml` |
| GD2 WMS outbound | `docs/future/gd2-wms/06_gd2_wms_outbound.drawio.xml` |
| GD3 production, MRP, forecast | `docs/future/gd3-mrp/07_gd3_production_mrp_forecast.drawio.xml` |
| Costing and financial rollups | `docs/future/costing/08_costing_financial_rollups.drawio.xml` |
