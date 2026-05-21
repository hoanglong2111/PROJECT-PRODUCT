# Tasks Frontend Module

Use this when implementing `src/features/tasks/page.tsx`.

## Query

Use `fetchLogisticsTasks` with query key `tasks`.

## State

Use Zustand for:

- `taskSearch`
- `taskStatusFilter`
- `taskRoleFilter`
- `taskRequiredOnly`

Use URL params:

- `do`
- `pr`
- `task`

Use local state:

- selected task.
- drawer open state.

## Filtering

Flow context:

- `?do=` filters task `do_number`.
- `?pr=` filters task `request_code`.

Search dimensions:

- task id.
- task name.
- DO.
- PR.
- PO.
- assignee.
- production contract.

## Date Handling

Do not hard-code current date for overdue logic. Use `dayjs()` or an injected date source.

## Future Mutations

- assign/reassign.
- update progress.
- mark blocked/waiting.
- complete task.

Mutations should invalidate tasks, related DO, workflow, and dashboard.
