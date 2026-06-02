# Workflow UI/UX Module

Use this when designing or changing the Workflow route.

## Purpose

Workflow shows GD1 traceability across:

```text
PR -> PO -> Shipment -> Milestones -> Documents -> Costs -> Tasks
```

It is not a pure status timeline; it is a relationship map for operational inspection.

## Layout

- Page header with action to open Shipment board.
- Context alert when deep-linked by `pr`, `po`, `shipment`, or legacy `do`.
- Metrics: PR chains, active shipments, missing documents, blocked tasks, cost pending.
- End-to-end timeline summary.
- Wide table with each PR/PO/shipment chain.

## Row Requirements

Each row should show:

- PR demand and conversion progress.
- linked PO and status.
- linked shipment and milestone progress.
- document readiness.
- landed cost state.
- task workload/blockers.
- direct flow actions.

## Deep-Link UX

When opened with `?pr=`, `?po=`, or `?shipment=`:

- show a context alert.
- filter/focus the relevant chain.
- keep links to related entities visible.

If no match exists, keep all rows usable and show a warning in future implementation.

## Divergent Mode

Workflow may eventually become a graph, swimlane, or timeline board. Preserve entity ids, direct links, risk reasons, and quantity traceability.
