# KBFE Project Context

KBFE is the Kim Binh Supply Chain Platform for GD1: Procurement & Import Tracking. GD1 digitizes the flow from purchase order creation to warehouse arrival for imported and domestic procurement:

```text
PO -> DO -> Quotation versions -> Final quotation -> Confirm DO -> Shipment -> 10 Milestones -> Documents + Landed Cost
```

The current codebase still contains older Logistics Control Tower runtime names such as `delivery_orders`. For new documentation, data model planning, UI/API design, and migration planning, use the GD1 vocabulary below. If code still uses a legacy runtime name, document the mapping instead of silently renaming it.

## Source Of Truth

| Need | Canonical document |
|---|---|
| GD1 scope, modules, states, business rules | `docs/context/PROJECT_CONTEXT.md` and `docs/context/OPERATING_MODEL.md` |
| Delivery Order module | `docs/modules/delivery-orders/README.md` |
| Shipment modules | `docs/modules/shipments/` |
| PO-stage task workflow | `docs/modules/tasks/po-stage-tasks.md` |
| Dashboard/workflow module | `docs/modules/dashboard-workflow/README.md` |
| Master data module | `docs/modules/master-data/README.md` |
| Future roadmap | `docs/future/` |

## Stack

- Frontend: Vite, React, TypeScript, Mantine, Tabler Icons, React Router, TanStack Query, Zustand.
- API client/types: `frontend/src/api/logistics.ts` compatibility exports backed by `frontend/src/shared/api`.

## Architecture Map

| Area | Current location |
|---|---|
| App shell/routing | `frontend/src/app/App.tsx`, `frontend/src/app/routes.tsx`, `frontend/src/app/routeRoles.ts` |
| Feature pages | `frontend/src/features/<feature>/page.tsx` |
| Shared frontend | `frontend/src/shared/api`, `frontend/src/shared/auth`, `frontend/src/shared/components`, `frontend/src/shared/i18n`, `frontend/src/shared/stores`, `frontend/src/shared/theme`, `frontend/src/shared/utils` |
| Compatibility frontend exports | legacy `frontend/src/api`, `frontend/src/auth`, `frontend/src/components`, `frontend/src/hooks`, `frontend/src/i18n`, `frontend/src/stores`, `frontend/src/theme`, `frontend/src/utils` paths |
| Backend bootstrap | `backend/server.ts` |
| Backend HTTP layers | `backend/routes/*.routes.ts`, `backend/controllers/*.controller.ts`, `backend/middlewares/` |
| Backend business services | `backend/services/*.service.ts` |
| Backend persistence | `backend/models/` |
| Backend config/domain/helpers | `backend/config/`, `backend/domain/`, `backend/utils/` |

## GD1 Product Scope

In scope:

- PO creation (manual or template) with General Info + LOT-based item organization.
- PO to DO relationship: one PO can create many DOs. Each DO belongs to one PO.
- Delivery Order (DO) as the unit between PO and Shipment: warehouse/delivery address, transport type, quotation selection, confirmation status, and delivery dates.
- DO to Shipment relationship: one confirmed DO proceeds to exactly one Shipment / delivery execution record.
- FDS freight-forwarding Quotation within the DO workflow: create quotation v1, revise if needed, create v2/v3..., select one final quotation, then confirm DO.
- PO SEA/AIR/DOMESTIC lifecycle, supplier confirmation, and revision/versioning.
- Import shipment creation from one confirmed DO.
- 10 shipment milestones from booking confirmation to EDO and delivery.
- Document management per shipment milestone: import, edit, version chứng từ (CI, PL, CO, Draft B/L, Final B/L, AWB, customs declarations).
- Landed cost per PO line, allocated by value, weight, or quantity.
- SLA enforcement for FDS-KBI SOP stages.
- PO-stage task assignment, templates, overdue detection, and milestone auto-close.
- ERP sync for PO and GRN, with REST/SFTP fallback planning.
- Forwarder/carrier tracking as best-effort API/webhook/email/manual updates.
- Production reliability foundation for idempotency, optimistic locking, append-only audit, transactional outbox, integration inbox/raw events, scheduler metadata, and dashboard aggregate read models.

Out of scope for GD1:

- Purchase Request (PR) — removed from GD1 scope entirely.
- Cost & Settlement (Landed Cost allocation, Debit Notes, invoicing, debt reconciliation) — deferred/skipped.
- ERP / WMS Integration — deferred/skipped.
- Bin/rack warehouse location management.
- WMS putaway/scanning and full GRN warehouse operation.
- BOM, production orders, MRP, and purchase demand forecasting.

## Core Entities

| GD1 entity | Table in GD1 document | Purpose |
|---|---|---|
| Purchase Order | `purchase_order`, `purchase_order_line` | Supplier order with General Info (supplier, incoterm, payment terms, currency, ETD/ETA) and LOT-based item grouping. Revision, terms, ordered/shipped/received quantities. |
| Delivery Order | `delivery_order`, `delivery_order_line` | Unit of delivery between PO and Shipment. One PO can have many DOs; each DO belongs to one PO and captures warehouse/delivery address, transport type, quotation selection, confirmation status, and delivery dates. |
| Quotation | `quotation`, `quotation_version` | FDS freight-forwarding quotation created under a DO. A DO can have multiple quotation versions/candidates, but exactly one final quotation is selected before DO confirmation. |
| Shipment | `shipment`, `shipment_line` | Delivery execution record linked 1:1 to a confirmed DO, with mode, forwarder, B/L/AWB, route, dates, customs stream, milestones, documents, and costs. |
| Milestone | `shipment_milestone` | 10 runtime checkpoints with planned/actual dates and source. |
| Cost | `shipment_cost` | Freight, insurance, duty, VAT, local charges, demurrage, and allocation method. |
| Task | `po_stage_task`, `po_task_template` | Owned work generated per PO type and PO stage, optionally linked to shipment milestone. |
| Approval Matrix | `approval_matrix_config` | Department/value based approval chain and escalation timeout (applicable to PO approval). |

## PO Structure — General Info + LOT Management

### Create PO Form UX

Group form fields logically by human workflow (Họ → Tên → ... pattern):

| Section | Fields |
|---|---|
| **Thông tin chung (General)** | Supplier → PO Type (SEA/AIR/DOMESTIC) → Incoterm → Payment Term → Currency → Exchange Rate → ETD/ETA → Notes |
| **Items** | Add items: Item → Qty → Unit Price → Tax → Discount → Expected ETA per line |
| **DO Planning** | Default: one DO can be created from the PO. Additional DOs can be created when the PO needs multiple deliveries. Items/lines can be assigned to the target DO before quotation and confirmation. |

### PO Detail View

| Element | What it shows |
|---|---|
| Header | PO number, supplier, status, revision, dates |
| General Info | All input fields from creation |
| Items summary | All items in this PO with qty ordered/shipped/received |
| LOT view | Which LOT each item belongs to. If not split, shows "1 LOT (default)". If split, shows LOT breakdown with item assignments. |
| DO links | Each LOT links to its corresponding DO |

### PO, DO, Quotation, Shipment Relationship

- 1 PO -> N DO.
- Each DO belongs to exactly 1 PO.
- 1 DO -> 1 Shipment after DO confirmation.
- Shipment is not created from multiple DOs in the current business model.
- Quotation is managed inside the DO workflow. A DO can have quotation v1, v2, v3... but only one final quotation can be selected.
- DO cannot be confirmed until the warehouse/delivery address is selected and a final quotation is selected.
- In the PO screen: show one PO with all linked DOs.
- In the DO screen: show DO details, address/warehouse, quotation versions, selected final quotation, confirmation status, and shipment link.

## Quotation Workflow (FDS → KBI)

Per SOP FDS-KBI R7, the quotation is the freight-forwarding pricing quote created inside a DO:

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

### Quotation Rules

- A DO can hold multiple quotation versions/candidates: v1, v2, v3...
- A quotation can be revised before creating the next version.
- Version history is preserved for audit trail.
- Exactly one quotation must be selected as final before DO confirmation.
- **Page-to-page comparison**: users can compare any two quotation versions side-by-side.
- Per SOP: if KBI does not respond (reject/request changes) within 1 hour, the quotation is considered APPROVED.
- Quotation is all-inclusive pricing (giá trọn gói) per SOP operating principles.

## Shipment Document Management

Shipments support full document lifecycle per milestone:

| Capability | Description |
|---|---|
| Import | Upload documents (CI, PL, CO, Draft B/L, AWB, customs declarations, etc.) per milestone |
| Edit | Revise uploaded documents with version tracking |
| Draft B/L workflow | Upload Draft B/L → FDS Ops review (2h SLA) → KBI confirmation → Revision if needed → Final B/L |
| Document set | Per SOP: Contract, Invoice, Packing List, Tờ khai thông quan, CO/CQ, Đơn bảo hiểm, Hoá đơn Bảo hiểm, MBL/HBL, Arrival Notice, EDO, and other documents |

## Production Reliability Context

These requirements are part of the GD1 production baseline, not optional polish:

| Capability | GD1 purpose | Runtime/data requirement |
|---|---|---|
| Transactional outbox | Do not lose ERP/WMS/internal events when the destination is unavailable. | Business writes that trigger integration must enqueue an outbox event in the same DB transaction. PO `CONFIRMED` and PO revision target ERP; `EDO_DELIVERY` targets GD2/WMS as `shipment.arrived_at_warehouse`. |
| Idempotency | Prevent duplicate creates when users retry or double-submit. | Mutating create APIs must require or attach an `Idempotency-Key` and persist request hash/result for replay or conflict detection. |
| Optimistic locking | Prevent stale browser tabs from overwriting newer PO/shipment/DO/task changes. | Core transactional entities must carry `version`; update APIs should reject stale versions before writing. |
| Immutable audit/state log | Preserve who changed what and when for critical PO/DO/shipment/quotation/task/cost changes. | Audit and state-transition records are append-only snapshots with before/after payloads. |
| State machine and scheduler | Enforce SOP state transitions and detect overdue SLA/task work. | PO, DO, shipment, quotation, and task transitions must follow `OPERATING_MODEL.md`; scheduler metadata supports 15-minute SLA/task scans and 4-hour carrier polling. |
| Landed-cost allocation | Keep PO-line landed cost accurate after every shipment cost change. | Costs allocate to PO lines by `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY` and recalculate after add/update/delete. |
| Integration fallback | Keep shipment milestones current even when partners differ in capability. | Prefer webhook, fall back to REST polling, then IMAP email parsing or SFTP/CSV batch capture with raw event storage. |
| Aggregate read models | Keep dashboards fast under operational volume. | Supplier, shipment, and task dashboards should read from aggregate/materialized tables or snapshots once query volume grows. |

## Canonical Chain

```text
purchase_order
  -> purchase_order_line
  -> delivery_order (1 PO -> N DO)
  -> delivery_order_line
  -> quotation / quotation_version (N versions per DO, 1 selected final)
  -> shipment (1 DO -> 1 Shipment)
  -> shipment_line
  -> shipment_milestone
  -> shipment_cost
  -> landed_cost_alloc on purchase_order_line
```

## GD1 States

PO:

```text
DRAFT -> SENT -> CONFIRMED -> IN_PRODUCTION -> READY_TO_SHIP -> SHIPPED -> RECEIVED -> CLOSED
CANCELLED
```

DO (Delivery Order):

```text
DRAFT -> CONFIRMED -> READY_TO_SHIP -> IN_TRANSIT -> DELIVERED -> CLOSED
CANCELLED
```

DO fields: warehouse / delivery address, origin warehouse when applicable, destination warehouse when applicable, transport type (SEA/AIR/ROAD/RAIL), selected final quotation, confirmation date.

Quotation:

```text
DRAFT -> SENT -> REJECTED -> DRAFT (revised, same or new version) -> SENT -> ... -> FINAL (Approved/Confirmed)
CANCELLED
```

Quotation supports version tracking and page-to-page comparison between any two versions.

Shipment:

```text
BOOKING_PENDING -> BOOKING_CONFIRMED -> CARGO_READY -> PICKED_UP -> BL_ISSUED
-> GATE_IN_POL -> IN_TRANSIT -> CUSTOMS_DRAFT -> ARRIVED -> CUSTOMS_CLEARED -> DELIVERED
CANCELLED
```

## Routes

| Route | GD1 purpose |
|---|---|
| `/` | GD1 dashboard: PO delivery risk, DO status, shipment risk, task workload, landed-cost attention. |
| `/workflow` | Trace PO -> DO -> selected quotation -> Shipment -> milestones/tasks/cost. |
| `/purchase-orders` | PO list/detail, LOT management, drag-and-drop items, revision, supplier confirmation, shipment progress. |
| `/delivery-orders` | DO list/detail: shows all DOs grouped by PO. Each DO shows warehouse/delivery address, transport type, quotation versions, selected final quotation, confirmation status, and shipment link. |
| `/quotations` | Quotation management within DO context: create v1, revise, create v2/v3, compare versions, select final quotation. |
| `/shipments` | Shipment board: one shipment per confirmed DO, milestones, document management (import/edit/Draft B/L), costs. |
| `/tasks` | PO-stage tasks, assignee workload, overdue/blocker management. |
| `/settings` | Theme, language, admin account management. |

## Deep Links

Use query params for shareable context:

```text
/purchase-orders?po=PO-2026-000145
/delivery-orders?do=DO-2026-000201
/delivery-orders?po=PO-2026-000145
/quotations?quotation=QUO-2026-000034
/shipments?shipment=SHP-2026-000087
/tasks?po=PO-2026-000145
/tasks?task=TASK-2026-000553
/workflow?shipment=SHP-2026-000087
/workflow?po=PO-2026-000145
```

## Form UX Principle

All create/edit forms must group fields logically by human workflow, following the "Họ → Tên → ..." principle:

- **PO Create**: Supplier → PO Type → Incoterm → Payment → Currency → Dates → Items → LOT
- **DO Create**: Select PO/PO lines -> Select warehouse / delivery address -> Transport type -> Delivery dates -> Create quotation v1
- **Quotation Create/Revise**: DO -> Pricing -> Terms -> Documents -> Submit version -> Revise/create next version if needed -> Select final quotation
- **Shipment Create**: Confirmed DO -> Mode -> Forwarder -> Carrier -> B/L/AWB -> Route -> Dates

Each form section should be visually grouped (card or section header) and ordered to match how a human would naturally fill in the information.

## Current Gaps

- Runtime tables are not yet fully aligned with GD1 singular table names and states.
- `delivery_orders` in code currently represents the old shipment concept; migration to the new DO entity (between PO and Shipment) needs explicit planning.
- Quotation entity, version tracking, and page-to-page comparison need implementation.
- LOT management, drag-and-drop item reassignment, and PO → DO auto-creation need implementation.
- Shipment document management (import/edit/version) needs full implementation.
- PO versioning, shipment milestones, task templates, landed cost allocation, and GD1 SLA runtime need implementation or migration.
- Reliability foundations may exist before full workers/controllers are complete; Kafka/RabbitMQ publisher, provider webhooks, carrier pollers, IMAP/SFTP connectors, RLS tenant enforcement, and AES object-storage integration must be tracked separately before production cutover.
- Master data for supplier, item, department, tenant, incoterm, and currency is referenced by GD1 but not fully modeled in the GD1 document.
- Frontend and backend use independent Vitest suites and package-scoped verification commands.
