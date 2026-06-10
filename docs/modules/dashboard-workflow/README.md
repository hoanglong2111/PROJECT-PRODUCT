# Dashboard And Workflow Module

Dashboard and Workflow are read-heavy operational views over the GD1 chain.

```text
PO -> DO -> Shipment -> Milestones/Documents/Costs -> DTO -> Tasks/SLA/Incidents
```

## Dashboard

Purpose:

- Show PO, DO confirmation, quotation-selection, supplier confirmation, and ETA risk.
- Show shipment milestone, customs, and document risk.
- Show DTO assignment, delivery, fuel-adjustment, and POD risk.
- Show blocked or overdue tasks.
- Show landed-cost attention.
- Show incident severity and escalation owner.

## Workflow

Purpose:

- Trace one PO/DO/shipment/DTO chain end to end.
- Keep POs without DO, DOs without final quotation, confirmed DOs without shipment, shipments without clearance, and cleared shipments without DTO/POD visible.
- Support deep links by PO, DO, shipment, task, and DTO when routes exist.
- Surface SLA checkpoints and incident context beside the operational timeline.

## Rules

- Dashboard risk rows must link back to the owning entity.
- Workflow must preserve traceability from PO to DO, DO to Shipment, and Shipment to DTO.
- Derived risk logic should move toward backend/read-model ownership as data volume grows.
- Runtime compatibility names such as `delivery_orders` should not redefine the business vocabulary.
