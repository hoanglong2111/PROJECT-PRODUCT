# Workflow UI/UX Module

Use this when designing or changing the Workflow route.

## Purpose

Workflow shows traceability across:

```text
PR -> PO -> DO -> Documents -> Tasks -> Warehouse
```

It is not a pure status timeline; it is a relationship map for operational inspection.

## Layout

- Page header with action to open DO board.
- Context alert when deep-linked by `pr` or `do`.
- Metrics: PR chains, missing documents, blocked tasks.
- End-to-end timeline summary.
- Wide table with each PR/DO chain.

## Row Requirements

Each row should show:

- PR demand.
- linked PO and DO.
- current stage.
- document readiness.
- task closure progress.
- warehouse risk.
- direct flow actions.

## Deep-Link UX

When opened with `?pr=` or `?do=`:

- show a context alert.
- filter/focus the relevant chain.
- keep links to related entities visible.

If no match exists, keep all rows usable and show a warning in future implementation.

## Divergent Mode

Workflow may eventually become a graph, swimlane, or timeline board. If so, preserve:

- entity ids.
- direct links.
- risk reasons.
- relationship traceability.
