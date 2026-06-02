---
name: kbfe-data-model
description: Use when defining or changing KBFE GD1 domain entities, TypeScript types, database schemas, OpenAPI schemas, enums, relationships, derived fields, validation rules, fixtures, or migration plans.
---

# KBFE GD1 Data Model Reference

This file mirrors `docs/skills/data-model/SKILL.md` for agents that load the historical `DATA_MODEL_SKILL.md` path.

Canonical source for GD1 table/type/constraint details:

- `docs/database/GD1_DOCUMENT_ERD.md`

Canonical GD1 chain:

```text
purchase_request
  -> purchase_request_line
  -> purchase_order_line
  -> shipment_line
  -> shipment
  -> shipment_milestone
  -> shipment_cost
  -> purchase_order_line.landed_cost_alloc
```

Core GD1 tables:

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

Use GD1 statuses from `GD1_DOCUMENT_ERD.md`. Do not introduce older PR/PO/DO status names unless working on runtime compatibility.

Runtime compatibility note:

- Existing code may still use `delivery_orders` and `DO`. Treat these as compatibility aliases for GD1 `shipment`.
- New docs and migration plans should use `shipment`.

Reliability note:

- Core transactional entities should carry `version` for optimistic locking.
- Create-style POST APIs should use tenant-scoped idempotency keys.
- ERP/WMS/internal events should use transactional outbox before external delivery.
- Webhook, polling, email parsing, and SFTP batch inputs should be captured in inbox/raw integration tables before applying canonical GD1 updates.
- Audit and state-transition logs are append-only.
