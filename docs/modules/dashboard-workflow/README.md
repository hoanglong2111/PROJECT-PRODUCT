# Dashboard And Workflow Module

Dashboard and Workflow are read-heavy operational views over the GD1 chain.

```text
PR -> Approval -> PO -> Shipment -> Milestones -> Documents + Costs -> Tasks
```

## Dashboard

Purpose:

- Show PR approvals that need action.
- Show PO delivery and ETA risk.
- Show shipment milestone/customs/document risk.
- Show blocked or overdue tasks.
- Show landed-cost attention.

Main code:

- `src/features/dashboard/page.tsx`
- `server/modules/dashboard`
- `server/services/logisticsReporting.ts`

## Workflow

Purpose:

- Trace one PR/PO/shipment chain end to end.
- Keep PRs without PO and POs without shipment visible.
- Support deep links by `pr`, `po`, `shipment`, and legacy `do`.
- Surface partial conversion, split purchase, partial shipment, and consolidated shipment cases.

Main code:

- `src/features/workflow/page.tsx`
- `src/shared/components/EntityLink.tsx`
- `src/shared/hooks/useEntityParam.ts`

## Rules

- Dashboard risk rows must link back to the owning entity.
- Workflow must preserve traceability even when runtime names still use `delivery_orders`.
- Derived risk logic should move toward backend/read-model ownership as data volume grows.
