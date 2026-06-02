# Frontend Forms And Validation Architecture

Use this when adding create/edit/approval/progress/update forms.

## Current State

The app is mostly read-only. Write UI should be added only with backend/API validation or explicit mock mutation scope.

## Validation Ownership

Frontend validates for UX:

- required fields
- date format
- number range
- obvious blocked states

Backend validates for truth:

- business rules
- permissions
- status transitions
- quantity limits
- ERP/integration gates

## GD1 Form Patterns

PR form:

- title/requester/department
- line item selector
- quantity/unit
- required date
- target price/currency
- preferred supplier

Approval form:

- approve/reject
- comment/reason
- visible escalation timeout

PO create/revise form:

- source PR line selector
- remaining quantity per PR line
- supplier
- PO type SEA/AIR/DOMESTIC
- incoterm/payment term
- expected ETD/ETA
- tolerance fields when editable

Shipment create form:

- source PO line selector
- remaining shippable quantity per PO line
- mode SEA/AIR
- forwarder/carrier
- B/L or AWB
- route/dates
- container numbers

Milestone update form:

- milestone code
- actual date
- source
- note
- supporting documents

Shipment cost form:

- cost type
- amount/currency/exchange rate
- allocation method
- invoice reference

Task update form:

- status
- assignee/reassign reason
- due date
- blocker note

## Rules

- Disable impossible actions but explain why.
- Show validation inline near the field.
- Show cross-field blockers in Alert or checklist.
- Never allow selected source-line quantity to exceed remaining quantity shown in the form.
- Never let frontend-only validation imply backend success.
