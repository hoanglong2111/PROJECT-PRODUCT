# KBFE Project Context

KBFE is an ERP logistics control tower for purchase demand, PO sourcing, Sea FCL Export shipment tracking, warehouse deadline risk, document readiness, customs handling, finance note closure, and task closure.

For project-wide business rules, SLA timers, the operating relay, SAP/eFMS scope, customs lanes, and finance-note sequencing, use `docs/context/OPERATING_MODEL.md`.

For detailed eFMS job flow, SI/Manifest/HBL/container fields, assignment, attachments, Google Drive dossier, and SOP codes, use `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`.

## Stack

- Frontend: Vite, React, TypeScript, Mantine, Tabler Icons, React Router, TanStack Query, Zustand.
- Backend: Express + normalized PostgreSQL tables in `server/`.
- API client/types: `src/api/logistics.ts` compatibility exports backed by `src/shared/api`.
- Seed data: `server/seeds/logisticsSeed.ts`, loaded into normalized tables with `pnpm seed:logistics`.
- MCP/RAG: not implemented yet.

## Architecture Map

| Area | Current location |
|---|---|
| App shell/routing | `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/routeRoles.ts` |
| Feature pages | `src/features/<feature>/page.tsx` with feature-local components/hooks/constants |
| Shared frontend | `src/shared/api`, `src/shared/auth`, `src/shared/components`, `src/shared/i18n`, `src/shared/stores`, `src/shared/theme`, `src/shared/utils` |
| Compatibility frontend exports | Legacy `src/api`, `src/auth`, `src/components`, `src/hooks`, `src/i18n`, `src/routes`, `src/stores`, `src/theme`, and `src/utils` paths |
| Backend bootstrap | `server/index.ts` |
| Backend route/service modules | `server/modules/<domain>/routes.ts` and `service.ts` |
| Shared backend services | `server/services/normalizedStore.ts`, `sop*.ts`, `logistics*.ts`, `exchangeRates.ts` |


## Core Chain

```text
PR -> PO -> DO -> Booking -> Documents -> Customs -> Delivery/POD -> Finance Notes -> Warehouse Entry
```

Supported PR/PO/DO business-flow tags:

| Tag | Shape |
|---|---|
| `LINEAR` | 1 PR -> 1 PO -> 1 DO |
| `BULK_PURCHASE` | N PR -> 1 PO -> 1 DO |
| `SPLIT_PURCHASE` | 1 PR -> N PO -> N DO |
| `PARTIAL_DELIVERY` | 1 PR -> 1 PO -> N DO |
| `CONTAINER_CONSOLIDATION` | N PR -> N PO -> 1 DO, where DO acts as shipment/container |

## Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard metrics, risk queue, flow distribution. |
| `/workflow` | PR/PO/DO relationship view. |
| `/purchase-requests` | PR list, source status, detail drawer. |
| `/purchase-orders` | PO list, source PR lines, SAP state, linked DO. |
| `/delivery-orders` | DO operations board, source lines, documents, tasks. |
| `/tasks` | Task ownership, progress, blockers, closure requirements. |
| `/settings` | Theme, language, admin account management. |

## Entity Essentials

| Entity | Key fields |
|---|---|
| PR | `requested_order_id`, `line_items`, `warehouse_deadline_date`, `linked_po_numbers`, `linked_do_numbers`, `flow_tags` |
| PO | `po_number`, `source_pr_codes`, `line_items`, `supplier_*`, `linked_do_numbers`, `sap_sync_status`, `flow_tags` |
| DO | `order_info.order_number`, `source_lines`, `sap_integration`, `logistics_shipping`, `warehouse_tracking`, `task_summary`, `flow_tags` |
| Task | `task_id`, `do_number`, `request_code`, `po_number`, `role`, `status`, `progress`, `is_required_for_do_closure` |

## Deep Links

Use query params for shareable context:

```text
/purchase-requests?pr=PR-2026-000145
/purchase-orders?po=PO-4500098123
/delivery-orders?do=DO-2026-000087
/delivery-orders?pr=PR-2026-000145
/tasks?do=DO-2026-000087
/tasks?task=TASK-2026-000553
/workflow?do=DO-2026-000087
/workflow?pr=PR-2026-000145
```

Closing a detail surface must remove only its own entity param and preserve unrelated query params.

## Risk Rules

- Compare actual warehouse entry against warehouse deadline when actual exists.
- Otherwise compare planned/expected entry against deadline as forecast risk.
- DO risk includes late/forecast-late entry, missing required documents, blocked tasks, and incomplete SAP sync.
- Mismatched Draft B/L, Commercial Invoice, Packing List, or quotation data blocks Final B/L confirmation.
- Required Port Officer verification and finance-note SLA timers should surface as operational risk when overdue.

## Current Gaps

- No dedicated test framework yet; verification is still `pnpm typecheck`, `pnpm build`, and manual smoke checks.
- MCP/RAG integration remains design-stage documentation.
- Supplier, warehouse, and material master maintenance screens are not separated into dedicated modules yet.
- External SAP is represented by local sync state/audit behavior, not a live SAP adapter.
- DO closure readiness exists as validation/derived state, but an explicit close action remains future workflow work.
- Legacy compatibility exports still exist while imports are migrated to `src/app`, `src/features`, and `src/shared`.

## Canonical Docs

- Operating model: `docs/context/OPERATING_MODEL.md`
- eFMS Sea FCL Export workflow: `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`
- Data model: `docs/skills/data-model/SKILL.md`
- Backend/API: `docs/skills/backend-api/SKILL.md`
- Frontend: `docs/skills/frontend/SKILL.md`
- UI/UX: `docs/skills/ui-ux/SKILL.md`
- ERP logistics UI: `docs/skills/ui-ux/erp-logistics-uiux.md`
- Workflow: `docs/skills/workflow/SKILL.md`
- Testing/QA: `docs/skills/testing-qa/SKILL.md`
- MCP integration: `docs/skills/mcp/SKILL.md`
