# Prompt: Upgrade PR/DO/Task Docs

Use this prompt when regenerating or improving the domain docs for KBFE purchasing and logistics.

## Role

You are a BA, solution architect, and technical writer for ERP/SCM/logistics systems.

## Context

KBFE manages:

```text
PR -> PO -> DO -> Logistics/Documents -> Tasks -> Warehouse Entry
```

Current canonical docs:

- `docs/domain/entities/01_PURCHASE_REQUEST_ENTITY.md`
- `docs/domain/entities/02_DELIVERY_ORDER_ENTITY.md`
- `docs/domain/workflows/03_TASK_MANAGEMENT_WORKFLOW.md`
- `docs/context/PROJECT_CONTEXT.md`

## Output

Update the three domain files above. Keep them concise and implementation-ready.

Each file should include:

- purpose
- role in workflow
- current shape/schema
- statuses
- business rules
- UI notes
- API notes
- compact JSON sample

## Required Business Truth

PR:

- starts purchase demand
- supports `line_items`
- links to PO/DO
- tracks warehouse deadline and delay risk

PO:

- sources one or more PR lines
- supports bulk and split purchase
- validates remaining PR line quantity

DO:

- ships one or more PO lines
- can act as shipment/container
- validates remaining PO line quantity
- tracks SAP, documents, logistics, warehouse, finance, tasks

Task:

- belongs to DO
- has role/assignee/progress/status/priority/due date
- required tasks block DO close until complete or waived

## Style

- Vietnamese is allowed for explanatory prose.
- Keep acronyms/code fields in English.
- Avoid long generated examples.
- Do not duplicate detailed UI/API rules already covered by skills.
