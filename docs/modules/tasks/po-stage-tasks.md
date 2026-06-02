# PO Stage Task Management Workflow

GD1 tasks are owned work items generated per PO stage. They help managers see who is responsible, which deadlines are overdue, and which blockers prevent the PO from advancing.

```text
PO state changes -> po_task_template lookup -> po_stage_task creation -> assignment -> execution -> completion/blocker
```

## Scope

In scope:

- Task templates per PO type and PO stage.
- Manual task creation.
- Assignment/reassignment.
- Status updates.
- Overdue detection.
- Auto-close from linked shipment milestones.
- Workload dashboard by assignee.

Out of scope:

- Generic enterprise project management.
- Full notification persistence model.
- Calendar/holiday table details, unless implementing SLA engine.

## Tables

| Table | Purpose |
|---|---|
| `po_task_template` | Configures task name, default role, SLA hours, linked milestone, sort order. |
| `po_stage_task` | Runtime task attached to one PO and one PO stage. |

## Roles

| Role | Responsibility |
|---|---|
| `BUYER` | Supplier confirmation, PO status update, purchase follow-up. |
| `LOGISTICS` | Booking, shipment readiness, B/L or AWB, delivery schedule. |
| `FINANCE` | Landed cost, invoice reference, settlement and ERP accounting support. |
| `CUSTOMS_BROKER` | Customs draft, official declaration, clearance stream handling. |

## PO Stages That Can Generate Tasks

- `SENT`
- `CONFIRMED`
- `IN_PRODUCTION`
- `READY_TO_SHIP`
- `SHIPPED`
- `RECEIVED`

`DRAFT`, `CLOSED`, and `CANCELLED` should not generate normal stage tasks.

## Task Status

| Status | Rule |
|---|---|
| `PENDING` | Assigned but not started. |
| `IN_PROGRESS` | Assignee started work. |
| `DONE` | Requires `completed_at` and `completed_by`. |
| `BLOCKED` | Requires non-empty note explaining blocker. |
| `CANCELLED` | No longer needed; reason should be noted. |

## Happy Path

1. Buyer changes PO status to a new active stage.
2. Backend queries active `po_task_template` rows where `po_type` matches PO type or `ALL`, and `po_stage` equals new state.
3. Backend creates `po_stage_task` rows with assignee resolved from `default_assignee_role`.
4. Assignee receives notification and starts task.
5. Assignee updates status and notes.
6. Task moves to `DONE`, recording `completed_at` and `completed_by`.
7. Manager sees workload and overdue status updated.

## Auto-Close From Milestone

When a `shipment_milestone.actual_date` is recorded:

1. Find `po_stage_task` rows for related PO where `linked_shipment_milestone` equals the milestone code.
2. If task status is `PENDING` or `IN_PROGRESS`, set it to `DONE`.
3. Set `completed_at` to the milestone actual timestamp/date.
4. Set `completed_by` to system user or the user recording the milestone.

## Blocking Rules

- A blocked task must have a note.
- A PO cannot advance when a current-stage task is `BLOCKED` if hard-block mode is enabled.
- If soft-block mode is configured, the PO can advance but dashboard must keep blocker visible.
- Overdue scan runs every 15 minutes or equivalent scheduler interval.

## UI Touchpoints

Task list should show:

- PO number and PO stage
- task name
- assignee
- role
- status
- due date
- overdue badge
- blocker note
- linked shipment milestone

Task detail should allow:

- start task
- mark done
- mark blocked
- reassign
- edit due date
- add note

## API Mapping

| Action | Endpoint shape |
|---|---|
| List PO tasks | `GET /api/v1/purchase-orders/{id}/tasks` |
| Create manual task | `POST /api/v1/purchase-orders/{id}/tasks` |
| List current user's tasks | `GET /api/v1/tasks` |
| Workload report | `GET /api/v1/tasks/workload` |
| Update task | `PATCH /api/v1/tasks/{id}` |
| Reassign task | `POST /api/v1/tasks/{id}/assign` |
| List templates | `GET /api/v1/task-templates` |
| Create/update template | `POST/PATCH /api/v1/task-templates` |

## QA Checks

- Stage transition creates expected template tasks.
- `BLOCKED` without note is rejected.
- `DONE` without completed metadata is rejected.
- Linked milestone auto-closes matching task.
- Overdue task appears in workload/dashboard.
- Reassignment changes assignee and preserves audit trail.
- Soft-block and hard-block behavior are explicit in test setup.
