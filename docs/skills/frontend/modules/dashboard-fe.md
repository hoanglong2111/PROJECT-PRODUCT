# Dashboard Frontend Module

Use this when implementing `frontend/src/features/dashboard/page.tsx`.

## GD1 Purpose

Dashboard is the GD1 control tower entry point. It should prioritize:

- PR approval queue and approval SLA risk.
- PO delivery risk and supplier confirmation state.
- Shipment milestone risk.
- Task workload and blocked/overdue work.
- Landed-cost allocation attention.

## Queries

Current compatibility data:

- `fetchPurchaseRequests`
- `fetchPurchaseOrders`
- `fetchDeliveryOrders` as legacy shipment source
- `fetchLogisticsTasks`

Target GD1 data:

- `fetchShipments`
- `fetchShipmentMilestones`
- `fetchShipmentCosts`
- `fetchTaskWorkload`

## Derived Values

- Pending approval: PR status `SUBMITTED` or `PARTIALLY_APPROVED`.
- PO ETA risk: PO expected ETA passed while linked shipment has no `ATD`.
- Shipment risk: overdue milestone, missing document, customs yellow/red, or delivered milestone missing.
- Cost risk: shipment cost exists but PO line landed cost allocation is stale/pending.
- Task risk: `BLOCKED` or due date in past while status is not `DONE`/`CANCELLED`.

## Components

Use:

- Compact metric cards.
- Alert for urgent risk.
- Table for risk queue.
- Module link buttons/cards.
- Optional timeline only when backed by milestone data.

## Done

- Dashboard risk rows link to PR/PO/shipment/task context.
- Empty/no-risk state is explicit.
- Legacy DO data is labeled as shipment compatibility if surfaced.
