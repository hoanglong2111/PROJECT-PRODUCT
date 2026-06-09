# Purchase Orders UI/UX Module

Use this when designing or changing the Purchase Orders route.

## Purpose

PO pages help users inspect supplier commitment, revision, LOT management, delivery orders, shipment progress, and ETA.

## Default Layout

- Page header with status/revision badges.
- Metrics: total PO, sent, confirmed, shipped/received, revision pending.
- Search/filter toolbar.
- Main table.
- Detail drawer.

## Table Columns

Recommended columns:

- PO number + revision.
- Supplier.
- Status.
- Expected ETD/ETA.
- Shipped/received quantity progress.
- Linked delivery orders (DOs).
- Row action.

## Detail Drawer

Show:

- PO header and terms.
- Supplier confirmation.
- PO lines and items.
- **LOT Management panel** (with drag-and-drop items between LOTs, splitting LOTs).
- **Linked DOs** (each LOT maps to a DO: origin/destination warehouses, transport types, confirmation status).
- **Linked shipments** and milestone progress.
- PO-stage tasks.

## Risk UX

- ETA passed is red.
- Supplier confirmation pending is orange.
- Revision pending reconfirmation is orange.
- Over-shipment is red and should block save.
- LOTs without confirmed DOs show warning.
