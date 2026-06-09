# Dashboard UI/UX Module

Use this when designing or changing the Dashboard route.

## Purpose

The Dashboard is the GD1 control tower entry point. It should answer:

- Which POs are late or awaiting supplier confirmation?
- Which DOs are pending confirmation or overdue delivery?
- Which DO quotations are pending KBI response (active 1-hour SLA countdown)?
- Which shipments are delayed or blocked at milestones/customs?
- Which shipments have Draft B/L pending review (active 2-hour SLA countdown)?
- Which tasks are overdue or blocked?

## Layout

- Compact page header.
- Primary action: open Workflow.
- Metrics row: active POs, pending DOs, active shipments, blocked/overdue tasks.
- Risk queue table (lists critical items across PO, DO, and Shipment modules).
- Module links.

## Risk Queue

Show rows with:

- Entity type and code.
- Owner/assignee.
- Current state.
- Due date or ETA.
- Concrete risk reason.
- Route action.

Reasons include: PO supplier confirmation overdue, DO confirmation overdue, DO quotation SLA timer warning (1h countdown), shipment missing required document, customs yellow/red, Draft B/L review SLA timer warning (2h countdown), blocked/overdue task.

## Done Checklist

- Risk count and risk rows match underlying GD1 data.
- Module links preserve expected routes.
- Empty/no-risk state does not look broken.
