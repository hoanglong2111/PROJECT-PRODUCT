# Purchase Request Entity

GD1 `purchase_request` captures internal purchase demand before sourcing. It is approved by a configurable matrix and converted into one or more supplier POs.

```text
purchase_request -> purchase_request_line -> purchase_order_line
```

## Purpose

PR answers:

- what item/material is needed
- how much is needed
- which department/requester owns the demand
- when the item is required
- estimated value and currency for approval routing
- how much quantity has already been converted to PO
- whether approval, sourcing, cancellation, or closure is complete

## Tables

| Table | Purpose |
|---|---|
| `purchase_request` | PR header: code, title, requester, department, priority, state, required date, total amount, currency. |
| `purchase_request_line` | Item-level demand: item, requested quantity, converted quantity, unit, target price, required date, preferred supplier. |
| `approval_matrix_config` | Department/value approval rules used when PR is submitted. |

## Header Shape

| Field | Meaning |
|---|---|
| `id` | immutable UUID |
| `tenant_id` | tenant isolation |
| `pr_no` | business PR code, unique per tenant |
| `title` | short request title |
| `requester_id` | user who created/requested PR |
| `department_id` | department used for approval matrix |
| `priority` | `NORMAL`, `HIGH`, `URGENT` |
| `status` | PR state machine |
| `required_date` | earliest required date for the request |
| `total_amount` | computed from line quantities and target/unit price |
| `currency_code` | ISO 4217 currency |
| `submitted_at`, `approved_at` | approval timestamps |

## Line Shape

| Field | Meaning |
|---|---|
| `purchase_request_id` | parent PR |
| `item_id` | item/material master reference |
| `line_no` | stable line number within PR |
| `qty_requested` | requested quantity, must be greater than zero |
| `qty_converted` | quantity already converted into PO lines |
| `unit` | unit of measure |
| `target_price` | optional reference price |
| `currency_code` | line price currency |
| `required_date` | line-level required date override |
| `preferred_supplier_id` | optional suggested supplier |

## Status

| Status | Meaning |
|---|---|
| `DRAFT` | PR is editable and not submitted. |
| `SUBMITTED` | Waiting for approval resolution. |
| `PARTIALLY_APPROVED` | Some approval levels have approved. |
| `APPROVED` | PR can be converted to PO. |
| `REJECTED` | Requester may revise and submit again. |
| `CONVERTED` | All active line quantities are converted. |
| `CLOSED` | No more sourcing needed. |
| `CANCELLED` | Stopped by requester or manager. |

## Rules

- `qty_requested > 0`.
- `qty_converted >= 0` and `qty_converted <= qty_requested`.
- PR approval route is resolved from `approval_matrix_config` at submit time.
- Rejected PR can return to `DRAFT` with `version + 1`.
- One PR can split into many POs by supplier.
- Partial conversion is allowed; PR stays `APPROVED` while any line has remaining quantity.
- PR becomes `CONVERTED` only when every active line has `qty_converted = qty_requested`.
- PR cancellation does not automatically rollback already created POs.
- `submitted_at` is required after submit.
- `approved_at` is required for `APPROVED`, `CONVERTED`, and `CLOSED`.

## UI Notes

PR list should show PR code, title, department, requester, priority, status, required date, estimated value, approval age, and conversion progress.

PR detail should show header, lines, approval trail, linked PO lines, remaining quantity, notes, and audit entries when available.

## API Notes

Core actions:

- create/update PR in `DRAFT`
- submit PR
- approve/reject PR
- cancel PR
- convert approved lines to PO
- view audit trail

Writes must validate state transitions and quantity conversion server-side.
