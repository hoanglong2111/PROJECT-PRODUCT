# KBFE Docs

Docs in this folder are project-local context for the KBFE logistics control tower. Load only the files needed for the task.

## Read Order

1. `DOCS_WORKFLOW.md` when creating or changing docs.
2. `context/PROJECT_CONTEXT.md` for current project truth.
3. `context/OPERATING_MODEL.md` when the task touches business flow, SLA, rules, SAP/eFMS, customs, or finance closure.
4. `domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md` when the task needs detailed eFMS job/SOP code mapping.
5. One focused domain or skill file for the request.
6. Module/pattern files only when changing that exact screen or pattern.

## Map

| Folder | Use |
|---|---|
| `context/` | Current app scope, routes, entities, operating model, gaps. |
| `domain/` | Business truth for PR, DO, task workflow. |
| `skills/backend-api/` | API contracts, validation, backend boundaries. |
| `skills/data-model/` | Types, relationships, derived fields. |
| `skills/frontend/` | React/Mantine/TanStack Query implementation rules. |
| `skills/ui-ux/` | ERP logistics UX rules and page references. |
| `skills/workflow/` | Business-flow documentation rules. |
| `skills/testing-qa/` | Verification and regression checklist. |
| `skills/mcp/` | Future MCP/RAG integration contract. |
| `prompts/` | Prompt templates used to generate docs/skills. |

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
