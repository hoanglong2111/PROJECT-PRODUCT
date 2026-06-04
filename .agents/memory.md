# KBFE Agent Memory

Purpose: compact durable memory for development-agent navigation. This file is not an audit log and is not product/runtime AI state.

## Stable Decisions

- The desired agent scope is repository navigation and development coordination only.
- Do not build or assume a product/runtime AI harness unless explicitly requested.
- Do not connect the KBFE app to external LLMs for runtime copilot behavior by default.
- `.agents/harness/` is the development harness: workflows, context packs, prompt templates, and agent-role boundaries.
- `backend/ai/harness` is a separate product/runtime concept and should not drive development-agent behavior.
- Frontend and backend are standalone packages. Use `pnpm --dir frontend ...` and `pnpm --dir backend ...`; there is no root runtime package or workspace.

## Default Build Flow

1. Bootstrap with `.agents/agent-config.json`, this memory file, and `AGENTS.md`.
2. Classify the user request and pick the closest workflow/context pack.
3. If multiple context packs or skills could fit, offer 2-3 options with one recommended choice and wait for user selection.
4. Load only the focused `docs/skills/*/SKILL.md` and docs requested by the chosen context pack.
5. Read `docs/context/PROJECT_CONTEXT.md` when product scope, route/module meaning, GD1 vocabulary, or feature behavior matters.
6. Read `docs/context/OPERATING_MODEL.md` only when the task touches logistics workflow, SLA, SAP/eFMS, customs, finance notes, closure gates, or state transitions.
7. If multiple implementation paths affect scope, timeline, architecture, data model, business rules, UX, or verification cost, offer 2-3 options and wait.
8. Use `rg` to find existing code patterns before editing.
9. Keep changes scoped and verify with the workflow checks.
10. Write one per-question log under `.agents/logs/YYYY-MM-DD/`.

## Token Discipline

- Do not read all `docs/skills/*` every turn.
- Do not read old logs unless the task needs a prior decision, audit trail, or recent context.
- Ask for context/skill selection when the request is ambiguous instead of loading broad docs.
- Prefer this memory file over scanning many historical logs.
- Keep this file compact. If it grows past roughly 1,000 tokens, rewrite it into a shorter durable summary and leave details in logs.

## Logging Boundary

- Logs are history and audit.
- Memory is compressed durable guidance.
- Do not store secrets, tokens, raw `.env` values, API keys, connection strings, or private credentials in either place.
