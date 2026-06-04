# Purchase Requests Frontend Module

Use this when implementing `frontend/src/features/purchase-requests/page.tsx`.

## Query

Use `fetchPurchaseRequests` with query key `purchase-requests`. Target GD1 API should expose PR header, lines, approval state, and conversion progress.

## State

Use Zustand for:

- `prSearch`
- `prStatusFilter`
- `prApprovalOnly`
- `prConversionFilter`

Use URL param:

- `pr`

Use local state for selected PR/detail drawer.

## Filtering

Search dimensions:

- `pr_no`
- title
- requester
- department
- item name/code from lines
- preferred supplier

Core filters:

- pending approval
- approved
- rejected
- partially converted
- converted
- cancelled

## Detail

Drawer opens when:

- user clicks row action
- route contains matching `?pr=`

Show:

- header summary
- PR lines
- approval route/status
- conversion progress
- linked PO lines/POs
- notes/audit when available

## Mutations

Add only when backend validation exists or explicit mock scope is requested:

- create/update draft PR
- submit
- approve/reject
- cancel
- convert selected lines to PO

Invalidate PR, PO, workflow, dashboard after mutations.
