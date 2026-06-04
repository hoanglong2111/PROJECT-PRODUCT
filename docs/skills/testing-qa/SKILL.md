---
name: kbfe-testing-qa
description: Use when adding tests, verification, QA checklists, regression coverage, build validation, or release readiness checks for KBFE GD1 frontend, backend APIs, data rules, workflow behavior, and MCP integrations.
---

# KBFE GD1 Testing/QA Skill

## Goal

Catch regressions in GD1 entity links, approval routing, quantity validation, PO revision, shipment milestones, document readiness, landed cost, task workflow, filters, and API writes.

## Baseline

Frontend and backend are independent packages with their own architecture checks, typechecks, tests, and builds:

```bash
pnpm --dir frontend verify
pnpm --dir backend verify
```

The frontend currently has 30 Vitest tests. Backend HTTP-foundation middleware and error behavior is covered under `backend/tests/`.

## Test Framework

- **Frontend**: Vitest + React Testing Library
  - Place tests next to source: `frontend/src/features/<feature>/__tests__/`
- **Backend**: Vitest
  - Place cross-cutting HTTP tests in `backend/tests/`
  - Place focused service/model tests next to the owning layer when useful
- **E2E**: Playwright
  - Place tests: `e2e/`

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

1. `pnpm --dir frontend verify` for frontend changes.
2. `pnpm --dir backend verify` for backend changes.
3. Both commands for cross-package or deployment changes.

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
- The affected package `verify` command passes.
- Backend production artifacts and copied migrations pass `verify:artifacts`.
- Any skipped verification or manual smoke-test results are documented.
