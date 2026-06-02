---
name: kbfe-testing-qa
description: Use when adding tests, verification, QA checklists, regression coverage, build validation, or release readiness checks for KBFE GD1 frontend, backend APIs, data rules, workflow behavior, and MCP integrations.
---

# KBFE GD1 Testing/QA Skill

## Goal

Catch regressions in GD1 entity links, approval routing, quantity validation, PO revision, shipment milestones, document readiness, landed cost, task workflow, filters, and API writes.

## Baseline

Current repo has:

```bash
pnpm typecheck
pnpm build
```

No dedicated test framework is configured yet.

## High-Value Coverage

- PR submit/approve/reject state transitions.
- Approval matrix by department and value band.
- PR line `qty_converted` cannot exceed `qty_requested`.
- PR partial conversion remains visible.
- PO revision increments after editing a sent/confirmed PO.
- Shipment creation generates exactly 10 milestones.
- Duplicate shipment milestone code/sequence is rejected.
- Shipment line total cannot exceed PO over-shipment tolerance.
- Updating `ATD` moves shipment to `IN_TRANSIT`.
- Updating `EDO_DELIVERY` moves shipment to `DELIVERED` and emits warehouse event.
- Shipment cost allocation updates PO line landed cost.
- Task `DONE` requires completion metadata.
- Task `BLOCKED` requires note and appears in workload risk.
- Linked milestone auto-closes matching task.
- Deep links open and close the correct PR/PO/shipment/task detail.

## Automated Verification Workflow

When writing or changing code, run:

1. `pnpm typecheck`
2. `pnpm build`
3. Existing tests if configured

For docs-only changes, typecheck/build are not required unless docs generate code or schema.

## Manual QA

Before marking UI work done:

- Dashboard, Workflow, PR, PO, Shipment/Delivery Orders, and Tasks load.
- Deep links are shareable.
- Cross-entity links work both directions.
- Empty/loading/error states appear.
- Mobile width keeps tables usable with horizontal scroll.
- Long supplier/item/document names do not break layout.
- Legacy route labels do not obscure GD1 shipment semantics.

## Done

- Verification matches change risk.
- `pnpm typecheck` passes for code changes.
- `pnpm build` passes for production-impacting changes.
- Any skipped verification or manual smoke-test results are documented.
