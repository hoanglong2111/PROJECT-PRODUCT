---
name: kbfe-mcp-integration
description: Use when designing or implementing MCP resources, tools, prompts, or AI/RAG integrations for KBFE PR/PO/DO/task context, workflow inspection, risk summaries, and safe operational actions.
---

# KBFE MCP Integration Skill

## Goal

Expose KBFE operational context to AI agents safely. Agents may inspect entities, summarize risk, explain workflow state, and prepare actions without bypassing backend authorization.

## Current State

No MCP server exists yet. Treat this as the target contract.

Current deploy reality:

- FE is a Vite app built with `pnpm build` into `dist/`.
- BE bootstraps from `server/index.ts` with `pnpm start:be` or `pnpm dev:be`; domain APIs are mounted from `server/modules/*`.
- DB is PostgreSQL through `DATABASE_URL`.
- Runtime schema uses normalized PostgreSQL logistics tables.
- PR/PO/DO/tasks are physical business tables, with eFMS transport, finance notes, and task rows split by concern.
- No Dockerfile, compose file, Vercel/Netlify/Render/Railway manifest, or MCP server entrypoint exists in the repo yet.
- Before MCP write tools are implemented, backend authorization, audit logs, idempotency, and normalized action endpoints should be finalized.
- Deployment and DB normalization plan: `docs/context/DEPLOYMENT_MCP_AND_DB_PLAN.md`.
- Normalized schema: `server/migrations/001_normalized_logistics_schema.sql`.

## Resources

Recommended read-only resources:

```text
kbfe://context/project
kbfe://context/data-model
kbfe://purchase-requests/{pr_code}
kbfe://purchase-orders/{po_number}
kbfe://delivery-orders/{do_number}
kbfe://tasks/{task_id}
kbfe://workflow/{entity_type}/{entity_id}
kbfe://risk-queue
kbfe://audit/{entity_type}/{entity_id}
```

Resources should be concise and link to deeper ids instead of dumping the whole database.

## Tools

Read tools:

- `kbfe.search_entities`
- `kbfe.get_flow_context`
- `kbfe.list_risks`
- `kbfe.compute_delay`
- `kbfe.get_closure_gate`

Write tools, only after backend authorization and audit exist:

- `kbfe.update_task_progress`
- `kbfe.block_task`
- `kbfe.assign_task`
- `kbfe.submit_close_do`
- `kbfe.trigger_sap_sync`

## Safety

- Write tools call backend APIs only.
- Require entity id, actor context, authorization, and idempotency key.
- Return validation blockers instead of forcing invalid transitions.
- Never expose secrets, SAP credentials, raw tokens, or connection strings.
- Keep personal data limited to operational names/roles unless approved.

## RAG Index

Index entity ids, supplier/warehouse, item, contract, status, ETA/ETD, deadlines, delay, missing documents, task blockers, SAP state, and audit summaries.

## Done

- Read resources work before write tools.
- Tool schemas match backend validation.
- Risk answers cite entity ids and concrete blockers.
- AI can answer flow questions without loading all data.
