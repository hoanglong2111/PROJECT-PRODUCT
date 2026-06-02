---
name: workflow-businessflow-builder
description: Use to turn GD1 business requirements, entity docs, ERP/SCM/logistics notes, or UI/API specs into workflow documentation with actors, states, rules, UI touchpoints, backend mapping, SLA, and QA checks.
---

# GD1 Workflow Businessflow Builder

## Purpose

Create workflow docs that answer: who does what, when, with which data, on which screen/API, and what blocks completion.

For GD1, the baseline flow is:

```text
PR -> Approval -> PO -> Shipment -> 10 Milestones -> Documents + Landed Cost -> ERP/GRN Sync
```

Use `docs/context/OPERATING_MODEL.md` for state machines, hard rules, SLA timers, and integration events.

## Use When

- Creating PR, approval, PO, shipment, milestone, landed-cost, or task workflow docs.
- Converting GD1 business notes into implementation-ready flow.
- Building swimlanes, state transitions, UI/API mapping, or QA acceptance.
- Documenting risk, deadline, escalation, task blockers, missing documents, over-shipment, or landed-cost allocation.

## Output Shape

For large flows, produce:

- scope/non-scope
- trigger and completion criteria
- actor matrix
- happy path
- exception/alternate flows
- state transition matrix
- business rules
- UI touchpoints
- backend/API mapping
- data dependencies
- notifications/escalation
- QA acceptance
- assumptions and conflicts

## Workflow Method

1. Extract GD1 entities, actors, states, deadlines, tasks, rules.
2. Define start, end, and closure gate.
3. Write high-level flow before screen detail.
4. Separate happy path from exceptions.
5. Map each step to UI, API/service, and data mutation.
6. Add risk/escalation rules for deadlines, blockers, missing docs, shipment delay, over-shipment, or approval timeout.
7. Add SLA timers from `docs/context/OPERATING_MODEL.md`.
8. Add QA checks.
9. List assumptions and conflicts.

## GD1 Flow Tags

Use these tags in docs and UI filters when helpful:

- `LINEAR`: 1 PR -> 1 PO -> 1 Shipment
- `SPLIT_PURCHASE`: 1 PR -> N PO
- `PARTIAL_CONVERSION`: PR line partially converted to PO
- `PARTIAL_SHIPMENT`: 1 PO line -> N Shipments
- `CONSOLIDATED_SHIPMENT`: N PO lines -> 1 Shipment

## Quality Bar

- Actor and ownership are clear.
- Every status transition has a condition.
- UI/API mapping does not claim future endpoints are already implemented.
- Closure gates list exact blockers.
- QA can test the flow without extra interpretation.
