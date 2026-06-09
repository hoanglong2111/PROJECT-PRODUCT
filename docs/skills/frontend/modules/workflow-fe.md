# Workflow Frontend Module

Use this when implementing `frontend/src/features/workflow/page.tsx`.

## Queries

Target GD1 data:

- PO headers and lines
- DO headers and lines (with nested quotation status)
- Shipments and shipment lines
- Milestones
- PO-stage tasks

## Row Composition

Build flow rows by matching:

```text
purchase_order_line.id
  -> delivery_order_line.purchase_order_line_id
  -> shipment_line.delivery_order_line_id
  -> shipment.id
```

Keep POs without DO and DOs without shipment visible.

## Deep Links

Support:

- `?po=PO-...`
- `?do=DO-...`
- `?shipment=SHP-...`

Show focused rows when matched; keep fallback rows usable when no focused row exists.

## Derived Values

- PO fulfillment progress
- DO confirmation progress
- Quotation approval status (nested under DO)
- Shipment milestone progress (10 standard milestones)
- Missing document count (nested under Shipment)
- Blocked/overdue task count

## Done

- Relationship traceability does not depend on display names.
- Workflow can show partial delivery and partial shipment cases.
