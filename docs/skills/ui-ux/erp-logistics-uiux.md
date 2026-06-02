---
name: erp-logistics-uiux-doc-builder
description: Use to generate or refactor ERP/SCM/logistics UI/UX specs and React implementations for GD1 PR, Approval, PO, Shipment, Milestones, Tasks, Supplier, Workflow, ERP sync, and landed-cost risk.
---

# GD1 ERP Logistics UI/UX Documentation Builder

## Scope

Use this for GD1 ERP logistics screens and docs around:

```text
PR -> Approval -> PO -> Shipment -> 10 Milestones -> Documents + Costs -> ERP/GRN Sync
```

Keep UI language Vietnamese unless asked otherwise. Keep field names, route names, component names, and acronyms (`PR`, `PO`, `ETA`, `ETD`, `ATD`, `ATA`, `B/L`, `AWB`) in English.

## Tech Contract

Use existing project stack only:

- Mantine for UI primitives.
- Tabler Icons for icons.
- TanStack Query for server state.
- Zustand for UI filters/preferences.
- React Router query params for shareable context.
- Axios/API helpers through `src/api/*` or `src/shared/api`.

## ERP Design Rules

- Dense, quiet, operational, scan-first.
- Tables for lists; drawers/tabs/timelines for detail.
- Cards only for metrics, repeated items, drawers/modals, framed tools.
- Every action must map to an entity and workflow step.
- Disabled actions need visible reason.
- Every icon-only action needs tooltip and `aria-label`.

## Deep Links

Preferred GD1 context params:

```text
/purchase-requests?pr=...
/purchase-orders?po=...
/delivery-orders?shipment=...
/tasks?po=...
/tasks?task=...
/workflow?shipment=...
/workflow?pr=...
```

Legacy `do` params may remain until runtime route migration.

## Screen Requirements

PR:

- Show PR lines, approval state, required date, total amount, conversion progress, linked PO.
- Filters: all, pending approval, approved, rejected, partially converted, converted, cancelled.

PO:

- Show supplier, revision, source PR lines, status, ETA/ETD, shipment progress, landed-cost summary.
- Filters: all, sent, confirmed, in production, ready to ship, shipped, received, cancelled.

Shipment:

- Show PO lines, mode, forwarder, B/L/AWB, route, ETA/ATA, customs stream, milestone progress, missing documents, cost status.
- Detail tabs: Overview, Lines, Milestones, Documents, Customs, Costs, Tasks, Audit.

Tasks:

- Show PO stage, task name, assignee, due date, blocker, linked milestone, status.
- Filters: assignee, status, PO stage, overdue, blocked.

Workflow:

- Show compact PR -> PO -> Shipment -> milestone/cost/task chain.
- Preserve entity ids, direct links, and risk reasons.

Dashboard:

- Show approval queue, shipment risk, PO ETA risk, task workload, cost allocation attention, and SLA breach list.

## Risk UX

Risk reasons must be concrete:

- approval overdue
- PO ETA passed without ATD
- milestone overdue
- missing required document
- shipment line exceeds tolerance
- landed cost pending allocation
- task blocked or overdue
- customs stream yellow/red

## Done

- Entity, status, owner, deadline, risk, next action are visible in one scan.
- Detail opens from query param and closes without reopening.
- Loading, empty, error, disabled, and permission states are handled.
- Mutations show loading/error/success and invalidate related queries.
- Layout remains readable on desktop and mobile.
