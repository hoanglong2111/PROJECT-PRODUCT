# Purchase Orders UI/UX Module

Use this when designing or changing the Purchase Orders route.

## Purpose

PO pages help users inspect supplier commitment, revision, source PR lines, shipment progress, ETA, and landed cost.

## Default Layout

- Page header with status/revision badges.
- Metrics: total PO, sent, confirmed, shipped/received, revision pending.
- Search/filter toolbar.
- Main table.
- Detail drawer.

## Table Columns

Recommended columns:

- PO number + revision.
- supplier.
- source PR.
- status.
- expected ETD/ETA.
- shipped/received quantity progress.
- linked shipment.
- landed cost state.
- row action.

## Detail Drawer

Show:

- PO header and terms.
- supplier confirmation.
- source PR lines.
- PO lines.
- linked shipments and milestones.
- PO-stage tasks.
- landed cost allocation.

## Risk UX

- ETA passed without ATD is red.
- Supplier confirmation pending is orange.
- Revision pending reconfirmation is orange.
- Over-shipment is red and should block save.
