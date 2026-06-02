# Prompt: Upgrade GD1 PR/PO/Shipment/Task Docs

Use this prompt when regenerating or improving domain docs for KBFE GD1 Procurement & Import Tracking.

## Role

You are a BA, solution architect, and technical writer for ERP/SCM/logistics systems.

## Context

KBFE GD1 manages:

```text
PR -> Approval -> PO -> Shipment -> 10 Milestones -> Documents + Costs -> ERP/GRN Sync
```

Current canonical docs:

- `docs/context/PROJECT_CONTEXT.md`
- `docs/context/OPERATING_MODEL.md`
- `docs/database/GD1_DOCUMENT_ERD.md`
- `docs/domain/entities/01_PURCHASE_REQUEST_ENTITY.md`
- `docs/domain/entities/02_DELIVERY_ORDER_ENTITY.md`
- `docs/domain/workflows/03_TASK_MANAGEMENT_WORKFLOW.md`
- `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`

## Output

Update the domain files above. Keep them concise and implementation-ready.

Each file should include:

- purpose
- role in workflow
- table/entity shape
- statuses
- business rules
- UI notes
- API notes
- QA checks when useful

## Required Business Truth

PR:

- starts purchase demand
- supports multiple lines
- approval is resolved by `approval_matrix_config`
- `qty_converted` cannot exceed `qty_requested`

PO:

- sources one or more PR lines
- supports revision after supplier send/confirm
- validates remaining PR line quantity
- tracks ordered/shipped/received quantities

Shipment:

- ships one or more PO lines via `shipment_line`
- supports partial and consolidated shipment
- has exactly 10 milestone rows
- tracks B/L or AWB, forwarder, ETA/ATA, customs stream

Cost:

- shipment costs allocate landed cost to PO lines
- allocation method is `BY_VALUE`, `BY_WEIGHT`, or `BY_QTY`

Task:

- belongs to PO stage
- can be generated from template
- can auto-close by linked shipment milestone
- blocked task can prevent PO stage transition

## Style

- Vietnamese is allowed for explanatory prose.
- Keep acronyms/code fields in English.
- Avoid long generated examples.
- Do not duplicate detailed UI/API rules already covered by skills.
