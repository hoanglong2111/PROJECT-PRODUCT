# Documentation Workflow

Use this before editing files under `docs/`.

## Principle

Do not load all docs by default. Read the project context plus the smallest domain/skill set needed for the request.

## Create Or Update Docs

1. Read `docs/context/PROJECT_CONTEXT.md`.
2. Read the specific file(s) mentioned by the request.
3. Add one matching skill if needed:
   - UI/UX: `docs/skills/ui-ux/SKILL.md`
   - Frontend: `docs/skills/frontend/SKILL.md`
   - Backend/API: `docs/skills/backend-api/SKILL.md`
   - Data model: `docs/skills/data-model/SKILL.md`
   - Workflow: `docs/skills/workflow/SKILL.md`
   - Testing: `docs/skills/testing-qa/SKILL.md`
   - MCP/RAG: `docs/skills/mcp/SKILL.md`
4. Edit only the requested scope.
5. Update indexes or links when a new doc is created.

## New Doc Placement

| Need | Folder |
|---|---|
| Project-wide truth | `docs/context/` |
| Entity/workflow truth | `docs/domain/` |
| Implementation rule | `docs/skills/<group>/` |
| Page-specific rule | `docs/skills/<group>/modules/` |
| Reusable prompt | `docs/prompts/` |

## Anti-Patterns

- Duplicating the same business rules in many files.
- Creating a new skill when a module reference is enough.
- Editing API rules without checking data model rules.
- Editing UI rules without checking frontend implementation rules.
- Keeping long generated examples when a short contract is enough.

## Done

- Content is shorter than before unless new scope requires detail.
- Links point to the canonical file.
- Assumptions and future work are explicit.
- No unrelated docs were changed.
