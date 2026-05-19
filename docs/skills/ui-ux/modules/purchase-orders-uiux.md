# Purchase Orders UI/UX Module

Use this when designing or changing the Purchase Orders route.

## Purpose

PO pages help users inspect purchasing commitments, SAP sync, supplier, source PRs, and linked DOs.

## Default Layout

- Page header with SAP-source badge.
- Metrics: total PO, synced, pending SAP.
- Search toolbar.
- Main table.
- Detail drawer.

## Table Columns

Recommended columns:

- PO number + order date.
- supplier name + supplier code.
- source PR links.
- linked DO links.
- total amount + currency.
- SAP sync status.
- PO status.
- row action.

## Detail Drawer

Show:

- PO number and supplier.
- supplier code.
- order date.
- total amount.
- SAP sync.
- source PR links.
- linked DO links.
- workflow link when linked DO exists.

## Risk UX

SAP pending/failed should be visible but not always red:

- pending: orange.
- failed/incomplete: red.
- synced: teal.

## Future Actions

When backend supports it:

- retry SAP sync.
- inspect sync history.
- link/unlink DO.
- show PO fulfillment by quantity.
