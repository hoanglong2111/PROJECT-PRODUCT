# Purchase Requests UI/UX Module

Use this when designing or changing the Purchase Requests route.

## Purpose

PR pages help users inspect production/material demand, approval state, buyer ownership, warehouse deadline, and linked PO/DO records.

## Default Layout

- Page header with `Inspect workflow` action.
- Optional flow-context banner for `?pr=`.
- Metrics: total PR, approved/PO-ready, delay risk.
- Toolbar: search, status filter, delay-risk switch, shown count.
- Main table.
- Detail drawer.

## Table Columns

Recommended columns:

- PR code + priority.
- item code + item name.
- quantity + unit.
- production contract.
- warehouse deadline.
- expected arrival.
- buyer.
- status.
- risk.
- row action.

## Detail Drawer

Show:

- PR code, item, status.
- item/quantity/contract/warehouse.
- requested date, deadline, supplier expected, expected arrival.
- delay calculation panel.
- requester and purchasing manager.
- linked PO/DO/workflow/tasks.
- notes.

## Risk UX

- Forecast late uses light red/orange.
- Actual late uses stronger red.
- No ETA should be visible but not alarming unless near deadline logic exists.

## Future Actions

When mutations exist, add:

- create/edit PR.
- submit approval.
- approve/reject.
- convert to PO.

Do not show active write actions before backend validation exists.
