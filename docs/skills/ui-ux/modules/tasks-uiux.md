# Tasks UI/UX Module

Use this when designing or changing the Tasks route.

## Purpose

Tasks translate DO state into owned work by role and assignee. The page should make blockers, due dates, and closure-required tasks obvious.

## Default Layout

- Page header with completion badge.
- Optional flow-context banner for `?do=` or `?pr=`.
- Metrics: total tasks, blocked, overdue.
- Toolbar: search, status filter, role filter, required-only switch, shown count.
- Main table.
- Task detail drawer.

## Table Columns

Recommended columns:

- task name + task id.
- DO + PR.
- role.
- assignee.
- priority.
- status.
- progress.
- due date.
- blocker.
- row action.

## Detail Drawer

Show:

- task name, DO, PR.
- workflow/DO/PR/PO links.
- progress.
- role and assignee.
- priority.
- due date.
- PO.
- required-for-closure.
- blocker reason.
- notes/activity when available.

## Risk UX

- Blocked tasks get red badges with reason.
- Overdue tasks get red due date treatment.
- Required tasks should be easy to filter.

## Future Actions

When mutations exist:

- assign/reassign.
- update progress.
- mark waiting/blocked.
- complete task.
- add note.
