# Tasks Frontend Module

Use this when implementing `src/features/tasks/page.tsx`.

## Query

Use `fetchLogisticsTasks` while runtime is legacy. Target GD1 should expose `po_stage_task` and `po_task_template`.

Query keys:

- `tasks`
- `task-templates`

## State

Use Zustand for:

- `taskSearch`
- `taskStatusFilter`
- `taskRoleFilter`
- `taskStageFilter`
- `taskOverdueOnly`

Use URL params:

- `po`
- `shipment`
- `task`
- legacy: `do`

## Filtering

Search dimensions:

- task name
- PO number
- PO stage
- assignee
- role
- linked shipment milestone

## Date Handling

Do not hard-code current date for overdue logic. Use `dayjs()` or an injected date source.

## Mutations

Target actions:

- start task
- mark done
- mark blocked
- cancel task
- reassign
- edit due date
- manage templates

Mutations should invalidate tasks, related PO, related shipment, workflow, and dashboard.
