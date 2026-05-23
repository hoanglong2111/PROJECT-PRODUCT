---
name: kbfe-data-model
description: Use when defining or changing KBFE domain entities, TypeScript types, database schemas, OpenAPI schemas, enums, relationships, derived fields, validation rules, fixtures, or migration plans for PR, PO, DO, tasks, suppliers, warehouse, documents, finance, and SAP sync.
---

# KBFE Data Model Skill

## Goal

Keep entity definitions consistent across frontend mock data, backend persistence, API contracts, MCP resources, and documentation.

## Entity Relationship

```text
PurchaseRequest 1..n PurchaseOrder through source_pr_codes
PurchaseOrder    1..n DeliveryOrder
PurchaseRequest  1..n DeliveryOrder through request_code / linked_do_numbers
DeliveryOrder    1..n LogisticsTask
DeliveryOrder    1..n DocumentRecord
DeliveryOrder    0..n FinanceTaxRecord
Warehouse        1..n PurchaseRequest
Warehouse        1..n DeliveryOrder
Supplier         1..n PurchaseOrder
Supplier         1..n DeliveryOrder through SAP sync
User             1..n LogisticsTask through assignee
```

The current frontend stores some relationships redundantly for convenience. Backend design should normalize relationships and return denormalized summaries for screens.

## Required Entity Families

Current:

- PurchaseRequest.
- PurchaseOrder.
- DeliveryOrder.
- LogisticsTask.
- UserRef.

Future:

- Supplier.
- Warehouse.
- Material.
- DocumentRecord.
- FinanceTaxRecord.
- SapSyncLog.
- AuditEvent.
- ClosureGateResult.
- RiskSummary.

## Enums

Use current frontend values unless migration is intentional.

### Priority

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### PurchaseRequestStatus

- `NEW`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `CONVERTED_TO_PO`
- `CANCELLED`

### PurchaseOrderStatus

- `SAP_SYNCED`
- `SAP_PENDING`
- `PARTIALLY_DELIVERED`
- `CLOSED`

### DeliveryOrderStatus

- `CREATED`
- `CONFIRMED`
- `IN_PRODUCTION`
- `IN_TRANSIT`
- `ARRIVED_PORT`
- `CUSTOMS_PROCESSING`
- `WAREHOUSE_PENDING`
- `DELIVERED`
- `DELAYED`
- `CANCELLED`

### TaskStatus

- `TODO`
- `IN_PROGRESS`
- `WAITING`
- `BLOCKED`
- `COMPLETED`
- `CANCELLED`

### TaskRole

- `PIC Manager`
- `Sale Staff`
- `Port Officer`
- `Customs Officer`
- `Finance Officer`
- `Warehouse Staff`

## Key Business Codes

Use internal immutable ids plus human-readable business codes:

- PR: `id` plus `requested_order_id`.
- PO: `id` plus `po_number`.
- DO: `id` plus `order_info.order_number`.
- Task: `task_id`.

Do not use mutable display names as relationship keys.

## Derived Fields

Treat these as backend-calculated once APIs exist:

- `delay_days`
- `is_late`
- `delay_type`
- `risk_reasons`
- `task_summary`
- `document_readiness`
- `closure_gate`
- PR fulfillment status across multiple DOs.

Frontend mock data may store them temporarily for UI development.

## Delay Calculation

Basis:

```text
actual_entry_date ?? planned_entry_date/expected_arrival_date
```

Rules:

- Actual entry beats forecast.
- Positive days means late.
- Zero means due on deadline.
- Negative means early or still before deadline.
- No basis date means unknown.

Recommended backend response:

```json
{
  "delay_days": 2,
  "delay_type": "forecast",
  "is_late": true,
  "basis_date": "2026-06-17",
  "warehouse_deadline": "2026-06-15"
}
```

## Validation Rules

PR:

- `item_code`, `quantity`, `unit`, `warehouse_deadline_date`, and `production_contract_number` required for approval.
- `quantity > 0`.
- `CANCELLED` PR cannot create PO or DO.
- `CONVERTED_TO_PO` should lock key demand fields unless manager override exists.

PO:

- Source PR must exist.
- Supplier should resolve to master data or SAP sync incomplete.
- Multiple DOs cannot exceed PO quantity when item quantity is enforced.

DO:

- `DELIVERED` requires `actual_entry_date`.
- Customs readiness requires required documents.
- Close requires required tasks completed or waived.
- Missing supplier code or PO marks SAP sync incomplete.

Task:

- Progress must be `0..100`.
- `COMPLETED` requires `progress = 100`.
- `BLOCKED` requires `blocked_reason`.
- Required closure tasks block DO close until complete or waived.

## Fixture Rules

Mock fixtures should include:

- one on-time PR/DO chain.
- one forecast-late chain.
- one actual-late delivered chain.
- one missing-documents chain.
- one incomplete SAP sync chain.
- one blocked task.
- one approved PR without PO/DO.

This keeps Dashboard, Workflow, PR, PO, DO, and Task screens visibly testable.

## Migration Rules

- Change TypeScript types and docs together.
- Add backend schema migrations with explicit default/backfill behavior.
- Keep old field names available during frontend migration if possible.
- Update MCP resource payloads after API shape changes.
- Update tests for derived fields and validation rules.

## Done Checklist

- TypeScript type, API schema, database schema, docs, fixtures, and UI usage agree.
- Relationship keys are stable business codes or immutable ids.
- Derived fields have one source of truth.
- Validation rules exist backend-side before enabling write UI.
