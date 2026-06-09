---
name: kbfe-data-model
description: Use when changing KBFE GD1 entities, TypeScript types, API schemas, validation rules, fixtures, derived fields, or persistence for PO, DO, Quotation, shipment, milestones, and tasks.
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
purchase_order 1..n purchase_order_line
purchase_order 1..n delivery_order
delivery_order 1..n delivery_order_line
purchase_order_line 1..n delivery_order_line
delivery_order 1..1 quotation
quotation 1..n quotation_version
delivery_order_line 0..n shipment_line
shipment 1..n shipment_line
shipment 1..10 shipment_milestone
purchase_order 0..n po_stage_task
po_task_template 0..n po_stage_task
```

## Core Tables From GD1

- `purchase_order`
- `purchase_order_line`
- `delivery_order`
- `delivery_order_line`
- `quotation`
- `quotation_version`
- `shipment`
- `shipment_line`
- `shipment_milestone`
- `po_stage_task`
- `po_task_template`

Production reliability/runtime tables (DEFERRED / SKIPPED in current phase):
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

External FK tables referenced:
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
| PO | `po_no` |
| DO | `do_no` |
| Quotation | `quotation_no` |
| Shipment | `shipment_no` |
| lines | UUID `id` |
| Task | UUID `id` |

Do not use display names as relationship keys.

## Important Enums

Use the values defined in `docs/database/GD1_DOCUMENT_ERD.md`.

High-value status sets:

- PO: `DRAFT`, `SENT`, `CONFIRMED`, `IN_PRODUCTION`, `READY_TO_SHIP`, `SHIPPED`, `RECEIVED`, `CLOSED`, `CANCELLED`
- DO: `DRAFT`, `CONFIRMED`, `READY_TO_SHIP`, `IN_TRANSIT`, `DELIVERED`, `CLOSED`, `CANCELLED`
- Quotation: `DRAFT`, `SENT`, `REJECTED`, `FINAL`, `CANCELLED`
- Shipment: `BOOKING_PENDING`, `BOOKING_CONFIRMED`, `CARGO_READY`, `PICKED_UP`, `BL_ISSUED`, `GATE_IN_POL`, `IN_TRANSIT`, `CUSTOMS_DRAFT`, `ARRIVED`, `CUSTOMS_CLEARED`, `DELIVERED`, `CANCELLED`
- Task: `PENDING`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `CANCELLED`
- Customs stream: `GREEN`, `YELLOW`, `RED`

## Derived Fields

Backend should own:

- PO line `qty_shipped`
- PO line `qty_received`
- shipment status from latest actual milestone
- milestone progress percentage
- SLA overdue state
- task overdue state
- dashboard risk reasons

## Validation Rules

PO:

- PO line must belong to one PO.
- Editing a PO after `SENT` creates `revision + 1`.
- Supplier confirmation timestamp is required after `CONFIRMED`.

DO:

- DO must belong to one PO.
- Must define origin warehouse, destination warehouse, transport type, and confirm before proceeding.

Quotation (Managed under DO):

- Quotation must have a corresponding DO.
- KBI approval triggers state finalization.
- SENT status triggers 1-hour auto-approval timer.
- Reject resets status to DRAFT on the same version number for revision.

Shipment:

- Shipment must contain at least one line.
- `shipment_line.qty_shipped > 0`.
- Sum shipped per DO line cannot exceed DO tolerance.
- Exactly 10 active milestones should exist per shipment (with 3 under 2, 5 under 4, 6 and 7 disabled).
- `DELIVERED` requires `EDO_DELIVERY.actual_date`.
- Milestone code and sequence are unique per shipment.

Task:

- `DONE` requires `completed_at` and `completed_by`.
- `BLOCKED` requires note.
- Active PO-stage task blockers may block PO transition.

## Fixture Coverage

Seed/mock data should visibly include:

- PO revision after supplier send
- DO pending confirmation vs confirmed DO
- Quotation under DO in SENT state with active SLA timer
- Quotation with multiple versions compared side-by-side
- one PO LOT split into multiple DOs
- one consolidated shipment containing multiple DO lines
- all 10 shipment milestones (with 3 nested under 2, 5 nested under 4, 6 and 7 disabled)
- green/yellow/red customs examples
- overdue task and blocked task
