# KBFE Docs

Docs in this folder are project-local context for the KBFE GD1 Procurement & Import Tracking platform. GD1 is the current documentation baseline.

## Read Order

1. `DOCS_WORKFLOW.md` when creating or changing docs.
2. `context/PROJECT_CONTEXT.md` for GD1 project truth.
3. `context/OPERATING_MODEL.md` for state machines, business rules, SLA, ERP/WMS events, and operating flow.
4. `database/GD1_DOCUMENT_ERD.md` for tables, types, constraints, and indexes from the GD1 document.
5. One focused module or skill file for the request.
6. Module/pattern files only when changing that exact screen or pattern.

## Project Map

| Path | Use |
|---|---|
| `frontend/src/app/` | React app shell, route config, and role guards. |
| `frontend/src/features/` | Feature route pages, feature-local components, hooks, API wrappers, and constants. |
| `frontend/src/shared/` | Cross-feature frontend API, auth, UI, i18n, stores, theme, hooks, and utilities. |
| `frontend/src/models/` | Shared TypeScript contracts that must stay compatible with API payloads. |
| `docs/context/` | GD1 scope, routes, entities, operating model, gaps. |
| `docs/modules/` | Module-level business truth for Procurement, Shipments, Tasks, Dashboard/Workflow, Integrations, and Platform support. |
| `docs/skills/` | Active agent skill entries and module implementation guidance. |
| `docs/future/` | Roadmap planning for GD2, GD3, full SCM, MCP/deploy, and cross-phase costing. |
| `docs/archive/` | One-off prompts, local command notes, pointer diagrams, and older generated artifacts. |

## Canonical GD1 Docs

| Document | Path |
|---|---|
| Project context | `context/PROJECT_CONTEXT.md` |
| Operating model | `context/OPERATING_MODEL.md` |
| PR module | `modules/procurement/purchase-requests.md` |
| PO module | `modules/procurement/purchase-orders.md` |
| Approval module | `modules/procurement/approvals.md` |
| Shipment module | `modules/shipments/shipment.md` |
| Shipment/SOP workflow | `modules/shipments/import-shipment-sop-sla.md` |
| PO-stage tasks | `modules/tasks/po-stage-tasks.md` |
| Integration events | `modules/integrations/erp-wms-outbox.md` |

## Skill Map

| Skill | Path |
|---|---|
| Frontend | `skills/frontend/SKILL.md` |
| MCP integration | `skills/mcp/SKILL.md` |
| Testing/QA | `skills/testing-qa/SKILL.md` |
| UI/UX | `skills/ui-ux/SKILL.md` |
| Workflow | `skills/workflow/SKILL.md` |

## Naming Note

GD1 uses `shipment`. Current runtime code may still expose `delivery_orders` or route `/delivery-orders`. Treat those as legacy/runtime names for the shipment concept until an explicit migration is implemented.

## Local Run

```bash
cp frontend/.env.example frontend/.env
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev
```

Default users:

- `manager@kbfe.local / manager123`
- `admin@kbfe.local / admin123`
