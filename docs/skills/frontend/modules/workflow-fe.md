# Workflow Frontend Module

Use this when implementing `frontend/src/features/workflow/page.tsx`.

## Queries

Current compatibility data:

- purchase requests
- purchase orders
- delivery orders as shipment compatibility
- logistics tasks

Target GD1 data:

- PR headers and lines
- PO headers and lines
- shipments and shipment lines
- milestones
- costs
- PO-stage tasks

## Row Composition

Build flow rows by matching:

```text
purchase_request_line.id
  -> purchase_order_line.purchase_request_line_id
  -> shipment_line.purchase_order_line_id
  -> shipment.id
```

Keep PRs without PO and POs without shipment visible.

## Deep Links

Support:

- `?pr=PR-...`
- `?po=PO-...`
- `?shipment=SHP-...`
- legacy `?do=DO-...`

Show focused rows when matched; keep fallback rows usable when no focused row exists.

## Derived Values

- approval progress
- conversion progress per PR
- PO fulfillment progress
- shipment milestone progress
- missing document count
- landed cost allocation state
- blocked/overdue task count

## Done

- Relationship traceability does not depend on display names.
- Legacy runtime DO naming is isolated to compatibility mapping.
- Workflow can show partial conversion and partial shipment cases.
