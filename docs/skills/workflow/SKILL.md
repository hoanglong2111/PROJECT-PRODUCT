---
name: workflow-businessflow-builder
description: Use to turn business requirements, entity docs, ERP/SCM/logistics notes, or UI/API specs into workflow and business-flow documentation with actors, states, rules, UI touchpoints, backend mapping, and QA checks.
---

# Workflow Businessflow Builder

## Purpose

Create workflow docs that answer: who does what, when, with which data, on which screen/API, and what blocks completion.

For KBFE logistics relay, hard rules, SLA timers, SAP/eFMS, customs lanes, and finance-note sequencing, use `docs/context/OPERATING_MODEL.md` as the operating truth.

## Use When

- Creating PR/PO/DO/task workflow docs.
- Converting business notes into implementation-ready flow.
- Building swimlanes, state transitions, UI/API mapping, or QA acceptance.
- Documenting risk, deadline, escalation, or closure-gate rules.

Do not use for pure code debugging, visual UI design, or database schema work unless workflow is the main input.

## Required Inputs

At least one:

- business description
- entity doc
- actors/roles
- states
- business rules
- UI/API notes

Add assumptions when actor/state/API details are missing.

## Output Shape

For large flows, produce sections:

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
- AI/RAG notes if useful

## Workflow Method

1. Extract entities, actors, states, deadlines, tasks, rules.
2. Define start, end, and closure gate.
3. Write high-level flow before screen detail.
4. Separate happy path from exceptions.
5. Map each step to UI, API/service, and data mutation.
6. Add risk/escalation rules for deadlines, blockers, missing docs, or SAP sync.
7. Add SLA timers, hard rules, and finance/document gates from the operating model when relevant.
8. Add QA checks.
9. List assumptions and conflicts.

## KBFE Flow Tags

Use these canonical tags:

- `LINEAR`: 1 PR -> 1 PO -> 1 DO
- `BULK_PURCHASE`: N PR -> 1 PO -> 1 DO
- `SPLIT_PURCHASE`: 1 PR -> N PO -> N DO
- `PARTIAL_DELIVERY`: 1 PR -> 1 PO -> N DO
- `CONTAINER_CONSOLIDATION`: N PR -> N PO -> 1 DO

## Quality Bar

- Actor and ownership are clear.
- Every status transition has a condition.
- UI/API mapping does not claim future endpoints are already implemented.
- Closure gates list exact blockers.
- QA can test the flow without extra interpretation.
