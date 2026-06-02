# Dashboard UI/UX Module

Use this when designing or changing the Dashboard route.

## Purpose

The Dashboard is the GD1 control tower entry point. It should answer:

- Which PRs are waiting for approval?
- Which POs are late or awaiting supplier confirmation?
- Which shipments are delayed or blocked at milestones/customs?
- Which tasks are overdue or blocked?
- Which shipment costs need allocation?

## Layout

- Compact page header.
- Primary action: open Workflow.
- Metrics row: pending PR approvals, active POs, active shipments, blocked/overdue tasks.
- Risk queue table.
- Module links.

## Risk Queue

Show rows with:

- entity type and code
- owner/assignee
- current state
- due date or ETA
- concrete reason
- route action

Reasons include approval overdue, ETA passed without ATD, missing document, customs yellow/red, blocked task, cost pending.

## Done Checklist

- Risk count and risk rows match underlying GD1 data.
- Module links preserve expected routes.
- Empty/no-risk state does not look broken.
