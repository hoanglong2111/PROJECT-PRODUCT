---
name: erp-logistics-uiux-doc-builder
description: Use to generate or refactor ERP/SCM/logistics UI/UX specs and React implementations for PR, PO, DO, Tasks, Supplier, Warehouse, Workflow, SAP sync, and warehouse risk.
---

# ERP Logistics UI/UX Documentation Builder

## Scope

Use this for ERP logistics screens and docs around:

```text
PR -> PO -> DO -> Documents -> Tasks -> Warehouse Entry -> Closure
```

Keep UI language Vietnamese unless asked otherwise. Keep field names, route names, component names, and acronyms (`PR`, `PO`, `DO`, `SAP`, `ETA`, `ETD`) in English.

## Business Flow Tags

- `LINEAR`: 1 PR -> 1 PO -> 1 DO
- `BULK_PURCHASE`: N PR -> 1 PO -> 1 DO
- `SPLIT_PURCHASE`: 1 PR -> N PO -> N DO
- `PARTIAL_DELIVERY`: 1 PR -> 1 PO -> N DO
- `CONTAINER_CONSOLIDATION`: N PR -> N PO -> 1 DO, where DO is shipment/container

## Tech Contract

Use existing project stack only:

- Mantine for UI primitives.
- Tabler Icons for icons.
- TanStack Query for server state.
- Zustand for UI filters/preferences.
- React Router query params for shareable context.
- Axios/API helpers through `src/api/*`.

State ownership:

- Server data: TanStack Query.
- Filters/preferences: Zustand.
- Entity focus: URL query params.
- Temporary form/UI state: component state.

## ERP Design Rules

- Dense, quiet, operational, scan-first.
- Tables for lists; drawers/tabs for detail.
- Cards only for metrics, repeated items, drawers/modals, framed tools.
- Do not nest cards inside cards.
- Every action must map to an entity and workflow step.
- Disabled actions need visible reason.
- Every icon-only action needs tooltip and `aria-label`.

## Semantic Color

| Meaning | Color |
|---|---|
| completed/synced/delivered | teal |
| active/in progress | blue/cyan |
| pending/waiting/near deadline | yellow/orange |
| blocked/missing/late/failed | red |
| cancelled/unknown | gray/dark |

Pair color with text; never rely on color alone.

## Deep Links

Supported context params:

```text
/purchase-requests?pr=...
/purchase-orders?po=...
/delivery-orders?do=...
/delivery-orders?pr=...
/tasks?do=...
/tasks?task=...
/workflow?do=...
/workflow?pr=...
```

Closing detail removes only its own param. Cross-entity links use `EntityLink`.

## Screen Requirements

PR:

- Show line items, source/fulfillment status, flow tags, deadline risk, linked PO/DO.
- Filters: all, ready for PO, partially sourced, fully sourced, split purchase, risk.

PO:

- Show supplier, SAP status, source PR lines, linked DO, flow tags.
- Filters: all, single source, bulk PR, awaiting DO, partial delivery, closed, SAP issues.

DO:

- Treat multi-source DO as shipment/container.
- Show source lines, route, ETA, warehouse deadline, docs, tasks, SAP state, risk, flow tags.
- Filters: all, single, partial, container, issues.

Tasks:

- Show parent DO/PR/PO, role, assignee, progress, due date, blocker, required flag.
- Filters: status, role, required-only, context PR/DO, flow tag.

Workflow:

- Show compact PR -> PO -> DO -> docs/tasks/warehouse chain.
- Tabs: all, 1-1-1, bulk, split, partial, container, issues.

Dashboard:

- Show counts, risk queue, flow distribution, and quick links into filtered Workflow.

## Risk UX

Risk reasons must be concrete:

- missing required document
- ETA/planned entry after warehouse deadline
- actual entry late
- required task incomplete
- task blocked
- SAP sync incomplete/failed

## Done

- Entity, status, owner, deadline, risk, next action are visible in one scan.
- Detail opens from query param and closes without reopening.
- Loading, empty, error, disabled, and permission states are handled.
- Mutations show loading/error/success and invalidate related queries.
- Layout remains readable on desktop and mobile.
