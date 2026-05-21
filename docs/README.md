# KBFE Docs

Docs in this folder are project-local context for the KBFE logistics control tower. Load only the files needed for the task.

## Read Order

1. `DOCS_WORKFLOW.md` when creating or changing docs.
2. `context/PROJECT_CONTEXT.md` for current project truth.
3. `context/OPERATING_MODEL.md` when the task touches business flow, SLA, rules, SAP/eFMS, customs, or finance closure.
4. `domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md` when the task needs detailed eFMS job/SOP code mapping.
5. One focused domain or skill file for the request.
6. Module/pattern files only when changing that exact screen or pattern.

## Project Map

| Path | Use |
|---|---|
| `src/app/` | React app shell, route config, and role guards. |
| `src/features/` | Feature-owned route pages, components, API wrappers, hooks, and constants. |
| `src/shared/` | Cross-feature frontend API, auth, UI, i18n, stores, theme, hooks, and utilities. |
| `src/models/` | Shared TypeScript contracts that must stay compatible with API payloads. |
| `server/modules/` | Express route/service modules mounted under stable `/api/*` paths. |
| `server/services/` | Shared backend persistence, SOP, logistics, reporting, and transform helpers. |
| `docs/context/` | Current app scope, routes, entities, operating model, gaps. |
| `docs/domain/` | Business truth for PR, DO, eFMS, SOP, and task workflow. |
| `docs/skills/` | Canonical active skill entries; primary skill files are named `SKILL.md`. |
| `docs/prompts/` | Prompt templates used to generate docs/skills. |

## Skill Map

| Skill | Path |
|---|---|
| Backend/API | `skills/backend-api/SKILL.md` |
| Data model | `skills/data-model/SKILL.md` |
| Frontend | `skills/frontend/SKILL.md` |
| MCP integration | `skills/mcp/SKILL.md` |
| Testing/QA | `skills/testing-qa/SKILL.md` |
| UI/UX | `skills/ui-ux/SKILL.md` |
| Workflow | `skills/workflow/SKILL.md` |

Detailed architecture and pattern files under each skill folder are references, not separate active skills unless they are named `SKILL.md`.

## Local Run

```bash
cp .env.example .env
pnpm seed:logistics
pnpm dev:be
pnpm dev
```

Default users:

- `manager@kbfe.local / manager123`
- `admin@kbfe.local / admin123`
