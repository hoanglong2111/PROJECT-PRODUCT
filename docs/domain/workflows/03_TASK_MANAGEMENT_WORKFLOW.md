# Task Management Workflow

Tasks turn DO status into owned operational work. A DO should not close while required tasks are incomplete, blocked, or missing required closure data. Task handoffs model the logistics relay from production demand to POD and finance closure.

```text
DO Created -> Task Creation -> Assignment -> Execution -> Blocker Handling -> Completion -> DO Close Check
```

## Roles

| Role | Responsibility |
|---|---|
| `PIC Manager` | coordinate DO, review risk, approve closure |
| `Sale Staff` | confirm customer/contract priority and production context |
| `Port Officer` | track port, carrier, ETD/ETA, arrival |
| `Customs Officer` | documents, declaration, customs clearance |
| `Finance Officer` | tax, logistics fees, insurance/payment checks |
| `Warehouse Staff` | receiving plan and actual warehouse entry |

## Operating Relay

| Stage | Primary role | Expected work |
|---|---|---|
| PR/PO/DO creation | PIC Manager | Confirm PR, PO, SAP sync, warehouse deadline, and source links. |
| Quotation/booking | Sale Staff | Respond to preliminary quotation within 1 hour and official quotation or booking hold within 8 hours. |
| Port verification | Port Officer | Cross-check Draft B/L, CI, Packing List, and quotation within 1 hour. |
| Customs clearance | Customs Officer | Open declaration and handle green/yellow/red customs lane outcome. |
| Delivery/finance closure | Warehouse Staff / Finance Officer | Confirm Telex Release gate, upload POD, issue finance notes, and update actual warehouse entry. |

## Task Shape

| Field | Meaning |
|---|---|
| `task_id` | business task code |
| `do_number`, `request_code`, `po_number` | parent links |
| `task_name` | action-oriented task title |
| `role`, `assignee` | owner role and user |
| `progress` | `0..100` |
| `status` | lifecycle state |
| `priority`, `due_date` | urgency and deadline |
| `is_required_for_do_closure` | closure gate flag |
| `blocked_reason` | required when blocked |
| `notes`, `completed_at` | execution context |

## Status

| Status | Rule |
|---|---|
| `TODO` | progress is 0 |
| `IN_PROGRESS` | progress is between 1 and 99 |
| `WAITING` | waiting on external input; note recommended |
| `BLOCKED` | requires `blocked_reason`; raises DO risk |
| `COMPLETED` | progress is 100 and completion timestamp should exist |
| `CANCELLED` | no longer needed; reason recommended |

## Required Templates

| DO stage | Task | Role |
|---|---|---|
| `CREATED` | Confirm DO information from PR/PO | `PIC Manager` |
| `CONFIRMED` | Check supplier and item code from SAP | `PIC Manager` |
| `IN_PRODUCTION` | Follow supplier readiness date | `Sale Staff` |
| `IN_TRANSIT` | Update ETD/ETA/tracking | `Port Officer` |
| `IN_TRANSIT` | Check logistics documents | `Customs Officer` |
| `ARRIVED_PORT` | Confirm arrival notice | `Port Officer` |
| `CUSTOMS_PROCESSING` | Open declaration and clear customs | `Customs Officer` |
| `CUSTOMS_PROCESSING` | Confirm tax amount/deadline | `Finance Officer` |
| `WAREHOUSE_PENDING` | Schedule warehouse receipt | `Warehouse Staff` |
| `WAREHOUSE_PENDING` | Update actual entry date | `Warehouse Staff` |
| `WAREHOUSE_PENDING` | Upload POD after final delivery | `Warehouse Staff` |
| `WAREHOUSE_PENDING` | Issue Final Debit Note after local charge closure | `Finance Officer` |
| any active stage | Make Advance Settlement | assigned role |
| any active stage | Attach required job files and upload dossier to KBI Drive | assigned role |

## Rules

- Every task belongs to a DO.
- Progress must stay in `0..100`.
- `COMPLETED` requires progress 100.
- `BLOCKED` requires blocker reason.
- Overdue unfinished tasks should surface as risk.
- DO close requires all required tasks completed or waived.
- DO status changes may generate template tasks.
- SLA-bound tasks should carry a due date derived from the business timer.
- `completed_at` is required for completed relay tasks so the control tower can audit handoff latency.

## UI Notes

Task list should show task name, parent DO/PR/PO, role, assignee, priority, status, progress, due date, blocker, and required flag. Detail drawer should allow validated status/progress/blocker updates.

## QA Notes

Test blocker validation, progress/status consistency, required-only filter, deep links (`?do=`, `?pr=`, `?task=`), and DO closure blocking.

## Sample

```json
{
  "task_id": "TASK-2026-000553",
  "do_number": "DO-2026-000087",
  "request_code": "PR-2026-000145",
  "po_number": "PO-4500098123",
  "task_name": "Check customs document set",
  "role": "Customs Officer",
  "progress": 60,
  "status": "BLOCKED",
  "priority": "HIGH",
  "due_date": "2026-06-10",
  "is_required_for_do_closure": true,
  "blocked_reason": "Missing B/L"
}
```
