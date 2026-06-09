# Workflow UI/UX Module

Use this when designing or changing the Workflow route.

## Purpose

Workflow shows GD1 traceability across:

```text
PO -> DO (with Quotations) -> Shipment (with Documents & Milestones) -> Tasks
```

It is not a pure status timeline; it is a relationship map for operational inspection.

## Layout

- Page header with action to open Shipment board.
- Context alert when deep-linked by `po`, `do`, or `shipment`.
- Metrics: active PO chains, pending DOs, active shipments, missing documents, blocked tasks.
- End-to-end timeline summary.
- Wide table with each PO/DO/shipment chain.

## Row Requirements

Each row should show:

- PO details and status.
- Linked DO details, transport type, and active quotation status.
- Linked shipment and milestone progress.
- Document readiness (uploaded vs required).
- Task workload/blockers.
- Direct flow actions.

## Deep-Link UX

When opened with `?po=`, `?do=`, or `?shipment=`:

- show a context alert.
- filter/focus the relevant chain.
- keep links to related entities visible.

If no match exists, keep all rows usable.
