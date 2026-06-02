---
name: kbfe-mcp-integration
description: Use when designing or implementing MCP resources, tools, prompts, or AI/RAG integrations for KBFE GD1 PR/PO/shipment/task context, workflow inspection, risk summaries, and safe operational actions.
---

# KBFE GD1 MCP Integration Skill

## Goal

Expose KBFE GD1 operational context to AI agents safely. Agents may inspect entities, summarize risk, explain workflow state, and prepare actions without bypassing backend authorization.

## Current State

No production MCP server exists yet. Treat this as the target contract.

Current deploy reality:

- FE is a Vite app built with `pnpm build` into `dist/`.
- BE bootstraps from `server/index.ts` with `pnpm start:be` or `pnpm dev:be`.
- DB is PostgreSQL through `DATABASE_URL`.
- Runtime schema may still use older names such as `delivery_orders`; GD1 docs use `shipment`.
- Deployment and DB normalization plan: `docs/future/mcp-ops/deployment-mcp-and-db-plan.md`.
- GD1 ERD: `docs/database/GD1_DOCUMENT_ERD.md`.

## Resources

Recommended read-only resources:

```text
kbfe://context/project
kbfe://context/data-model
kbfe://purchase-requests/{pr_no}
kbfe://purchase-orders/{po_no}
kbfe://shipments/{shipment_no}
kbfe://shipments/{shipment_no}/milestones
kbfe://tasks/{task_id}
kbfe://workflow/{entity_type}/{entity_id}
kbfe://risk-queue
kbfe://deploy/readiness
kbfe://deploy/env
kbfe://deploy/db-schema
kbfe://deploy/db-counts
kbfe://deploy/health
kbfe://audit/{entity_type}/{entity_id}
```

Legacy compatibility resources may expose `delivery-orders/{do_number}` while runtime uses older names.

## Tools

Read tools:

- `check_env_readiness`
- `inspect_db_schema`
- `inspect_db_counts`
- `check_runtime_health`
- `check_repo_readiness`
- `list_pending_tasks`
- `get_gd1_risks`
- `inspect_shipment_milestones`
- `inspect_landed_cost_status`

Write tools, only after backend authorization and audit exist:

- `run_db_migration` with `confirm=true`
- `update_shipment_milestone`
- `create_shipment_cost`
- `update_po_stage_task`
- `deploy_frontend` with `confirm=true`
- `deploy_backend` with `confirm=true`

## Safety

- Write tools call backend APIs only.
- Require entity id, actor context, authorization, and idempotency key.
- Return validation blockers instead of forcing invalid transitions.
- Never expose secrets, ERP credentials, raw tokens, or connection strings.
- Keep personal data limited to operational names/roles unless approved.

## RAG Index

Index PR/PO/shipment ids, item/supplier, status, ETA/ETD/ATD/ATA, approval due, milestone due, missing documents, task blockers, landed-cost status, ERP sync, and audit summaries.

## Done

- Read resources work before write tools.
- Tool schemas match backend validation.
- Risk answers cite entity ids and concrete blockers.
- AI can answer GD1 flow questions without loading all data.
