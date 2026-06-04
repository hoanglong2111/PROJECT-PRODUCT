# Approval Module

GD1 approvals route submitted purchase requests through a department and value-based approval matrix.

```text
purchase_request SUBMITTED -> approval steps -> APPROVED or REJECTED
```

## Scope

In scope:

- Approval matrix configuration by tenant, department, currency, value band, applies-to, and step order.
- PR submit action that resolves the active matrix.
- Sequential approve/reject actions.
- Audit and state-transition records for approval decisions.
- Escalation timeout metadata.

Out of scope until the scheduler is enabled:

- Automatic escalation execution.
- Notification persistence for overdue approvers.

## Tables

| Table | Purpose |
|---|---|
| `approval_matrix_config` | Configurable approval chain by department/value. |
| `approval_steps` | Runtime approval steps for a submitted PR in the current runtime compatibility layer. |
| `audit_logs` | Append-only decision/audit snapshots. |
| `state_transition_logs` | Append-only PR state transitions. |

## Rules

- Submitted PR must resolve at least one active approval route.
- Only the active/pending step can be approved.
- Any rejection moves the PR to `REJECTED`.
- Final approval moves the PR to `APPROVED`.
- Rejected PR can return to `DRAFT` with a new version/revision flow once implemented.

## API Notes

Current backend logic lives in:

- `backend/routes/purchase-requests.routes.ts`
- `backend/controllers/purchase-requests.controller.ts`
- `backend/services/purchase-request-workflow.service.ts`
- `backend/models/approval.ts`
- `backend/models/reliability.ts`

Frontend approval UI lives in `frontend/src/features/purchase-requests/page.tsx`.
