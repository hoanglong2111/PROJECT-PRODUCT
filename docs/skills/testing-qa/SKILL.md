---
name: kbfe-testing-qa
description: Use when adding tests, verification, QA checklists, regression coverage, build validation, or release readiness checks for KBFE frontend, backend APIs, data rules, workflow behavior, and MCP integrations.
---

# KBFE Testing/QA Skill

## Goal

Catch regressions in entity links, deadline risk, status badges, source-line validation, document readiness, task closure, filters, and API writes.

## Baseline

Current repo has:

```bash
pnpm typecheck
pnpm build
```

No test framework is configured yet.

## Add Tests Gradually

- Unit/component: Vitest + React Testing Library.
- E2E: Playwright for critical flows.
- API/contract: backend tests once endpoints stabilize.
- Accessibility: Testing Library queries, optional axe.

Do not add all tooling at once unless the task needs it.

## High-Value Coverage

- `calcDelay`: actual, forecast, unknown, zero-day boundary.
- PR/PO/DO source-line quantity cannot exceed remaining quantity.
- Duplicate source lines in one payload are rejected when over limit.
- Task progress/status/blocker rules.
- DO close gate blocks missing actual entry, documents, or required tasks.
- Deep links open and close the correct detail without reopening.
- Risk filters include late, missing-doc, blocked-task, and incomplete-SAP records.

## Manual QA

Before marking UI work done:

- Dashboard, Workflow, PR, PO, DO, and Tasks load.
- Deep links are shareable.
- Cross-entity links work both directions.
- Empty/loading/error states appear.
- Mobile width keeps tables usable with horizontal scroll.
- Long supplier/item/document names do not break layout.

## Done

- Verification matches change risk.
- `pnpm typecheck` passes.
- `pnpm build` passes for production-impacting changes.
- Any skipped verification is called out.
