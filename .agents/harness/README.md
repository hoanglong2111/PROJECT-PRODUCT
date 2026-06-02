# KBFE Development AI Harness

This directory contains the declarative harness used by IDE/development agents while building the KBFE repository.

It is intentionally separate from `server/ai/harness`, which is the product/runtime harness for GD1 operational copilots.

## Files

| File | Purpose |
|---|---|
| `agents.json` | Agent roles, responsibilities, and boundaries for IDE/model surfaces. |
| `workflows.json` | Repeatable development workflows and verification checks. |
| `context-packs.json` | Minimal context bundles for common task types. |
| `prompt-templates.md` | Short reusable prompt frames for coding agents. |

## How Agents Should Use This

1. Read `AGENTS.md`.
2. Read `.agents/agent-config.json`.
3. Pick a workflow from `workflows.json`.
4. Load the matching context pack from `context-packs.json`.
5. Load the focused skill file under `docs/skills/`.
6. Make scoped changes.
7. Run the workflow verification checks.
8. Record the question in `.agents/logs/YYYY-MM-DD/`.

## Boundary

- This harness coordinates repository development work.
- It may call MCP tools or product harness endpoints for read-only context.
- It must not bypass project safety rules, backend auth, idempotency, audit, or user approval.
