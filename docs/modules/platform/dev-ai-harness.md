# Development AI Harness

This module defines the harness used to coordinate AI agents while building, refactoring, documenting, testing, and readiness-checking the KBFE repository.

It is separate from the GD1 Product AI Harness in `server/ai`. The product harness helps KBFE users triage PO/shipment work inside the app. The development harness helps IDE agents such as Codex, Claude, Cursor, Gemini, or MCP-connected tools build the project with less duplicated context and fewer unsafe changes.

## Purpose

The development harness coordinates:

- agent routing for frontend, backend, data model, workflow, testing, docs, and MCP/deploy tasks
- compact context packs so IDE agents do not reload the whole repository
- prompt templates and behavioral guardrails for repeatable work
- verification loops such as `pnpm typecheck`, `pnpm build`, route smoke checks, and MCP readiness checks
- per-question logs and redaction rules
- safe handoff between planning, implementation, verification, and final summary

## Current Artifacts

| Layer | Location |
|---|---|
| Project instructions | `AGENTS.md` |
| Agent config | `.agents/agent-config.json` |
| Dev harness config | `.agents/harness/` |
| Per-question logs | `.agents/logs/` |
| Focused skills | `docs/skills/` |
| Product context | `docs/context/PROJECT_CONTEXT.md`, `docs/context/OPERATING_MODEL.md` |
| MCP automation tools | `server/mcp/deployServer.ts` |
| MCP/deploy plan | `docs/future/mcp-ops/deployment-mcp-and-db-plan.md` |

## Operating Flow

```text
User goal in IDE
  -> read AGENTS.md and .agents/agent-config.json
  -> choose workflow from .agents/harness/workflows.json
  -> load context pack from .agents/harness/context-packs.json
  -> load focused docs/skills/SKILL.md
  -> implement scoped changes
  -> verify with configured checks
  -> log the question under .agents/logs
  -> summarize changed files, verification, and residual risk
```

## Agent Routing

| Work type | Primary guide | Typical checks |
|---|---|---|
| Frontend feature or UI fix | `docs/skills/frontend/SKILL.md`, `docs/skills/ui-ux/SKILL.md` | `pnpm typecheck`, `pnpm build`, manual UI smoke |
| Backend/API change | `docs/skills/backend-api/SKILL.md` | `pnpm typecheck`, route smoke check |
| Data model or migration planning | `docs/skills/data-model/SKILL.md` | ERD/doc consistency, migration review |
| Workflow/business process | `docs/skills/workflow/SKILL.md` | state/rule/SLA consistency |
| Test/QA/review | `docs/skills/testing-qa/SKILL.md` | focused test or build checks |
| MCP/deploy/readiness | `docs/skills/mcp/SKILL.md` | MCP readiness tools, env-name checks, health checks |

## Token-Saving Rules

| Mechanism | Development harness behavior |
|---|---|
| Model routing | Use the smallest capable IDE/model surface for the task; reserve larger reasoning for architecture, review, and cross-module work. |
| Context compression | Load the context pack for the work type instead of unrelated docs. Prefer `rg` over broad file dumps. |
| Caching | Reuse `.agents/logs` and stable docs for prior decisions; do not relitigate already-recorded choices unless new facts appear. |
| Prompt templates | Use `.agents/harness/prompt-templates.md` plus the focused skill file for repeatable task framing. |

## Safety Contract

- Development agents may edit only allowed repository paths from `.agents/agent-config.json`.
- Destructive commands, deploy triggers, DB migrations, and secret-bearing operations require explicit user approval.
- Logs must not include secrets, tokens, raw `.env` values, API keys, connection strings, or private credentials.
- Product-runtime write actions remain in backend routes with auth, idempotency, audit, and state validation.
- The development harness can call product harness or MCP tools for read-only context, but repository edits remain governed by `AGENTS.md`.

## Status

Current status is foundation-ready:

- `.agents` workspace exists.
- `AGENTS.md` contains read-first rules, skill map, working rules, behavioral guardrails, and per-question logging.
- MCP deploy/readiness tools exist.
- Product AI harness exists separately for GD1 runtime triage.
- The missing next layer is an executable runner that consumes `.agents/harness/*.json` and dispatches IDE/model calls automatically.
