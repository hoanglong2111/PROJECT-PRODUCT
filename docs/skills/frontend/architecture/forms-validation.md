# Frontend Forms And Validation Architecture

Use this when adding create/edit/approval/progress/update forms.

## Current State

The app is mostly read-only. Write UI should be added only with backend/API validation or explicit mock mutation scope.

## Form Libraries

Use Mantine form utilities when forms become non-trivial. Keep simple controlled inputs local for tiny forms.

## Validation Ownership

Frontend validates for UX:

- required fields.
- date format.
- number range.
- obvious blocked states.

Backend validates for truth:

- business rules.
- permissions.
- status transitions.
- SAP and closure gates.

## Form Patterns

PR form:

- line-item material demand.
- quantity/unit.
- production contract.
- deadline.
- requester/buyer.

PO create form:

- source PR line selector.
- remaining quantity per PR line.
- multi-select for bulk purchase and split purchase.
- supplier, currency, amount, warehouse.

DO create form:

- source PO line selector.
- remaining quantity per PO line.
- multi-select for partial delivery and container consolidation.
- shipping, ETA/ETD, documents, warehouse deadline.

Task update form:

- progress.
- status.
- blocked reason.
- note.

DO close form:

- actual entry date.
- required tasks.
- documents.
- finance/tax blockers.

## Rules

- Disable impossible actions but explain why.
- Show validation inline near the field.
- Show cross-field blockers in Alert or checklist.
- Never allow selected source-line quantity to exceed remaining quantity shown in the form.
- Never let frontend-only validation imply backend success.
