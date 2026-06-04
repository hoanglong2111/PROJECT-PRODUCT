# KBFE Project Context

KBFE is the Kim Binh Supply Chain Platform for GD1: Procurement & Import Tracking. GD1 digitizes the flow from purchase demand to warehouse arrival for imported and domestic procurement:

```text
PR -> Approval -> PO -> Import Shipment -> 10 Milestones -> Documents + Landed Cost -> ERP/GRN Sync
```

The current codebase still contains older Logistics Control Tower runtime names such as `delivery_orders`. For new documentation, data model planning, UI/API design, and migration planning, use the GD1 vocabulary below. If code still uses a legacy runtime name, document the mapping instead of silently renaming it.

## Source Of Truth

| Need | Canonical document |
|---|---|
| GD1 scope, modules, states, business rules | `docs/context/PROJECT_CONTEXT.md` and `docs/context/OPERATING_MODEL.md` |
| FDS-KBI freight-forwarding SOP (intake, quotation, Ops, settlement, issue resolution) | `docs/modules/workflow/fds-kbi-sop.md` (source: `SOP_FDS_KBI_R7.docx`) |
| GD1 table/type/constraint design | `docs/database/GD1_DOCUMENT_ERD.md` |
| GD1 reduced ERD overview | `docs/database/PHASE1_PROCUREMENT_IMPORT_ERD.md` |
| Runtime schema analysis and migration gap | `docs/database/DATABASE_ANALYSIS_REPORT.md` |
| Procurement modules | `docs/modules/procurement/` |
| Shipment modules | `docs/modules/shipments/` |
| PO-stage task workflow | `docs/modules/tasks/po-stage-tasks.md` |
| Integration events | `docs/modules/integrations/erp-wms-outbox.md` |

## Stack

- Frontend: Vite, React, TypeScript, Mantine, Tabler Icons, React Router, TanStack Query, Zustand.
- Backend: standalone Express + PostgreSQL package in `backend/`, organized into layered MVC folders.
- API client/types: `frontend/src/api/logistics.ts` compatibility exports backed by `frontend/src/shared/api`.
- Seed data: `backend/seeds/logisticsSeed.ts`, loaded after build with `pnpm --dir backend seed:logistics`.
- MCP/RAG: future planning documentation under `docs/future/mcp-ops/`.

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

- Manual/template PR creation.
- Multi-level approval workflow by department and PR/PO value.
- PR to PO conversion, including partial conversion and split by supplier.
- PO SEA/AIR/DOMESTIC lifecycle, supplier confirmation, and revision/versioning.
- Import shipment creation from one or more PO lines.
- 10 shipment milestones from booking confirmation to EDO and delivery.
- Document upload per shipment milestone.
- Landed cost per PO line, allocated by value, weight, or quantity.
- SLA enforcement for FDS-KBI SOP stages.
- PO-stage task assignment, templates, overdue detection, and milestone auto-close.
- ERP sync for PO and GRN, with REST/SFTP fallback planning.
- Forwarder/carrier tracking as best-effort API/webhook/email/manual updates.
- Production reliability foundation for idempotency, optimistic locking, append-only audit, transactional outbox, integration inbox/raw events, scheduler metadata, and dashboard aggregate read models.

Out of scope for GD1:

- Bin/rack warehouse location management.
- WMS putaway/scanning and full GRN warehouse operation.
- BOM, production orders, MRP, and purchase demand forecasting.

## Core Entities

| GD1 entity | Table in GD1 document | Purpose |
|---|---|---|
| Purchase Request | `purchase_request`, `purchase_request_line` | Demand header and item lines, approval, required date, estimated value. |
| Approval Matrix | `approval_matrix_config` | Department/value based approval chain and escalation timeout. |
| Purchase Order | `purchase_order`, `purchase_order_line` | Supplier order, revision, terms, ETA/ETD, ordered/shipped/received quantities. |
| Shipment | `shipment`, `shipment_line` | Import lot linked to one or more PO lines, mode, forwarder, B/L/AWB, route, dates, customs stream. |
| Milestone | `shipment_milestone` | 10 runtime checkpoints with planned/actual dates and source. |
| Cost | `shipment_cost` | Freight, insurance, duty, VAT, local charges, demurrage, and allocation method. |
| Task | `po_stage_task`, `po_task_template` | Owned work generated per PO type and PO stage, optionally linked to shipment milestone. |

## Production Reliability Context

These requirements are part of the GD1 production baseline, not optional polish:

| Capability | GD1 purpose | Runtime/data requirement |
|---|---|---|
| Transactional outbox | Do not lose ERP/WMS/internal events when the destination is unavailable. | Business writes that trigger integration must enqueue an outbox event in the same DB transaction. PO `CONFIRMED` and PO revision target ERP; `EDO_DELIVERY` targets GD2/WMS as `shipment.arrived_at_warehouse`. |
| Idempotency | Prevent duplicate creates when users retry or double-submit. | Mutating create APIs must require or attach an `Idempotency-Key` and persist request hash/result for replay or conflict detection. |
| Optimistic locking | Prevent stale browser tabs from overwriting newer PR/PO/shipment/task changes. | Core transactional entities must carry `version`; update APIs should reject stale versions before writing. |
| Immutable audit/state log | Preserve who changed what and when for critical PR/PO/shipment/task/cost changes. | Audit and state-transition records are append-only snapshots with before/after payloads. |
| State machine and scheduler | Enforce SOP state transitions and detect overdue SLA/task work. | PR, PO, shipment, and task transitions must follow `OPERATING_MODEL.md`; scheduler metadata supports 15-minute SLA/task scans and 4-hour carrier polling. |
| Landed-cost allocation | Keep PO-line landed cost accurate after every shipment cost change. | Costs allocate to PO lines by `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY` and recalculate after add/update/delete. |
| Integration fallback | Keep shipment milestones current even when partners differ in capability. | Prefer webhook, fall back to REST polling, then IMAP email parsing or SFTP/CSV batch capture with raw event storage. |
| Aggregate read models | Keep dashboards fast under operational volume. | Supplier, shipment, and task dashboards should read from aggregate/materialized tables or snapshots once query volume grows. |

## Canonical Chain

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> shipment_cost
  -> landed_cost_alloc on purchase_order_line
```

## GD1 States

PR:

```text
DRAFT -> SUBMITTED -> PARTIALLY_APPROVED -> APPROVED -> CONVERTED -> CLOSED
REJECTED -> DRAFT
CANCELLED
```

PO:

```text
DRAFT -> SENT -> CONFIRMED -> IN_PRODUCTION -> READY_TO_SHIP -> SHIPPED -> RECEIVED -> CLOSED
CANCELLED
```

Shipment:

```text
BOOKING_PENDING -> BOOKING_CONFIRMED -> CARGO_READY -> PICKED_UP -> BL_ISSUED
-> GATE_IN_POL -> IN_TRANSIT -> CUSTOMS_DRAFT -> ARRIVED -> CUSTOMS_CLEARED -> DELIVERED
CANCELLED
```

## Routes

| Route | GD1 purpose |
|---|---|
| `/` | GD1 dashboard: PR pending, PO delivery risk, shipment risk, task workload, landed-cost attention. |
| `/workflow` | Trace PR -> PO -> Shipment -> milestones/tasks/cost. |
| `/purchase-requests` | PR list/detail, approval status, line conversion readiness. |
| `/purchase-orders` | PO list/detail, revision, supplier confirmation, source PR lines, shipment progress. |
| `/delivery-orders` | Legacy route name for Shipment board until route migration is done. |
| `/tasks` | PO-stage tasks, assignee workload, overdue/blocker management. |
| `/settings` | Theme, language, admin account management. |

## Deep Links

Use query params for shareable context:

```text
/purchase-requests?pr=PR-2026-000145
/purchase-orders?po=PO-2026-000145
/delivery-orders?shipment=SHP-2026-000087
/delivery-orders?pr=PR-2026-000145
/tasks?po=PO-2026-000145
/tasks?task=TASK-2026-000553
/workflow?shipment=SHP-2026-000087
/workflow?pr=PR-2026-000145
```

Legacy `do` query params may remain while code still uses `delivery_orders`; new docs and APIs should prefer `shipment`.

## Current Gaps

- Runtime tables are not yet fully aligned with GD1 singular table names and states.
- `delivery_orders` currently represents the shipment concept in code; migration should be explicit.
- Approval workflow, PO versioning, shipment milestones, task templates, landed cost allocation, and GD1 SLA runtime need implementation or migration.
- Reliability foundations may exist before full workers/controllers are complete; Kafka/RabbitMQ publisher, provider webhooks, carrier pollers, IMAP/SFTP connectors, RLS tenant enforcement, and AES object-storage integration must be tracked separately before production cutover.
- Master data for supplier, item, department, tenant, incoterm, and currency is referenced by GD1 but not fully modeled in the GD1 document.
- Frontend and backend use independent Vitest suites and package-scoped verification commands.
