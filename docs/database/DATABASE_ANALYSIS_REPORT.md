# GD1 Database Analysis Report

Date: 2026-05-27  
Scope: Compare GD1 document schema against current runtime schema and docs.

## Summary

GD1 document defines a Procurement & Import Tracking model:

```text
purchase_request -> purchase_request_line -> purchase_order_line -> shipment_line -> shipment -> shipment_milestone -> shipment_cost
```

The current runtime already has PR/PO/shipment foundations, with shipment still implemented through older DO naming in places. GD1 should be treated as a target design baseline. The canonical GD1 schema is `docs/database/GD1_DOCUMENT_ERD.md`.

## GD1 Tables

| GD1 table | Runtime compatibility candidate | Gap |
|---|---|---|
| `purchase_request` | `purchase_requests` | Runtime status/fields differ; approval fields incomplete. |
| `purchase_request_line` | `purchase_request_lines` | Runtime uses item code/name text; GD1 references `item_id`, `qty_converted`. |
| `purchase_order` | `purchase_orders` | Missing revision, PO type, incoterm, payment term, expected ETA/ETD, tolerance fields. |
| `purchase_order_line` | `purchase_order_lines` | Missing canonical `purchase_request_line_id`, shipped/received qty, unit price/tax/discount/landed cost. |
| `shipment` | `delivery_orders` | Runtime table name and shape differ; GD1 uses shipment header with B/L/AWB and status. |
| `shipment_line` | `delivery_order_source_lines` | Runtime bridge needs canonical `purchase_order_line_id`. |
| `shipment_milestone` | new table needed | Runtime does not model 10 standard milestone rows. |
| `shipment_cost` | `finance_charge_lines` partial | Runtime has charges, not GD1 landed-cost allocation source. |
| `po_stage_task` | `logistics_tasks` partial | Runtime tasks attach to DO/shipment, not PO stage. |
| `po_task_template` | new table needed | Required for task auto-generation by PO type/stage. |
| `approval_matrix_config` | new table needed | Required for department/value approval routing. |

## Highest-Risk Gaps

1. Shipment naming: code still uses `delivery_orders`; GD1 docs use `shipment`.
2. Quantity control: current links rely partly on business codes and denormalized arrays.
3. Approval workflow: GD1 requires matrix and escalation but runtime lacks dedicated approval tables.
4. PO versioning: GD1 requires revision after supplier send/confirm.
5. Milestones: GD1 requires exactly 10 milestone rows per shipment.
6. Landed cost: GD1 needs cost allocation back to PO lines.
7. PO-stage tasks: GD1 tasks are generated from PO stage templates, not only shipment/DO tasks.

## Runtime Migration Status: IN PROGRESS

The migration files for GD1 runtime compatibility exist, but production readiness must be judged by both schema and backend behavior:

1. **Schema Migration**: Migrations `002_gd1_core_tables.sql` and `003_gd1_field_additions.sql` create GD1 tables/fields on top of the normalized runtime schema.
2. **Reliability Foundation**: Migration `004_reliability_integration_foundation.sql` adds idempotency, outbox/inbox, raw integration event capture, scheduler job metadata, aggregate snapshots, state-transition logs, version columns, and append-only guards for audit/state logs.
3. **Models & APIs**: TypeScript models and API client contracts are present, but business-rule guards remain the production gate.
4. **Frontend Integration**: GD1 panels are integrated into PR, PO, Shipment/Delivery Orders, Tasks, and Workflow screens.
5. **Production Hardening**: Approval, milestone, landed-cost, PO-stage, task-state, and readiness checks must pass verification before exposing these flows broadly.

## Enterprise Reliability Requirements

| Requirement | Runtime foundation | Current production status |
|---|---|---|
| Transactional outbox | `outbox_events` table and helper for enqueueing events inside the same DB transaction as business writes. | Foundation ready; Kafka/RabbitMQ publisher worker is still pending. |
| Webhook inbound | `inbox_events` and `integration_raw_events` can capture external events idempotently. | Schema ready; HTTPS inbound controllers per provider are pending. |
| Carrier REST polling | `integration_configs` and `scheduler_jobs` can store polling cadence such as every 4 hours. | Schema ready; poller worker is pending. |
| Email parsing / SFTP batch | `integration_configs.channel` supports `EMAIL_IMAP` and `SFTP_CSV`; raw payload capture is available. | Design/schema ready; IMAP/SFTP connectors and rule parser are pending. |
| Optimistic locking | `version` columns exist on core runtime entities. | Foundation ready; route-level `If-Match` or payload version checks are still pending for all update APIs. |
| Idempotency | `idempotency_keys` table plus POST create request helper; frontend auto-sends `Idempotency-Key`. | Implemented for primary create endpoints; extend to every future POST create endpoint. |
| Immutable audit | Existing `audit_logs` is append-only via DB trigger; `state_transition_logs` is append-only. | Foundation ready; all critical mutations must call audit/state helpers. |
| State machine | PR approval, PO stage, milestone-derived shipment status have explicit guards. | Partial production hardening done; PR/PO/Shipment remaining legacy states need full alignment. |
| Background scheduler | `scheduler_jobs` stores due/lock/error metadata. | Schema ready; cron runner process is pending. |
| Allocation engine | `shipment_costs` recalculates `purchase_order_lines.landed_cost_alloc`. | Implemented for value/quantity fallback; weight allocation needs line weight data. |
| Materialized / aggregate read model | `dashboard_aggregate_snapshots` table exists for precomputed metrics. | Schema ready; refresh jobs are pending. |
| Multi-tenant isolation | `tenant_id` exists on GD1 and reliability tables. | App-level tenant filtering is not complete; RLS should wait until auth token carries tenant_id. |
| Encryption at rest | Attachment metadata supports storage provider, checksum, and future encryption key references. | Current local DB data URL storage is dev-only; AES-256 object storage/provider integration is pending. |

## Current Backend Handling: Speed, Locking, Deadlock, And Consistency

### Current Strengths

- PostgreSQL is the runtime source of truth; the backend no longer depends only on in-memory state.
- Normalized tables already have primary keys and important indexes from `001_normalized_logistics_schema.sql`, for example PR/PO/DO business-code indexes.
- GD1 compatibility migrations add targeted indexes for common write/read paths:
  - `shipment_milestones(shipment_id, sequence_no)`
  - `shipment_costs(shipment_id)`
  - `po_stage_tasks(purchase_order_id, po_stage, status)`
  - `approval_steps(entity_type, entity_id, step_order)`
  - `delivery_order_source_lines(purchase_order_line_id)`
- Critical multi-step GD1 writes should be run inside transactions:
  - cost insert/delete plus landed-cost recalculation
  - PR approval step approval/rejection
  - PO stage transition plus checklist generation
  - shipment creation plus milestone generation

### Speed / Query Performance

Current backend speed is acceptable for demo and early pilot scale, but not yet tuned for high-volume production.

High-traffic paths and handling:

| Path | Current handling | Production note |
|---|---|---|
| PR/PO/Shipment list | Reads normalized tables and transforms to frontend shape. | OK for small/medium data; add pagination/server-side filters before large data. |
| Shipment milestones | Indexed by `shipment_id, sequence_no`. | Good targeted lookup. |
| Landed cost recalculation | Recalculates affected PO lines after shipment cost change. | Correctness-first; optimize later with set-based SQL if cost volume grows. |
| PO-stage tasks | Indexed by PO/stage/status. | Good for checklist and blocker checks. |
| Approval steps | Indexed by entity and order. | Good for PR detail lookup and sequential approval. |

Recommended next production work:

- Add API pagination and server-side filters for PR/PO/Shipment/Task list endpoints.
- Avoid repeated full `writeSnapshot` rewrites for high-volume mutations; migrate write paths to direct row-level SQL updates.
- Add `EXPLAIN ANALYZE` snapshots for dashboard and global search queries once realistic data volume is seeded.
- Add background/materialized summary tables for dashboard cards if list sizes exceed pilot scale.
- Add outbox publisher metrics: pending count, oldest pending age, retry count, dead-letter count.

### Locking And Deadlock Handling

The desired locking model is row-level, short-lived, and ordered:

| Flow | Locking behavior needed |
|---|---|
| Submit PR for approval | Lock the PR row, resolve matrix, replace approval steps in one transaction. |
| Approve/reject PR step | Lock the approval step and PR row, mutate only the active `PENDING` step, then activate next step or finalize PR. |
| Advance PO stage | Lock the PO row, check blocked tasks, update status, generate stage tasks in one transaction. |
| Add/delete shipment cost | Insert/delete cost and recalculate impacted PO line landed cost in one transaction. |
| Update milestone | Update one milestone, derive shipment status, and auto-close linked tasks. |

Current risk:

- Some legacy write paths still use snapshot-style full-table rewrites. This is simple but can become slow and increases write contention under concurrent users.
- There is no configured retry loop for PostgreSQL deadlock errors (`40P01`) or serialization failures (`40001`).
- There is no dedicated integration test suite that simulates concurrent approval/cost/stage updates.

Production recommendation:

- Keep transactions short and never call external integrations while holding DB locks.
- Lock parent rows before child rows consistently: PR -> approval steps, PO -> PO-stage tasks, shipment -> milestones/costs.
- Add a small retry helper for `40P01` and `40001` around idempotent transactional operations.
- Add concurrency tests for two users approving the same step, adding shipment costs at the same time, and moving a PO stage while a task is blocked.

### Data Consistency Rules Still To Verify

- `qty_converted <= qty_requested`.
- Shipment line total cannot exceed PO tolerance.
- PO revision increments after editing a sent/confirmed PO.
- `EDO_DELIVERY.actual_date` emits the warehouse-arrival integration event.
- Landed cost allocation remains correct when one PO line is split across multiple shipments.
- Audit rows exist for approval, PO stage, milestone, cost, and task status updates.

---

## Verification Targets

- `qty_converted <= qty_requested`.
- PO line sourced quantity does not exceed PR line remaining quantity.
- Shipment line quantity does not exceed PO tolerance.
- Exactly 10 active milestones per shipment.
- `EDO_DELIVERY.actual_date` drives delivered shipment state.
- Cost allocation recalculates PO line landed cost.
- Task `BLOCKED` and `DONE` metadata rules are enforced.
- Approval route resolves deterministically by tenant, department, currency, and value range.
