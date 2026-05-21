---
name: kbfe-data-model
description: Use when changing KBFE entities, TypeScript types, API schemas, validation rules, fixtures, derived fields, or persistence for PR, PO, DO, tasks, SAP, warehouse, finance, and documents.
---

# KBFE Data Model Skill

## Goal

Keep frontend types, normalized PostgreSQL tables, API payloads, docs, fixtures, and UI assumptions aligned.

Load `docs/context/OPERATING_MODEL.md` and `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md` when changing SLA timers, SAP/eFMS fields, SOP codes, customs lanes, finance-note sequencing, or hard logistics rules.

## Relationship Model

```text
PurchaseRequest 1..n PurchaseRequestLineItem
PurchaseRequestLineItem 0..n PurchaseOrderLineItem
PurchaseOrder 1..n PurchaseOrderLineItem
PurchaseOrderLineItem 0..n DeliverySourceLine
DeliveryOrder 1..n DeliverySourceLine
DeliveryOrder 1..n LogisticsTask
```

Current implementation keeps denormalized links for UI speed:

- PR: `linked_po_numbers`, `linked_do_numbers`
- PO: `source_pr_codes`, `linked_do_numbers`
- DO: legacy `request_code`/`po_number` plus canonical `source_lines`

## Core Types

Required now:

- `PurchaseRequest`
- `PurchaseRequestLineItem`
- `PurchaseOrder`
- `PurchaseOrderLineItem`
- `DeliveryOrder`
- `DeliverySourceLine`
- `LogisticsTask`
- `UserRef`
- `BusinessFlowTag`

Future modules:

- Supplier, Warehouse, Material, DocumentRecord, eFmsTransportRecord, ShippingInstruction, HouseBill, ContainerRecord, FinanceTaxRecord, SapSyncLog, AuditEvent, ClosureGateResult, CustomsDeclaration.

## Stable Keys

Use immutable ids plus business codes:

| Entity | Business key |
|---|---|
| PR | `requested_order_id` |
| PR line | `line_items[].id` |
| PO | `po_number` |
| PO line | `line_items[].id` |
| DO | `order_info.order_number` |
| DO source line | `source_lines[].id` |
| Task | `task_id` |

Do not use display names as relationship keys.

## Important Enums

- Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- PR status: `NEW`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CONVERTED_TO_PO`, `CANCELLED`
- PO status: `SAP_SYNCED`, `SAP_PENDING`, `PARTIALLY_DELIVERED`, `CLOSED`
- DO status: `CREATED`, `CONFIRMED`, `IN_PRODUCTION`, `IN_TRANSIT`, `ARRIVED_PORT`, `CUSTOMS_PROCESSING`, `WAREHOUSE_PENDING`, `DELIVERED`, `DELAYED`, `CANCELLED`
- Task status: `TODO`, `IN_PROGRESS`, `WAITING`, `BLOCKED`, `COMPLETED`, `CANCELLED`
- Flow tag: `LINEAR`, `BULK_PURCHASE`, `SPLIT_PURCHASE`, `PARTIAL_DELIVERY`, `CONTAINER_CONSOLIDATION`
- Customs lane: `GREEN`, `YELLOW`, `RED`
- Charge type: `SELLING`, `BUYING`, `OBH`

## Derived Fields

Backend should own:

- `delay_days`, `delay_type`, `is_late`
- risk reasons
- document readiness
- B/L, Commercial Invoice, Packing List, and quotation match state
- SLA overdue state
- `task_summary`
- PR fulfillment status
- PR/PO/DO `flow_tags`
- dashboard `businessFlowCounts`

## Validation Rules

PR:

- Required for approval: item, quantity, unit, warehouse deadline, production contract.
- Quantity must be greater than zero.
- `CANCELLED` cannot create PO/DO.
- `CONVERTED_TO_PO` should lock core demand fields unless manager override exists.

PO:

- Source PR and PR line must exist.
- Source quantity cannot exceed remaining PR line quantity.
- Multi-source PO is valid for bulk purchase.

DO:

- Source PO and PO line must exist.
- Source quantity cannot exceed remaining PO line quantity.
- Multi-source DO is valid when DO acts as shipment/container.
- `DELIVERED` requires `actual_entry_date`.
- Missing supplier/PO data marks SAP sync incomplete.
- Missing Invoice, Packing List, or B/L blocks customs readiness.
- Final B/L confirmation requires Draft B/L, Commercial Invoice, Packing List, and quotation data to match.
- Shipping Instruction requires `gross_weight > 0` and `cbm > 0`.
- HBL must be linked to the DO/eFMS job before final document closure.
- Selling charges lock after confirmation; Buying charges may be adjusted by authorized users.
- International freight Debit Note OF/AF must remain separate from final inland/local charges.

Task:

- Progress must be `0..100`.
- `COMPLETED` requires progress 100.
- `BLOCKED` requires `blocked_reason`.
- Required tasks block DO close until complete or waived.

## Fixture Coverage

Seed data should visibly include:

- on-time chain
- forecast-late chain
- actual-late delivered chain
- missing documents
- incomplete SAP sync
- blocked task
- approved PR without PO
- all five business flow tags
- eFMS booking/container fields
- customs green/yellow/red examples
- two-touch Debit Note examples

## Done

- Types, API payloads, backend validation, fixtures, docs, and UI agree.
- Derived fields have one source of truth.
- Backward-compatible legacy fields remain until all callers migrate.
