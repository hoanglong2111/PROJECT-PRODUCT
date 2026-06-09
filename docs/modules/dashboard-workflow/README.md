# Dashboard And Workflow Module

Dashboard and Workflow are read-heavy operational views over the GD1 chain.

```text
PO -> DO -> selected quotation -> Shipment -> Milestones -> Documents + Costs -> Tasks
```

## Dashboard

Purpose:

- Show PO delivery and ETA risk.
- Show DO confirmation and quotation-selection risk.
- Show shipment milestone/customs/document risk.
- Show blocked or overdue tasks.
- Show landed-cost attention.

Main code:

- `frontend/src/features/dashboard/page.tsx`
- `backend/routes/dashboard.routes.ts`
- `backend/controllers/dashboard.controller.ts`
- `backend/services/dashboard.service.ts`
- `backend/models/logisticsReporting.ts`

## Workflow

Purpose:

- Trace one PO/DO/quotation/shipment chain end to end.
- Keep POs without DO, DOs without final quotation, and confirmed DOs without shipment visible.
- Support deep links by `po`, `do`, `quotation`, and `shipment`.
- Surface PO 1-n DO cases and DO 1-1 Shipment execution status.

Main code:

- `frontend/src/features/workflow/page.tsx`
- `frontend/src/shared/components/EntityLink.tsx`
- `frontend/src/shared/hooks/useEntityParam.ts`

## Rules

- Dashboard risk rows must link back to the owning entity.
- Workflow must preserve traceability for `PO 1-n DO` and `DO 1-1 Shipment`, even when runtime names still use legacy paths.
- Derived risk logic should move toward backend/read-model ownership as data volume grows.
