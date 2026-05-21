---
name: kbfe-backend-api
description: Use when designing or implementing KBFE backend services, REST APIs, validation, persistence, SAP sync boundaries, and frontend mock-to-real API migration.
---

# KBFE Backend/API Skill

## Goal

Backend is the source of truth for PR, PO, DO, tasks, deadlines, documents, finance/tax, SAP sync state, and business-flow validation.

For SLA timers, customs lane behavior, eFMS transport data, SOP codes, and two-touch finance-note rules, keep API behavior aligned with `docs/context/OPERATING_MODEL.md` and `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`.

## Current Boundary

- `server/index.ts` is bootstrap only: middleware, auth setup, route mounting, and listen/start.
- API routes live in `server/modules/<domain>/routes.ts` with service wrappers in `service.ts`.
- Persistence uses normalized PostgreSQL tables. Legacy helper names `readSnapshot`/`writeSnapshot` are backed by `server/services/normalizedStore.ts`.
- Shared backend behavior lives in `server/services/`, including `logistics*.ts`, `sop*.ts`, `exchangeRates.ts`, and reporting/transform helpers.
- Frontend calls through `src/api/logistics.ts`, which is kept compatible while shared implementation lives under `src/shared/api`.
- Keep legacy fields while moving write flows to `sourceLines[]`.

## API Style

Prefer REST with stable frontend contracts:

| Method | Path | Purpose |
|---|---|---|
| `GET/POST/PATCH` | `/api/purchase-requests` | PR list/create/update |
| `GET/POST` | `/api/purchase-orders` | PO list/create from PR source lines |
| `GET/POST/PATCH` | `/api/delivery-orders` | DO list/create/update from PO source lines |
| `GET/PATCH` | `/api/tasks` | Task list/update |
| `GET` | `/api/dashboard/stats` | Metrics and `businessFlowCounts` |
| `GET` | `/api/search` | Global entity search |
| `GET/POST` | `/api/users` | User list/create |

Future actions:

- PR submit/approve/reject.
- PO/DO SAP sync.
- Document upload.
- eFMS booking/container update.
- eFMS Manifest, Shipping Instruction, and HBL update.
- Job attachment and KBI Drive dossier upload.
- Customs declaration lane update.
- Debit Note OF/AF and Final Debit Note issuance.
- DO close gate.
- Audit/event log.

## Query Filters

Support filters matching UI workflows:

- `search`, `status`, `priority`, `role`, `assignee_id`
- `risk_only`, `required_only`
- `pr`, `po`, `do`
- `warehouse_code`
- `date_from`, `date_to`
- later: `page`, `page_size`, `sort`

## Write Payloads

PO create:

```ts
{
  sourceLines: [{ prCode, prLineId, quantity }],
  supplierCode,
  supplierName,
  totalAmount,
  currency,
  warehouseCode
}
```

DO create:

```ts
{
  sourceLines: [{ poNumber, poLineId, quantity }],
  shippingMethod,
  warehouseDeadline,
  documentsList
}
```

Legacy payloads (`sourcePrCode`, `poNumber`, `requestCode`) may still create simple 1-1-1 records.

## Validation

Backend must enforce:

- PR can create PO only when `APPROVED` or partially sourced with remaining quantity.
- PO source quantities cannot exceed remaining PR line quantities, including duplicate lines in the same payload.
- DO source quantities cannot exceed remaining PO line quantities, including duplicate lines in the same payload.
- DO header quantity must match source line total when `sourceLines[]` is used.
- `DELIVERED` requires `actual_entry_date`.
- Missing Invoice, Packing List, or B/L blocks customs readiness.
- Final B/L confirmation requires Draft B/L, Commercial Invoice, Packing List, and quotation data to match.
- Shipping Instruction requires gross weight and CBM greater than 0.
- HBL must be linked to the DO/eFMS job before final document closure.
- LCL booking may auto-continue as accepted after 2 hours of customer silence.
- Selling charges cannot be edited or deleted after confirmation; Buying charges can be adjusted by authorized users.
- Debit Note OF/AF and Final Debit Note must remain separate finance events.
- Task progress/status/blocker rules from data model skill.

## Derived Fields

Backend should calculate:

- delay/risk fields
- task completion summary
- document readiness
- document match state
- SLA overdue state for quotation, port verification, and Debit Note OF/AF issuance
- PR/PO/DO `flow_tags`
- dashboard `businessFlowCounts`

## SAP And Audit

- Keep external SAP behind a service/adapter.
- Persist sync attempts with status, request metadata, response metadata, error, actor/scheduler, timestamps.
- Do not overwrite local operational fields without conflict handling.
- Audit all status changes, writes, document changes, task changes, sync attempts, and close attempts.

## Done

- API validates all business rules.
- Errors distinguish validation, permission, not found, and integration failure.
- Frontend types remain compatible.
- Mutations update linked PR/PO/DO/task state consistently.
