# Development Harness Prompt Templates

These templates are short frames for IDE agents. Always combine them with `AGENTS.md`, `.agents/agent-config.json`, and the relevant context pack.

## Feature Build

```text
Goal: Implement <feature> in KBFE.

Assumptions:
- <assumption>

Use context pack: <context-pack-id>
Focused skill: <docs/skills/.../SKILL.md>

Success criteria:
- <checkable criterion>
- <verification command>

Constraints:
- Keep edits scoped.
- Preserve existing architecture.
- Do not bypass auth, idempotency, audit, or user confirmation.
```

## Bugfix

```text
Bug: <reported behavior>
Expected: <expected behavior>

First reproduce or identify why reproduction is not possible.
Patch the smallest failing path.
Verify with <command/check>.
Report residual risk.
```

## Review

```text
Review target: <files/change/request>

Prioritize:
1. Bugs and behavioral regressions.
2. Missing tests or verification.
3. Contract, auth, state-machine, idempotency, audit, or migration risks.

Return findings first with file/line references when available.
```

## Docs Alignment

```text
Docs goal: Align <concept> across project instructions and module docs.

Find references with rg.
Patch only docs that remove ambiguity or update source-of-truth pointers.
Do not rewrite unrelated docs.
Verify with rg and summarize changed files.
```

## Readiness Check

```text
Readiness target: <repo/frontend/backend/db/deploy>

Run only non-destructive checks unless explicitly approved.
Redact secret values.
Report blockers, passing checks, and the next safe action.
```
