---
name: kbfe-data-model
description: Use when changing KBFE GD1 entities, TypeScript types, API schemas, validation rules, fixtures, derived fields, or persistence for PR, approval, PO, shipment, milestones, costs, tasks, ERP sync, and documents.
---

# KBFE GD1 Data Model Skill

## Goal

Keep GD1 frontend types, backend schemas, docs, fixtures, API payloads, and UI assumptions aligned.

Load these docs for GD1 data work:

1. `docs/context/PROJECT_CONTEXT.md`
2. `docs/context/OPERATING_MODEL.md`
3. `docs/database/GD1_DOCUMENT_ERD.md`
4. Focused module docs under `docs/modules/`

## GD1 Relationship Model

```text
purchase_request 1..n purchase_request_line
purchase_request_line 0..n purchase_order_line
purchase_order 1..n purchase_order_line
purchase_order_line 0..n shipment_line
shipment 1..n shipment_line
shipment 1..10 shipment_milestone
shipment 0..n shipment_cost
purchase_order 0..n po_stage_task
po_task_template 0..n po_stage_task
approval_matrix_config resolves purchase_request / purchase_order approval
```

Current runtime compatibility:

- `delivery_orders` may still represent the GD1 `shipment`.
- `/delivery-orders` may remain as the shipment route until migration.
- Legacy `do` query params may remain while new docs prefer `shipment`.

## Core Tables From GD1

- `purchase_request`
- `purchase_request_line`
- `purchase_order`
- `purchase_order_line`
- `shipment`
- `shipment_line`
- `shipment_milestone`
- `shipment_cost`
- `po_stage_task`
- `po_task_template`
- `approval_matrix_config`

Production reliability/runtime tables:

- `idempotency_key` / `idempotency_keys`
- `outbox_event` / `outbox_events`
- `inbox_event` / `inbox_events`
- `integration_config` / `integration_configs`
- `integration_raw_event` / `integration_raw_events`
- `scheduler_job` / `scheduler_jobs`
- `audit_log` / `audit_logs`
- `state_transition_log` / `state_transition_logs`
- `task_audit_log`
- dashboard materialized views, aggregate tables, or aggregate snapshot tables

External FK tables referenced but not expanded in GD1:

- tenant
- user
- department
- supplier
- item
- incoterm
- currency

## Stable Keys

Use immutable UUID primary keys plus business codes:

| Entity | Business key |
|---|---|
| PR | `pr_no` |
| PO | `po_no` |
| Shipment | `shipment_no` |
| PR/PO/shipment lines | UUID `id` |
| Task | UUID `id`; optional display code can be added later |

Do not use display names as relationship keys.

## Important Enums

Use the values defined in `docs/database/GD1_DOCUMENT_ERD.md`.

High-value status sets:

- PR: `DRAFT`, `SUBMITTED`, `PARTIALLY_APPROVED`, `APPROVED`, `REJECTED`, `CONVERTED`, `CLOSED`, `CANCELLED`
- PO: `DRAFT`, `SENT`, `CONFIRMED`, `IN_PRODUCTION`, `READY_TO_SHIP`, `SHIPPED`, `RECEIVED`, `CLOSED`, `CANCELLED`
- Shipment: `BOOKING_PENDING`, `BOOKING_CONFIRMED`, `CARGO_READY`, `PICKED_UP`, `BL_ISSUED`, `GATE_IN_POL`, `IN_TRANSIT`, `CUSTOMS_DRAFT`, `ARRIVED`, `CUSTOMS_CLEARED`, `DELIVERED`, `CANCELLED`
- Task: `PENDING`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `CANCELLED`
- Customs stream: `GREEN`, `YELLOW`, `RED`
- Allocation method: `BY_VALUE`, `BY_WEIGHT`, `BY_QTY`

## Derived Fields

Backend should own:

- PR `total_amount`
- PR line `qty_converted`
- PO line `qty_shipped`
- PO line `qty_received` after GD2/GRN integration
- PO line `landed_cost_alloc`
- shipment status from latest actual milestone
- milestone progress percentage
- SLA overdue state
- task overdue state
- dashboard risk reasons

## Validation Rules

PR:

- `qty_requested > 0`.
- `qty_converted <= qty_requested`.
- Submitted PR must resolve an active approval route.
- Rejected PR can return to `DRAFT` with `version + 1`.
- PR becomes `CONVERTED` only when all lines are fully converted.

PO:

- PO line must belong to one PO.
- PO line may reference one PR line; null is allowed only for manual PO.
- Total converted quantity per PR line cannot exceed requested quantity.
- Editing a PO after `SENT` creates `revision + 1`.
- Supplier confirmation timestamp is required after `CONFIRMED`.

Shipment:

- Shipment must contain at least one line.
- `shipment_line.qty_shipped > 0`.
- Sum shipped per PO line cannot exceed PO tolerance.
- Exactly 10 active milestones should exist per shipment.
- `DELIVERED` requires `EDO_DELIVERY.actual_date`.
- Milestone code and sequence are unique per shipment.

Cost:

- `amount >= 0`.
- `exchange_rate > 0`.
- Changing cost or allocation method recalculates landed cost.
- Shipment cost allocation method must be one of `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY`.

Task:

- `DONE` requires `completed_at` and `completed_by`.
- `BLOCKED` requires note.
- Active PO-stage task blockers may block PO transition.

Reliability:

- Core transactional entities should include integer `version >= 1` for optimistic locking.
- Create-style POST mutations should write/read idempotency rows keyed by tenant and `Idempotency-Key`.
- Outbox events must include tenant, aggregate type/id, event type, destination, payload, status, retry metadata, and timestamps.
- Inbox/raw integration events must include tenant, provider/source, event key or request hash, raw payload, status, and timestamps for deduplication and replay.
- Audit and state-transition logs are append-only; do not cascade-delete transactional history.
- Dashboard aggregates should be derived read models, not replacements for normalized PR/PO/shipment/task facts.

## Fixture Coverage

Seed/mock data should visibly include:

- PR pending approval
- rejected PR revised back to draft
- approved PR partially converted to PO
- one PR split into multiple POs
- one PO line split across multiple shipments
- one consolidated shipment containing multiple PO lines
- all 10 shipment milestones
- green/yellow/red customs examples
- landed cost allocated by value, weight, and quantity
- overdue task and blocked task
- PO revision after supplier send
- shipment delivered and warehouse-arrival event-ready

## Done

- Types, API payloads, backend validation, fixtures, docs, and UI agree.
- Derived fields have one source of truth.
- Runtime compatibility names are documented separately from GD1 canonical names.
