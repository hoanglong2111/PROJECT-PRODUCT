# Kim Binh SCM Expanded Database Context

Date: 2026-05-28

This context is separate from the existing GD1 baseline. It summarizes the expanded source pack that combines GD1 Procurement & Import Tracking, the Kim Binh pitch deck roadmap, the NotebookLM mind map, and prior database-analysis drafts.

Do not treat this file as a replacement for `docs/database/GD1_DOCUMENT_ERD.md`. The GD1 ERD remains the canonical implementation baseline for the current repo. This file is a broader planning context for the Kim Binh Supply Chain Platform across GD1, GD2, and GD3.

## Source Pack

| Source | Role in this context |
|---|---|
| `/home/hoanglong/Bản tải về/GD1_Technical_Requirements.docx.md` | Official GD1 requirements: PR, approval, PO, shipment, milestones, landed cost, SOP/SLA, tasks, ERP/forwarder integration. |
| `/home/hoanglong/Bản tải về/KimBinh_Pitch_Deck.pptx.pptx` | Roadmap and product vision across GD1 Procurement & Import, GD2 WMS, and GD3 Production Planning/MRP. |
| `/home/hoanglong/Bản tải về/NotebookLM Mind Map(2).png` | Module taxonomy: GD1, WMS, Production Planning, shared master data, integrations, platform capabilities. |
| `/home/hoanglong/Bản tải về/Phân tích Tổng hợp Database Schema từ GD1 Technical Requirements + Pitch Deck.md` | Prior synthesis that separates GD1 official tables, inferred master/supporting tables, GD2, GD3, and cross-phase flow. |
| `/home/hoanglong/Bản tải về/Tài liệu không có tiêu đề.md` | Expanded GD1 operating schema estimate with master, identity, approval runtime, documents, SLA, notification, audit, integration, versioning, reference, analytics, and system tables. |

## Scope Reconciliation

The source pack contains three different table-count layers. They are not contradictions if treated as different planning scopes.

| Layer | Count in sources | Interpretation |
|---|---:|---|
| GD1 explicit data model | 10 tables + `approval_matrix_config` = 11 | Official GD1 baseline. This is the only mandatory GD1 schema in the current repo context. |
| GD1 operational extension | 55-58 tables | A fuller Phase 1 operating schema proposal, including identity, master data, approvals, SLA, documents, audit, notifications, integration, versioning, reference, aggregates, and system config. These need confirmation before implementation. |
| Full platform GD1+GD2+GD3 | About 115-120 tables | Roadmap estimate for Procurement & Import, WMS, and Production Planning/MRP. This is architecture planning, not current GD1 implementation scope. |

## Canonical GD1 Baseline

GD1 official schema is centered on:

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> shipment_cost
```

Official GD1 tables:

1. `purchase_request`
2. `purchase_request_line`
3. `purchase_order`
4. `purchase_order_line`
5. `shipment`
6. `shipment_line`
7. `shipment_milestone`
8. `shipment_cost`
9. `po_stage_task`
10. `po_task_template`
11. `approval_matrix_config`

External objects such as tenant, user, department, supplier, item, currency, incoterm, documents, audit, notifications, outbox, WMS, BOM, and MRP are referenced by requirements but are not part of the official GD1 data-model table list unless this expanded context is accepted as a future architecture target.

## Expanded Platform Modules

### GD1: Procurement & Import Tracking

Core capabilities:

- PR creation from manual input, template, or future SAP/EDI feed.
- Department/value approval routing with escalation.
- PR to PO conversion, including partial conversion and split by supplier.
- PO lifecycle for SEA, AIR, and DOMESTIC modes, with revision/versioning.
- Shipment tracking across 10 import milestones.
- Customs stream tracking: green, yellow, red.
- Shipment documents: B/L, AWB, invoice, packing list, C/O, customs declaration, EDO/D/O, debit note.
- Landed cost allocation per PO line by value, weight, or quantity.
- PO-stage task templates, runtime tasks, SLA timers, and milestone auto-close.
- ERP sync for PO/GRN and forwarder/carrier tracking with manual fallback.

### GD2: Warehouse Management System

Core capabilities:

- Warehouse hierarchy: warehouse, zone, aisle/rack/shelf/bin.
- ASN from GD1 shipment arrival event.
- GRN, barcode/lot/serial/expiry capture, QC quarantine, putaway.
- Real-time inventory: on-hand, allocated, available, in-transit.
- Inventory movement ledger, cycle count, adjustment, transfer.
- Outbound picking with FIFO/FEFO/LIFO, packing, and goods issue/delivery note.
- BOM availability check uses GD1 in-transit supply and GD2 stock.

### GD3: Production Planning / MRP

Core capabilities:

- BOM header/line/versioning and routing/work centers.
- Production order/MO with component snapshot.
- MRP run with requirement, supply, shortage, and suggested PR.
- Lead-time backward planning from MO due date through supplier, transit, customs, and buffer.
- What-if simulation for supplier, transportation mode, quantity, and due date.
- MO release, material issue via WMS, backflush, production output, and costing rollup.

### Shared System Layer

Shared capabilities:

- Multi-tenant architecture and tenant isolation.
- RBAC users, roles, permissions, departments.
- Supplier/partner master, item master, currency/exchange rates, incoterms, HS codes, units of measure.
- Audit logs, state transition logs, task audit, immutable outbox/inbox events.
- Notifications through in-app, email, and optional Slack.
- Idempotency, retry, reliability, and integration config.

## Cross-Phase Critical Path

```text
Forecast / Sales Order / MO
  -> MRP requirement
  -> WMS inventory availability
  -> GD1 PO and shipment incoming supply
  -> MRP shortage
  -> suggested PR
  -> PR approval
  -> PO
  -> shipment
  -> ASN / GRN
  -> inventory stock
  -> production order material issue
```

This is the path behind the pitch deck availability table: required, on-hand, allocated, available, shortage, and earliest available date.

## Design Assumptions For The Separate ERD

- Use UUID primary keys for transactional and master tables.
- Use `tenant_id` on tenant-scoped tables.
- Use `app_user`, `app_role`, and `app_permission` as physical table names in the expanded ERD to avoid SQL reserved-word ambiguity.
- Keep GD1 canonical singular table names for PR, PO, shipment, milestone, cost, and task entities.
- Treat polymorphic references such as `document_attachment.entity_id`, `audit_log.entity_id`, and `approval_instance.entity_id` as logical relationships that require backend validation and indexed `(entity_type, entity_id)` pairs.
- Treat `shipment_line` as the required bridge for PO line to shipment N:M.
- Treat `inventory_movement` as append-only and do not mutate historical movement rows.
- Treat `outbox_event` and `inbox_event` as reliability infrastructure, not business master data.
- Keep GD2/GD3 entities as future-phase planning objects until implementation scope is confirmed.

## Immediate Boundary

For current GD1 implementation decisions, prefer `docs/database/GD1_DOCUMENT_ERD.md`.

For full-platform planning, use this context together with:

- `docs/future/scm-roadmap/KIM_BINH_SCM_DATABASE_ANALYSIS_REPORT.md`
- `docs/future/scm-roadmap/KIM_BINH_SCM_EXPANDED_ERD.md`
- `docs/future/scm-roadmap/KIM_BINH_SCM_EXPANDED_ERD.mermaid`
- `docs/future/scm-roadmap/KIM_BINH_SCM_END_TO_END_TABLE_EXAMPLE.md`
