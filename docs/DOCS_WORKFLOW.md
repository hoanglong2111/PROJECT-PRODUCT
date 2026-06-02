# Documentation Workflow

Use this before editing files under `docs/`.

## Principle

GD1 Procurement & Import Tracking is the current documentation baseline. Do not mix older DO/eFMS export wording into new docs unless you are explicitly documenting runtime compatibility or migration gaps.

Read the smallest useful set of files. For broad GD1 changes, read:

1. `docs/context/PROJECT_CONTEXT.md`
2. `docs/context/OPERATING_MODEL.md`
3. `docs/database/GD1_DOCUMENT_ERD.md`
4. The focused module or skill file being changed

## Create Or Update Docs

1. Identify whether the change is GD1 product truth, runtime compatibility, or future migration planning.
2. Use GD1 names in new docs:
   - `purchase_request`
   - `purchase_request_line`
   - `purchase_order`
   - `purchase_order_line`
   - `shipment`
   - `shipment_line`
   - `shipment_milestone`
   - `shipment_cost`
   - `po_stage_task`
   - `po_task_template`
   - `approval_matrix_config`
3. If current code still uses a legacy name such as `delivery_orders`, mention it as a mapping, not as the GD1 canonical name.
4. Add one matching skill if needed:
   - UI/UX: `docs/skills/ui-ux/SKILL.md`
   - Frontend: `docs/skills/frontend/SKILL.md`
   - Backend/API: `docs/skills/backend-api/SKILL.md`
   - Data model: `docs/skills/data-model/SKILL.md`
   - Workflow: `docs/skills/workflow/SKILL.md`
   - Testing: `docs/skills/testing-qa/SKILL.md`
   - MCP/RAG: `docs/skills/mcp/SKILL.md`
5. Edit only the requested scope.
6. Update indexes or links when a new doc is created.

## New Doc Placement

| Need | Folder |
|---|---|
| Project-wide GD1 truth | `docs/context/` |
| Module/entity/workflow truth | `docs/modules/` |
| Database/ERD/migration truth | `docs/database/` |
| Future roadmap planning | `docs/future/` |
| Implementation rule | `docs/skills/<group>/` |
| Page-specific rule | `docs/skills/<group>/modules/` |
| Archived prompt or one-off note | `docs/archive/` |

## GD1 Consistency Checklist

- The PR chain is `PR -> Approval -> PO -> Shipment -> 10 milestones -> landed cost -> ERP/GRN sync`.
- Shipment has exactly 10 standard milestone slots.
- PR quantity conversion and PO shipment quantity rules are stated when relevant.
- PO revision after supplier send is preserved.
- Landed cost allocation points back to shipment cost and PO lines.
- PO-stage task templates can generate tasks on state transition.
- SLA rules match `docs/context/OPERATING_MODEL.md`.

## Anti-Patterns

- Treating `delivery_orders` as the GD1 canonical name instead of runtime compatibility.
- Duplicating long table schemas outside `docs/database/GD1_DOCUMENT_ERD.md`.
- Creating new support tables that the GD1 document did not define without marking them as assumptions.
- Editing API rules without checking data model rules.
- Editing UI rules without checking frontend implementation rules.
- Keeping stale Sea FCL Export-only wording where GD1 now covers SEA/AIR import tracking.

## Done

- Links point to canonical GD1 docs.
- Assumptions and future work are explicit.
- Runtime compatibility notes are separated from GD1 product truth.
- No unrelated docs were changed.
