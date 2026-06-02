# Tasks UI/UX Module

Use this when designing or changing the Tasks route.

## Purpose

Tasks translate PO stages into owned work. The page should make blockers, due dates, stage context, and milestone links obvious.

## Default Layout

- Page header with workload badge.
- Optional context banner for `?po=`, `?shipment=`, or `?task=`.
- Metrics: total tasks, blocked, overdue, due soon.
- Toolbar: search, status filter, role filter, PO-stage filter, overdue-only switch.
- Main table.
- Task detail drawer.

## Table Columns

Recommended columns:

- task name.
- PO + PO stage.
- linked shipment milestone.
- role.
- assignee.
- status.
- due date.
- blocker note.
- row action.

## Detail Drawer

Show:

- task name and stage.
- PO link.
- linked shipment/milestone.
- assignee/role.
- status/due date.
- blocker note.
- activity/audit when available.

## Risk UX

- Blocked tasks get red badge with reason.
- Overdue tasks get red due date treatment.
- Auto-closed milestone tasks should show source milestone.
