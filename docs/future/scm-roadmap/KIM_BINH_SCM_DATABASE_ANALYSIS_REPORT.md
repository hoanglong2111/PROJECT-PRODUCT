# DATABASE ANALYSIS REPORT

Date: 2026-05-28  
Scope: Separate database-analysis report for the expanded Kim Binh SCM Platform context from GD1 Technical Requirements, pitch deck, NotebookLM mind map, and prior schema synthesis files.

## 1. Tổng quan project

Kim Binh SCM Platform giải quyết bài toán một dòng dữ liệu xuyên suốt từ nhu cầu mua đến mua hàng, nhập khẩu, kho, tồn kho, sản xuất và MRP.

Trong repo hiện tại, GD1 chính thức là Procurement & Import Tracking:

```text
PO -> DO -> Quotation versions -> Final quotation -> Confirm DO -> Shipment -> 10 Milestones -> Documents + Landed Cost
```

Pitch deck và mind map mở rộng roadmap thành:

```text
GD1 Procurement & Import
  -> GD2 Warehouse Management
  -> GD3 Production Planning / MRP
```

Actor chính:

- Requester / Buyer: tạo PR, convert PO, theo dõi NCC.
- Approver / Manager: phê duyệt PR/PO theo phòng ban và giá trị.
- Logistics / Forwarder / Customs broker: booking, vận chuyển, chứng từ, hải quan, giao hàng.
- Finance: landed cost, debit note, công nợ, ERP sync.
- Warehouse: ASN, GRN, QC, putaway, tồn kho, picking.
- Planner / Production: BOM, MO, MRP, shortage, suggested PR.
- Admin: tenant, user, RBAC, master data, approval matrix, task/SLA template.

## 2. Tổng quan business flow

GD1 flow:

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> purchase_order
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> shipment_cost
  -> ERP / future GRN
```

GD2 flow:

```text
shipment.arrived_at_warehouse
  -> asn
  -> goods_receipt_note
  -> grn_line
  -> quality_inspection
  -> putaway_task
  -> inventory_stock + inventory_movement
```

GD3 flow:

```text
sales_forecast / sales_order / production_order
  -> mrp_run
  -> mrp_requirement + mrp_supply
  -> mrp_shortage
  -> mrp_suggested_pr
  -> purchase_request
```

## 3. Tổng quan schema

### GD1 official baseline

GD1 explicit Data Model có 10 bảng, cộng thêm `approval_matrix_config` vì requirement gọi đích danh bảng config approval theo tenant. Tổng phạm vi chính thức: 11 bảng.

| Type | Tables |
|---|---|
| GD1 official core | `purchase_request`, `purchase_request_line`, `purchase_order`, `purchase_order_line`, `shipment`, `shipment_line`, `shipment_milestone`, `shipment_cost`, `po_stage_task`, `po_task_template`, `approval_matrix_config` |
| External references | `tenant`, `app_user`, `department`, `supplier`, `item`, `currency`, `incoterm` |
| Extension candidates | documents, SLA, notification, audit, outbox/inbox, WMS, BOM/MRP |

### Expanded planning schema

The source pack estimates:

- GD1 operational extension: about 55-58 tables.
- GD2 WMS: about 27 new tables.
- GD3 Production/MRP: about 30 new tables.
- Full platform: about 115-120 tables.

These numbers are planning estimates, not current implementation commitments.

## 4. Danh sách bảng và vai trò từng bảng

| Layer | Tables | Role |
|---|---|---|
| GD1 core | `purchase_request`, `purchase_request_line` | Demand header and line-level requested quantity. |
| GD1 core | `purchase_order`, `purchase_order_line` | Supplier order, revision, quantity, price, ETA, landed-cost target. |
| GD1 core | `shipment`, `shipment_line` | Import lot and bridge between shipment and PO lines. |
| GD1 core | `shipment_milestone`, `shipment_cost` | Runtime tracking and landed-cost allocation source. |
| GD1 task/approval | `po_stage_task`, `po_task_template`, `approval_matrix_config` | PO-stage execution and approval routing config. |
| Shared master | `tenant`, `app_user`, `department`, `item`, `item_category`, `supplier`, `supplier_contact`, `warehouse`, `currency`, `exchange_rate_daily`, `incoterm`, `unit_of_measure`, `hs_code` | Multi-tenant identity, procurement master, reference data. |
| Shared operations | `approval_instance`, `approval_step`, `file_storage`, `document_attachment`, `sla_config`, `sla_event`, `notification`, `audit_log`, `state_transition_log`, `outbox_event`, `inbox_event`, `integration_config`, `idempotency_key` | Runtime workflow, files, SLA, audit, integration, reliability. |
| GD2 WMS | `asn`, `asn_line`, `goods_receipt_note`, `grn_line`, `quality_inspection`, `putaway_task`, `inventory_lot`, `inventory_stock`, `inventory_allocation`, `inventory_movement`, `cycle_count`, `picking_order`, `delivery_note` | Warehouse receiving, stock accuracy, allocation, movement, and outbound. |
| GD3 MRP/MFG | `bom_header`, `bom_line`, `work_center`, `production_order`, `production_order_component`, `mrp_run`, `mrp_requirement`, `mrp_supply`, `mrp_shortage`, `mrp_suggested_pr`, `sales_forecast`, `sales_order`, `item_cost`, `cost_rollup` | BOM explosion, MO demand, shortage calculation, suggested procurement, cost rollup. |

## 5. Phân tích từng bảng

### GD1 core tables

- `purchase_request`: necessary transaction header. It should not store line-level demand details except summary fields such as `total_amount`.
- `purchase_request_line`: required for item-level demand, partial conversion, and traceability into PO lines.
- `purchase_order`: transaction header for supplier/order terms. Revision logic must be explicit after `SENT` or `CONFIRMED`.
- `purchase_order_line`: key bridge from demand to fulfillment. It owns ordered, shipped, received, and landed-cost allocation rollups.
- `shipment`: import execution header. Current runtime may still use `delivery_orders`; migration must document this mapping.
- `shipment_line`: mandatory bridge table. Direct PO-to-shipment many-to-many would break partial and consolidated shipment rules.
- `shipment_milestone`: required runtime table for the 10 standard milestones. It should enforce uniqueness per shipment and milestone code.
- `shipment_cost`: required for landed-cost allocation. Cost lines must be recalculable and auditable.
- `po_stage_task`: runtime work items tied to PO stage and optionally milestone auto-close.
- `po_task_template`: configuration source for generating PO-stage tasks.
- `approval_matrix_config`: logical approval rule table. Runtime approval history should be modeled separately as an extension.

### Shared master and reference tables

These are required for a production-grade platform but are not all part of the official GD1 Data Model. They reduce free-text data and enforce lookup consistency: `item`, `supplier`, `department`, `currency`, `exchange_rate_daily`, `incoterm`, `unit_of_measure`, `warehouse`, and `hs_code`.

### Shared runtime infrastructure

Approval runtime, documents, SLA, notification, audit, outbox/inbox, and idempotency are valid operational concerns. They should be added in scoped migrations because they increase table count and cross-module coupling.

### GD2 WMS tables

WMS tables are required for real inventory accuracy, GRN, bin-level stock, lot/expiry, allocation, putaway, and picking. In GD1 they should remain event consumers or read-model dependencies, not hard prerequisites for PR/PO/shipment CRUD.

### GD3 MRP/MFG tables

MRP and production tables are necessary to answer the pitch deck question: "Đủ NVL để chạy MO này không, khi nào đủ?" They depend on GD1 scheduled receipts and GD2 inventory. Do not implement them as static report tables; they need run/version tables such as `mrp_run`, `mrp_requirement`, `mrp_supply`, and `mrp_shortage`.

## 6. Phân tích từng cột

High-risk column groups:

| Column group | Tables | Analysis |
|---|---|---|
| `tenant_id` | Most tenant-scoped tables | Required for isolation. Add composite unique constraints with `tenant_id` for business codes. |
| Business numbers | `pr_no`, `po_no`, `shipment_no`, `grn_no`, `mo_no` | Keep unique per tenant. Do not use them as primary keys. |
| Quantity fields | PR/PO/shipment/GRN/inventory/MRP tables | Use `NUMERIC(18,4)`, not float. Add checks for non-negative quantities and hard limits on conversion/shipment/receipt. |
| Money fields | PR, PO, shipment cost, landed cost, item cost | Use `NUMERIC`, currency code, exchange rate, and rate date/source where needed. |
| Status fields | PR, PO, shipment, task, ASN, GRN, MO, MRP | Use enum/check constraints and state transition validation. Free text status would push too much logic into backend. |
| Date fields | ETA/ETD/ATD/ATA, required date, due date, actual date | Use `DATE` for business dates, `TIMESTAMPTZ` for workflow timestamps. |
| `entity_type` + `entity_id` | approvals, documents, audit, notification | Polymorphic relationship. Must have composite indexes and backend validation because DB cannot enforce all FKs directly. |
| JSONB snapshots | revision, audit, outbox/inbox payloads | Acceptable for immutable snapshots/events. Avoid using JSONB to replace core relationships. |

## 7. Phân tích Primary Key

- Transaction/master tables should use immutable UUID primary keys.
- Append-only high-volume logs such as `audit_log`, `state_transition_log`, and `inventory_movement` may use `BIGSERIAL` or UUID. `BIGSERIAL` gives smaller indexes and natural append order; UUID is better for distributed event generation.
- Junction tables can use either surrogate UUID PK plus unique composite keys, or composite PKs. For ORM friendliness, surrogate UUID with unique pairs is usually simpler.
- Business numbers should be unique display keys, not PKs.

## 8. Phân tích Foreign Key

GD1 official relationship flows contain 6 main flows and at least 11 relationship rules:

| Flow | Relationships | Type |
|---|---|---|
| PR header to lines | `purchase_request.id -> purchase_request_line.purchase_request_id` | Physical FK |
| PR to PO conversion | `purchase_order.id -> purchase_order_line.purchase_order_id`; `purchase_request_line.id -> purchase_order_line.purchase_request_line_id` | Physical FK, nullable PR line for manual PO |
| PO to shipment | `shipment.id -> shipment_line.shipment_id`; `purchase_order_line.id -> shipment_line.purchase_order_line_id` | Bridge FKs |
| Shipment execution/cost | `shipment.id -> shipment_milestone.shipment_id`; `shipment.id -> shipment_cost.shipment_id` | Physical FK |
| PO-stage task | `purchase_order.id -> po_stage_task.purchase_order_id`; `po_task_template.id -> po_stage_task.task_template_id`; milestone auto-close by code | 2 physical FKs + 1 logical relationship |
| Approval routing | `approval_matrix_config` resolved by tenant, department, amount band, currency, `applies_to`, `step_order` | Logical/config relationship |

Foreign key policy:

- Do not cascade-delete transactional history such as PO, shipment, GRN, inventory movement, audit, or outbox.
- Use soft delete for master data and reject deletion if referenced by active transactions.
- Index all FK columns that participate in joins or dashboard filters.

## 9. Phân tích Relationship Cardinality

Key cardinalities:

- One PR has many PR lines.
- One PR line can convert into many PO lines; a PO line may have no PR line only for manual PO.
- One PO has many PO lines.
- One PO line can appear in many shipment lines; one shipment has many shipment lines.
- One shipment must have the 10 standard milestone slots.
- One shipment has many cost lines.
- One PO has many PO-stage tasks.
- One task template generates many runtime tasks.
- One shipment can emit one or more ASN records in WMS; the physical design may enforce one active ASN per shipment.
- One GRN has many GRN lines.
- One inventory stock row can have many allocation and movement rows.
- One BOM header has many BOM lines.
- One MRP run has many requirements, supplies, and shortages.
- One MRP shortage can create one suggested PR and later link to a GD1 PR.

## 10. Phân tích JOIN

Important joins and purpose:

| Query flow | Join path | Purpose |
|---|---|---|
| PR traceability | `purchase_request -> purchase_request_line -> purchase_order_line -> purchase_order` | Show how demand became supplier order. |
| Shipment traceability | `purchase_order_line -> shipment_line -> shipment -> shipment_milestone` | Show where ordered quantity is in transit. |
| Landed cost | `shipment_cost -> shipment -> shipment_line -> purchase_order_line` | Allocate cost back to PO line and item. |
| Task workload | `po_stage_task -> purchase_order -> app_user` | Show assignee workload and overdue tasks. |
| SLA dashboard | `shipment -> shipment_milestone -> sla_event` | Detect late checkpoints and escalation state. |
| ASN/GRN | `shipment -> asn -> goods_receipt_note -> grn_line -> purchase_order_line` | Close receiving loop and update PO received quantity. |
| Availability check | `mrp_requirement -> item -> inventory_stock/inventory_allocation -> mrp_supply -> mrp_shortage` | Compute required, on-hand, allocated, available, shortage, earliest available. |

Avoid `SELECT *` across the full chain. Use paginated list queries and detail endpoints/read models for dashboards.

## 11. Phân tích Data Type

- Use UUID for IDs and FKs.
- Use `VARCHAR(30-50)` for business numbers and item/supplier codes.
- Use `NUMERIC(18,4)` for quantity and money; `NUMERIC(18,6)` for exchange rate.
- Use `CHAR(3)` for ISO currency and `CHAR(2)` for country code.
- Use enum/check constraints for finite state machines.
- Use `TIMESTAMPTZ` for audit/workflow events and `DATE` for expected logistics dates.
- Use JSONB only for payloads, snapshots, integration config, and metadata that is not a core relational relationship.

## 12. Phân tích Constraint

Required constraints:

- `qty_requested > 0`
- `qty_converted >= 0`
- `qty_converted <= qty_requested`
- `qty_ordered > 0`
- `qty_shipped >= 0`
- `shipment_line.qty_shipped > 0`
- Sum shipped per PO line must not exceed `qty_ordered * (1 + tolerance_over_pct)`.
- `shipment_milestone` unique `(shipment_id, sequence_no)` and `(shipment_id, milestone_code)`.
- `shipment_cost.amount >= 0`
- `shipment_cost.exchange_rate > 0`
- `po_stage_task DONE` requires completion metadata.
- `po_stage_task BLOCKED` requires note.
- `inventory_stock.qty_on_hand >= 0`, `qty_allocated >= 0`, and `qty_allocated <= qty_on_hand` unless negative inventory is explicitly allowed.
- `inventory_movement.qty_delta <> 0`
- `mrp_shortage.shortage_qty >= 0`
- Unique per tenant business codes: PR, PO, shipment, item, supplier, warehouse, GRN, MO.

## 13. Phân tích Normalization / Denormalization

Good normalization:

- `shipment_line` correctly resolves PO line to shipment N:M.
- `inventory_movement` should be a ledger, while `inventory_stock` is a current-balance table.
- `mrp_run` separates calculation history from current master/transaction state.
- Master data such as item, supplier, incoterm, currency, unit, and department should not be repeated as free text in transaction tables.

Acceptable denormalization:

- Revision snapshots store header/line JSON for immutable history.
- Audit before/after JSON is acceptable for immutable audit.
- Dashboard materialized views such as supplier performance, shipment dashboard, and task workload are acceptable read models.
- `purchase_order_line.landed_cost_alloc`, `qty_shipped`, and `qty_received` are derived rollups; backend should own recalculation.

Risky denormalization:

- `shipment.container_no` as a JSON array becomes weak if container-level tracking is required. Add `shipment_container` when container-level seal, size, status, or demurrage matters.
- Polymorphic `document_attachment` simplifies files but cannot enforce all FK targets at DB level.
- MRP supply references to PO/shipment/on-hand sources are polymorphic and need validation.

## 14. Phân tích Index

Suggested indexes should follow actual query paths:

| Table | Index | Reason |
|---|---|---|
| `purchase_request` | `(tenant_id, status, required_date)` | Pending approval and urgency dashboards. |
| `purchase_request_line` | `(purchase_request_id, line_no)` | PR detail lines. |
| `purchase_order` | `(tenant_id, status, expected_eta)` | Delivery risk dashboard. |
| `purchase_order_line` | `(purchase_order_id, line_no)` | PO detail. |
| `purchase_order_line` | `(purchase_request_line_id)` | PR-to-PO trace. |
| `shipment` | `(tenant_id, status, eta)` | Shipment board and delay filters. |
| `shipment_line` | `(purchase_order_line_id)` | PO line to shipment trace. |
| `shipment_milestone` | unique `(shipment_id, milestone_code)` | Prevent duplicate milestone. |
| `shipment_cost` | `(shipment_id, cost_type)` | Cost allocation. |
| `po_stage_task` | `(tenant_id, assignee_id, status, due_date)` | My tasks and overdue scan. |
| `sla_event` | `(tenant_id, status, due_at)` | SLA scheduler. |
| `outbox_event` | `(status, created_at)` | Publisher polling. |
| `inbox_event` | unique `(source, external_event_id)` | Deduplication. |
| `inventory_stock` | `(tenant_id, item_id, warehouse_id)` | Availability by item and warehouse. |
| `inventory_stock` | `(tenant_id, item_id, lot_id, bin_id)` | Lot/bin inventory lookup. |
| `inventory_movement` | `(tenant_id, item_id, posted_at)` | Movement ledger. |
| `mrp_requirement` | `(mrp_run_id, item_id, required_date)` | Time-phased demand. |
| `mrp_supply` | `(mrp_run_id, item_id, available_date)` | Scheduled receipt matching. |
| `mrp_shortage` | `(mrp_run_id, item_id, shortage_date)` | Shortage dashboard. |

Do not index every status or FK blindly. High-write ledgers and event tables need a smaller, workload-driven index set.

## 15. Phân tích Transaction / Concurrency

High-risk transactions:

- PR submit: resolve approval matrix and create approval runtime rows in one transaction.
- PR to PO conversion: lock PR lines or enforce aggregate constraints to prevent over-conversion.
- PO revision: create revision snapshot, increment revision, reset supplier confirmation atomically.
- Shipment line insert/update: prevent shipped quantity from exceeding tolerance.
- Milestone update: update milestone, shipment status, linked tasks, SLA events, and outbox in one transaction.
- Landed cost update: recalculate affected PO line landed-cost allocation.
- GRN posting: create movement rows, update stock balance, roll up PO received quantity, emit ERP event.
- Inventory allocation: lock stock rows or use atomic update conditions to prevent over-allocation.
- MRP run: snapshot demand/supply at run time to avoid drifting calculation results.

## 16. Phân tích Query Planning / Execution Plan

Recommended query planning:

- List screens should start from the owning header table filtered by `(tenant_id, status/date)` and join only summary fields.
- Detail screens should load header, lines, milestones/tasks/cost in separate bounded queries to avoid duplicate row explosion.
- Dashboard read models are justified for shipment status buckets, supplier performance, and task workload.
- Availability check should use `inventory_stock` balance tables and scheduled receipt projections instead of scanning the full movement ledger.
- Use `EXPLAIN ANALYZE` when query volume is known, especially for shipment dashboard, overdue SLA scans, inventory availability, and MRP run generation.

## 17. Phân tích ORM Mapping nếu có

The current stack is Express + PostgreSQL without a committed ORM in the inspected project metadata. If an ORM is introduced:

- Model `shipment_line` as an explicit entity, not an implicit many-to-many.
- Avoid ORM cascades that delete business history.
- Use transaction boundaries explicitly for conversion, shipment, landed cost, GRN, and inventory allocation.
- Map enum values consistently with GD1 uppercase status values used by repo docs.
- Treat polymorphic associations as service-level joins/read models, not normal ORM relations.

## 18. Phân tích Backend Logic dư thừa

Move these checks toward database constraints or transactional service invariants:

- Quantity non-negative and conversion/ship/receive limits.
- Unique milestone per shipment.
- Unique business numbers per tenant.
- Task completion/blocking metadata rules.
- Inbox deduplication and idempotency.
- Outbox event status transition.

Keep these in backend/services:

- Approval route resolution from amount band and department.
- Business-hours SLA due-date calculation.
- Landed-cost allocation formula.
- Shipment status derived from milestone actual dates.
- MRP netting and shortage calculation.
- Cross-system event orchestration.

## 19. Phân tích Migration Risk

Key risks:

- Current runtime still uses legacy delivery-order naming for shipment in places.
- Adding the full 55-58 table GD1 extension at once would create over-engineering and migration risk.
- Polymorphic documents/audit are convenient but weaker than physical FKs.
- Inventory and MRP should not be implemented as GD1 hacks because GD2/GD3 need ledger/run semantics.
- Container tracking may outgrow a JSON field.
- Multi-tenant data leakage is critical if `tenant_id` filters/RLS are inconsistent.

Least-damage migration path:

1. Preserve GD1 official 11-table target as the implementation core.
2. Add only shared master/reference tables required by screens and constraints.
3. Add runtime approval, document, SLA, audit, notification, and outbox tables when the corresponding module is implemented.
4. Keep GD2/GD3 as separate module namespaces and integrate through event/FK boundaries.
5. Migrate legacy `delivery_orders` to canonical `shipment` deliberately or document it as a compatibility table.

## 20. Đề xuất tối ưu theo mức độ ưu tiên

P0:

- Confirm GD1 official 11-table baseline and do not mix WMS/MRP tables into current GD1 core.
- Enforce PR line conversion, shipment line quantity, milestone uniqueness, and cost allocation integrity.
- Add outbox/inbox and idempotency before ERP/forwarder production integrations.
- Ensure every tenant-scoped query has `tenant_id` protection.

P1:

- Add master/reference tables: item, supplier, department, currency, exchange rate, incoterm, unit.
- Add approval runtime tables if approval history/escalation must be auditable.
- Add document attachment and file storage for milestone files.
- Add SLA config/event and task audit for SOP enforcement.

P2:

- Add WMS tables only when ASN/GRN/stock/putaway enters implementation scope.
- Add MRP tables only when BOM, MO, and availability planning enter implementation scope.
- Add materialized views for dashboards after query patterns stabilize.

## 21. Kết luận Database Analyst

The correct database architecture is layered:

- GD1 official core: 11 tables, 6 relationship flows, 11 minimum relationship rules.
- GD1 operational extension: valid but should be phased, because it expands the system to about 55-58 tables.
- Full Kim Binh SCM platform: GD1+GD2+GD3 planning model of about 115-120 tables, with WMS and MRP as future module boundaries.

The most important design decision is to keep traceability intact:

```text
MRP shortage -> suggested PR -> PR line -> PO line -> shipment line -> shipment milestone -> GRN -> inventory stock -> production material issue
```

That chain requires physical bridge tables, strict quantity constraints, append-only movement/event logs, and clear separation between current GD1 implementation scope and future WMS/MRP architecture.
