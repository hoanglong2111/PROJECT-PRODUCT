# Delivery Orders UI/UX Module

Use this when designing or changing the Delivery Orders route.

## Purpose

DO is the shipment control tower. It should show where the lô hàng is, whether documents/SAP/tasks are ready, and whether warehouse deadline is at risk.

## Default Layout

- Page header with `Inspect workflow` action.
- Optional flow-context banner for `?do=` or `?pr=`.
- Metrics: active DO, risk queue, completed tasks.
- Toolbar: search, status filter, risk-only switch, shown count.
- Wide operations table.
- Selected DO detail surface.

## Table Columns

Recommended columns:

- DO number + tracking.
- PR/PO links.
- supplier + SAP sync status.
- item + quantity.
- route + shipping method.
- ETA.
- warehouse deadline + delay.
- task progress.
- documents readiness.
- status.
- row action.

## Detail Surface

Current detail has Overview, Documents, Closure. Future target tabs:

- Overview.
- Logistics.
- Documents.
- Warehouse.
- Closure.
- Finance.
- Audit.

## Risk UX

Surface risk in three places:

- list row.
- detail alert.
- closure tab.

Risk reasons:

- missing documents.
- blocked required tasks.
- forecast/actual warehouse delay.
- SAP sync incomplete/failed.
- tax deadline or finance blocker when implemented.

## Divergent Views

DO may later support map, timeline, or calendar view. Keep table as the default operations board unless a role-specific workflow needs otherwise.
