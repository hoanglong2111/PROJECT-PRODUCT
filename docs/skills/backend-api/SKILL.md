---
name: kbfe-backend-api
description: Use when designing or implementing KBFE GD1 backend services, REST APIs, validation, persistence, ERP sync boundaries, and frontend API migration.
---

# KBFE GD1 Backend/API Skill

## Goal

Backend is the source of truth for GD1 PR approval, PO lifecycle, shipment milestones, quantity validation, landed cost, PO-stage tasks, SLA state, ERP sync, and audit.

Load:

1. `docs/context/PROJECT_CONTEXT.md`
2. `docs/context/OPERATING_MODEL.md`
3. `docs/database/GD1_DOCUMENT_ERD.md`
4. Relevant module workflow docs under `docs/modules/`

## Current Boundary

- `backend/server.ts` is bootstrap only.
- API routes live in `backend/routes/<domain>.routes.ts`; controllers handle HTTP, services own business rules, and models own persistence.
- Persistence uses PostgreSQL tables, but current runtime may still use `delivery_orders` for the GD1 shipment concept.
- Keep compatibility fields until frontend and backend migrate together.

## Local Dev Watcher Troubleshooting

When `pnpm --dir backend dev` fails with:

```text
Error: ENOSPC: System limit for number of file watchers reached
```

treat it as Linux inotify watcher exhaustion, not a route/module bug. The path in the stack trace is usually just the file that `tsx watch` failed to register.

Immediate workaround:

```bash
pnpm --dir backend exec tsx server.ts
```

This starts `backend/server.ts` without watch mode. Production-style startup requires a build first:

```bash
pnpm --dir backend build
pnpm --dir backend start
```

Local machine fix:

```bash
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl fs.inotify.max_user_instances=1024
```

Persistent local machine fix:

```bash
printf "fs.inotify.max_user_watches=524288\nfs.inotify.max_user_instances=1024\n" | sudo tee /etc/sysctl.d/99-kbfe-inotify.conf
sudo sysctl --system
```

After applying the OS-level fix, retry:

```bash
pnpm --dir backend dev
```

Do not refactor backend routes or reduce imports to fix this error unless the watcher limit has already been ruled out.

## API Style

Prefer REST with stable frontend contracts:

| Method | Path | Purpose |
|---|---|---|
| `GET/POST/PATCH` | `/api/v1/purchase-requests` | PR list/create/update |
| `POST` | `/api/v1/purchase-requests/{id}/submit` | Submit PR for approval |
| `POST` | `/api/v1/purchase-requests/{id}/approve` | Approve PR step |
| `POST` | `/api/v1/purchase-requests/{id}/reject` | Reject PR |
| `POST` | `/api/v1/purchase-requests/{id}/convert-to-po` | Convert approved PR lines |
| `GET/POST/PATCH` | `/api/v1/purchase-orders` | PO list/create/update |
| `PUT` | `/api/v1/purchase-orders/{id}/revise` | Create PO revision |
| `POST` | `/api/v1/purchase-orders/{id}/send` | Mark PO sent |
| `POST` | `/api/v1/purchase-orders/{id}/confirm` | Supplier confirmation |
| `GET/POST/PATCH` | `/api/v1/shipments` | Shipment list/create/update |
| `PATCH` | `/api/v1/shipments/{id}/milestones/{code}` | Update milestone |
| `POST` | `/api/v1/shipments/{id}/documents` | Upload milestone document |
| `POST` | `/api/v1/shipments/{id}/costs` | Add landed-cost component |
| `GET` | `/api/v1/tasks` | My tasks |
| `GET/POST/PATCH` | `/api/v1/task-templates` | Task template management |

Legacy route names such as `/api/delivery-orders` may exist while migration is incomplete.

## Write Payloads

Shipment create:

```ts
{
  mode: 'SEA' | 'AIR',
  forwarder_id?: string,
  carrier?: string,
  vessel_flight?: string,
  bl_awb_no?: string,
  container_no?: string[],
  pol?: string,
  pod?: string,
  etd?: string,
  eta?: string,
  po_lines: [{ purchase_order_line_id: string, qty_shipped: number, lot_no?: string }]
}
```

Milestone update:

```ts
{
  actual_date: 'YYYY-MM-DD',
  note?: string,
  source?: 'MANUAL' | 'API' | 'EMAIL',
  documents?: [{ file_ref: string, doc_type: 'INVOICE' | 'PACKING_LIST' | 'BL' | 'CO' | 'CUSTOMS_DECL' | 'AWB' | 'OTHER' }]
}
```

Cost create:

```ts
{
  cost_type: 'FREIGHT' | 'INSURANCE' | 'CUSTOMS_DUTY' | 'VAT' | 'LOCAL_CHARGES' | 'DEMURRAGE' | 'OTHER',
  amount: number,
  currency_code: string,
  exchange_rate: number,
  alloc_method: 'BY_VALUE' | 'BY_WEIGHT' | 'BY_QTY',
  invoice_ref?: string
}
```

## Validation

Backend must enforce:

- PR status transitions from the GD1 operating model.
- Approval route exists before PR submit.
- PR line `qty_converted` never exceeds `qty_requested`.
- PO line source quantity never exceeds remaining PR line quantity.
- PO revision increments after `SENT` or `CONFIRMED` edits.
- Shipment line quantity never exceeds PO tolerance.
- Shipment creation generates exactly 10 milestones.
- Milestone code/sequence uniqueness.
- `EDO_DELIVERY.actual_date` is required for shipment `DELIVERED`.
- Cost amount and exchange rate are non-negative/positive as defined in ERD.
- Landed cost recalculates after cost changes.
- Task `DONE` and `BLOCKED` metadata rules.

## Derived Fields

Backend should calculate:

- PR total amount and conversion progress
- PO shipped/received/fulfillment progress
- shipment status from milestone actual dates
- milestone progress and missing-document state
- landed cost allocation
- task overdue/blocker state
- SLA overdue state
- dashboard risk reasons

## ERP, Events, And Audit

- Confirmed PO syncs to ERP.
- PO revision emits ERP update or outbox event.
- `EDO_DELIVERY.actual_date` emits `shipment.arrived_at_warehouse`.
- Persist audit for approval, PO revision, shipment milestone, cost, task status, ERP sync, and manual override.

## Production Reliability Contract

Backend implementation must treat these as production gates:

- Transactional outbox: enqueue ERP, WMS/GD2, and internal events in the same transaction as the state change. Publisher delivery to Kafka/RabbitMQ/REST is separate from the business write.
- Idempotency: create-style POST APIs must require or receive `Idempotency-Key`, persist request hash/result, replay completed identical requests, and return conflict for key reuse with a different payload.
- Optimistic locking: versioned update APIs should require the caller's expected `version` or `If-Match` equivalent and reject stale writes.
- Immutable audit/state logs: approval actions, PO revisions, milestone updates, cost changes, task status changes, and manual overrides must write append-only records with before/after snapshots.
- Integration input capture: webhook, polling, email parsing, and SFTP batch ingestion should store raw/inbox events idempotently before applying canonical milestone/status updates.
- Scheduler jobs: SLA scans, overdue task detection, carrier polling, aggregate refresh, and outbox publishing should have observable job metadata and retry state.
- Landed-cost allocation: add/update/delete of shipment costs must run in a transaction and recalculate affected PO-line allocations by `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY`.
- Tenant isolation: every production query/mutation must be scoped by `tenant_id`; hardcoded tenant fallbacks are development-only.

## Done

- API validates GD1 business rules.
- Errors distinguish validation, permission, not found, state conflict, and integration failure.
- Frontend types remain compatible.
- Mutations update related PR/PO/shipment/task/dashboard state consistently.
- Reliability gates above are either implemented for the touched route or explicitly documented as pending before production release.
