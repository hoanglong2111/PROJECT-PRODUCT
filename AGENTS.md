# KBFE Agent Instructions

This repository is the KBFE Logistics Control Tower. Agents working here must use the project-local context in `docs/` and the operational config in `.agents/agent-config.json`.

## Read First

Before non-trivial code or documentation changes, read:

1. `.agents/agent-config.json`
2. `docs/context/PROJECT_CONTEXT.md`
3. `docs/context/OPERATING_MODEL.md` when the task touches logistics workflow, SLA, SAP/eFMS, customs, finance notes, or closure gates
4. The focused skill file under `docs/skills/` that matches the task

## Active Skill Map

- Frontend: `docs/skills/frontend/SKILL.md`
- Backend/API: `docs/skills/backend-api/SKILL.md`
- Data model: `docs/skills/data-model/SKILL.md`
- UI/UX: `docs/skills/ui-ux/SKILL.md`
- UI/UX debug: `docs/skills/ui-ux-debug/SKILL.md`
- Workflow/business flow: `docs/skills/workflow/SKILL.md`
- Testing/QA: `docs/skills/testing-qa/SKILL.md`
- MCP/RAG planning: `docs/skills/mcp/SKILL.md`

## Working Rules

- Keep edits scoped to the user request.
- Preserve existing architecture: `src/app`, `src/features`, `src/shared`, `src/models`, `server/modules`, and `server/services`.
- Do not rewrite unrelated files or revert user changes.
- Prefer `pnpm typecheck` and `pnpm build` for verification when code changes are made.
- Do not commit logs, caches, scratch files, generated secrets, or local environment files.

## Per-Question Logging

For every user question, create or append a log entry when filesystem access is available:

- Directory: `.agents/logs/YYYY-MM-DD/`
- File name: `HHMMSS-short-topic.md`
- Template: `.agents/QUESTION_LOG_TEMPLATE.md`

Each log should record the user request, intent, context files read, commands run, files changed, verification result, and final response summary. Never log secrets, tokens, raw `.env` values, or private credentials.

