# ERP And WMS Integration Module

GD1 integration is reliability-first: business writes enqueue integration events, and external delivery happens later.

## Current Events

| Event | Trigger | Destination |
|---|---|---|
| PO created/confirmed | PO reaches supplier-confirmed integration gate | ERP |
| PO revised | PO revision is created after send/confirm | ERP |
| `shipment.arrived_at_warehouse` | `EDO_DELIVERY.actual_date` is recorded | Future GD2/WMS |

## Runtime Foundation

| Capability | Current owner |
|---|---|
| Idempotency | `backend/middlewares/idempotency.ts`, `backend/models/idempotency.ts`, `idempotency_keys` |
| Outbox events | `backend/models/reliability.ts`, `outbox_events` |
| State transitions | `backend/models/reliability.ts`, `state_transition_logs` |
| Audit | `backend/models/reliability.ts`, `audit_logs` |
| PO ERP sync | `backend/models/logisticsPurchaseOrders.ts` |
| Warehouse arrival event | `backend/models/milestones.ts` |

## Pending Before Production

- Outbox publisher worker.
- Provider-specific ERP delivery adapter.
- Forwarder/carrier webhook controllers.
- Carrier polling worker.
- Email/SFTP ingestion and raw event replay.
- Tenant-aware auth context for every integration event.
