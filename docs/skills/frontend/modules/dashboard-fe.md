# Dashboard Frontend Module

Use this when implementing `frontend/src/features/dashboard/page.tsx`.

## GD1 Purpose

Dashboard is the GD1 control tower entry point. It should prioritize:

- PO delivery risk and supplier confirmation state.
- DO confirmation status.
- DO Quotation pending response and 1-hour auto-approval SLA countdown.
- Shipment milestone risk and missing required documents.
- Shipment Draft B/L pending review and 2-hour SLA countdown.
- Task workload and blocked/overdue work.

## Queries

Target GD1 data:

- `fetchPurchaseOrders`
- `fetchDeliveryOrders` (includes nested active quotation status and sent times)
- `fetchShipments` (includes nested documents status)
- `fetchTaskWorkload`

## Derived Values

- PO ETA risk: PO expected ETA passed while linked shipment has no departure update.
- DO confirmation risk: DO remains in DRAFT for more than its scheduled buffer.
- Quotation SLA risk: Quotation under DO is in SENT state and near the 1-hour auto-approve deadline.
- Shipment risk: overdue milestone, missing document, customs yellow/red.
- Draft B/L SLA risk: Draft B/L is uploaded under a shipment but pending review near the 2-hour deadline.
- Task risk: `BLOCKED` or due date in past while status is not `DONE`/`CANCELLED`.

## Components

Use:

- Compact metric cards.
- Alert for urgent risk (like quotation SLA expiring or Draft B/L SLA expiring).
- Table for risk queue.
- Module link buttons/cards.

## Done

- Dashboard risk rows link to PO/DO/shipment/task context.
- Empty/no-risk state is explicit.
- SLA countdown timers handle remaining time in real time.
