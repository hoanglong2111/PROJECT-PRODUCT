# KBFE Agent Instructions

This repository is the KBFE Logistics Control Tower. Agents working here must use the project-local context in `docs/` and the operational config in `.agents/agent-config.json`.

## Read First

Before non-trivial code or documentation changes, bootstrap with:

1. `.agents/agent-config.json`
2. `.agents/memory.md` when present, for durable project decisions and agent preferences
3. `AGENTS.md`

Then classify the user request and load only the matching context pack from `.agents/harness/context-packs.json`.

Load these on demand:

1. `docs/context/PROJECT_CONTEXT.md` when product scope, route/module meaning, GD1 vocabulary, or feature behavior matters
2. `docs/context/OPERATING_MODEL.md` only when the task touches logistics workflow, SLA, SAP/eFMS, customs, finance notes, closure gates, or state transitions
3. The focused skill file under `docs/skills/` that matches the task
4. Old logs only when the task needs a prior decision, audit trail, or recent context

## Active Skill Map

- Frontend: `docs/skills/frontend/SKILL.md`
- Backend/API: `docs/skills/backend-api/SKILL.md`
- Data model: `docs/skills/data-model/SKILL.md`
- UI/UX: `docs/skills/ui-ux/SKILL.md`
- UI/UX debug: `docs/skills/ui-ux-debug/SKILL.md`
- Workflow/business flow: `docs/skills/workflow/SKILL.md`
- Testing/QA: `docs/skills/testing-qa/SKILL.md`
- MCP/RAG planning: `docs/skills/mcp/SKILL.md`

## Development Harness

Use `.agents/harness/` as the development/IDE AI harness for building this repository. It coordinates AI coding agents, context packs, workflows, prompt templates, verification loops, and MCP readiness tools.

Do not confuse it with the product/runtime AI harness in `server/ai/harness`, which serves GD1 operational copilots inside the KBFE app.

Development agents should:

1. Pick the closest workflow from `.agents/harness/workflows.json`
2. Load the matching context pack from `.agents/harness/context-packs.json`
3. Use the focused `docs/skills/*/SKILL.md`
4. Read old logs only when the current task needs a prior decision, audit trail, or recently changed context
5. Verify with the workflow checks
6. Log the question under `.agents/logs/`

## Working Rules

- Keep edits scoped to the user request.
- Preserve existing architecture: `src/app`, `src/features`, `src/shared`, `src/models`, `server/modules`, and `server/services`.
- Do not rewrite unrelated files or revert user changes.
- Prefer `pnpm typecheck` and `pnpm build` for verification when code changes are made.
- Do not commit logs, caches, scratch files, generated secrets, or local environment files.

## Behavioral Guardrails

These guardrails bias toward caution over speed. For trivial tasks, use judgment.

### Think Before Coding

- Do not assume or hide confusion. State assumptions explicitly before implementing.
- If multiple interpretations exist, present them instead of silently choosing one.
- If a simpler approach exists, mention it. Push back when the requested path seems unnecessarily complex or risky.
- If something is unclear and cannot be resolved from local context, stop, name the confusion, and ask.

### Decision Gates

- If two or more reasonable paths affect scope, timeline, architecture, data model, business rules, UX direction, or verification cost, stop before editing and offer 2-3 concrete options.
- Mark one option as recommended and explain the tradeoff in one short sentence per option.
- Ask the user to choose before implementation unless the task is trivial, reversible, and low-risk.
- If two or more context packs or skills could fit the request and loading the wrong one would waste context or risk the wrong implementation, ask the user to choose before loading broad docs.
- Do not present options for routine implementation details that can be safely inferred from existing project patterns.
- If the user has already specified the target clearly, proceed and state assumptions only when useful.

### Context Loading

- Start from the smallest useful context: config, memory, instructions, then the selected workflow/context pack.
- Do not read all `docs/skills/*`; load only the focused skill and optional companion skill when the selected context pack calls for it.
- Do not read `OPERATING_MODEL.md` for small UI, styling, copy, or local component changes unless workflow/state/SLA meaning is involved.
- If the user asks for context, explanation, or planning only, load enough docs to answer and avoid reading implementation files until needed.
- If context selection is ambiguous, offer 2-3 context choices and wait for the user instead of loading everything.

### Simplicity First

- Write the minimum code that solves the request.
- Do not add speculative features, abstractions, flexibility, configurability, or impossible-scenario error handling.
- If a solution grows much larger than necessary, simplify it before finishing.

### Surgical Changes

- Touch only what is required by the user request.
- Do not improve adjacent code, comments, formatting, or architecture unless needed for the task.
- Match the existing style, even when another style would be preferable.
- If unrelated dead code is noticed, mention it instead of deleting it.
- Remove imports, variables, or functions only when they became unused because of the current change.
- Every changed line should trace directly to the user request.

### Goal-Driven Execution

- Define verifiable success criteria for non-trivial tasks.
- For multi-step tasks, state a brief plan with verification checks.
- For bug fixes, reproduce the issue when practical, then verify the fix.
- For refactors, preserve behavior and run the relevant checks before finishing.

## Per-Question Logging

For every user question, create or append a log entry when filesystem access is available:

- Directory: `.agents/logs/YYYY-MM-DD/`
- File name: `HHMMSS-short-topic.md`
- Template: `.agents/QUESTION_LOG_TEMPLATE.md`

Each log should record the user request, intent, context files read, commands run, files changed, verification result, and final response summary. Never log secrets, tokens, raw `.env` values, or private credentials.

## Memory Compaction

Use `.agents/memory.md` for durable decisions, preferences, boundaries, and recurring shortcuts. Keep it compact, roughly 500-1,000 tokens. Do not copy per-question logs into memory. When memory grows too large, rewrite it into a shorter version that preserves only stable decisions; leave detailed history in `.agents/logs/`.
