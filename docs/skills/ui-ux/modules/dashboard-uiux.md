# Dashboard UI/UX Module

Use this when designing or changing the Dashboard route.

## Purpose

The Dashboard is the control tower entry point. It should answer:

- How many PR/PO/DO/tasks are active?
- Which records need attention first?
- Which module should the user open next?

## Layout

- Page header: `Logistics control tower` with concise operational subtitle.
- Primary action: open Workflow.
- Metrics row: PR count, PO count, active DO, blocked tasks.
- Alert: only when risk exists.
- Main split: risk queue and operational module links.

## Risk Queue

Show DO rows with:

- DO number.
- linked PO.
- ETA.
- warehouse deadline.
- delay badge.
- blocker badges for tasks/documents.

Do not show every possible field. The dashboard should triage, not replace the DO board.

## Module Links

Module links should explain what each route helps inspect:

- Workflow: full entity chain.
- PR: demand and deadline.
- PO: SAP/supplier/source PR.
- DO: logistics/documents/closure.
- Tasks: assignee/progress/blockers.

## Motion

Use subtle loading skeletons. Avoid animated charts until real metrics and trends exist.

## Done Checklist

- Risk count and risk rows match the underlying DO/task/document data.
- Module links preserve expected routes.
- Empty/no-risk state does not look broken.
