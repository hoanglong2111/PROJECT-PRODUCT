---
name: frontend-api-client
description: >
  Build, refactor, or review typed API integrations for the KBFE frontend SPA
  against the frontend's API contract (docs/API_CONTRACT.md), which a mock backend
  implements today and a real backend will implement later. Use when wiring React,
  Axios, React Query, query keys, response mappers, or compatibility adapters to the
  contract's endpoints. Trigger on "fix frontend API", "connect backend API",
  "wire /api/v1", "replace UI mock data", "sync frontend with API contract", or
  requests involving src/shared/api.
---

# Frontend API Client

Integrate the React frontend with the backend **through the frontend's API contract**
(`docs/API_CONTRACT.md`) while preserving the feature-sliced architecture. The contract
is backend-agnostic: a mock backend serves it today, a real one later, and frontend code
must depend on the contract — never on a backend's internals.

## Read first

Paths are relative to the **frontend package root** (`PROJECT-PRODUCT/frontend/` in the
current monorepo; the repo root in a standalone clone).

- `docs/API_CONTRACT.md` — source of truth: transport, envelope, error shape, business
  endpoints, master-data compat shapes, dev-only scaffolding, boundaries.
- `docs/FE_rule.md` — screen list and per-screen business rules.
- `AGENTS.md` — architecture, FSD layout, state management, dependency boundaries.
- `src/shared/api/*` — current typed clients; `src/features/<feature>/page.tsx` — consumer.

If a rule conflicts, prefer current frontend code, `docs/API_CONTRACT.md`, `docs/FE_rule.md`,
and `AGENTS.md` — never a backend implementation detail or stale `docs/modules/*`.

## Contract reference (read it, do not restate)

The contract lives in `docs/API_CONTRACT.md`; pull these from there rather than copying:

- Base URL via `VITE_API_URL` (never hardcode host/port); `/v1/*` envelope
  `{ data, meta, errors }`; error `{ error_code, message, details }` — §1–2.
- Business endpoints by domain — §4. Master-data compat endpoints (`/api/*`, legacy
  shapes `{ data, total, pagination }` / `{ data }`) handled separately from `/v1` — §4.
- Dev-only mock scaffolding (`/v1/mock/:collection`, `mock:seed`, deterministic IDs):
  quarantine in `src/shared/api`, never in features, promote to real `/v1/*` — §5.
- No DB assumption and no LOT slot layer (`/delivery-slots`, `slot_id`) — §6.

## Frontend-side specifics

- Active LOT response shape:

```ts
{ purchase_order: PurchaseOrderV1; po_lines: PurchaseOrderLineV1[];
  lots: Array<PoLot & { items: PoLotLine[] }>; }
```

- PO create returns the LOT planning board; unwrap and return `data.purchase_order`
  when a page expects a PO header.
- Supplier confirmation `POST /v1/purchase-orders/:id/confirmations`; DO from lots
  `POST /v1/delivery-orders/from-lots` (`lot_ids`); shipment
  `POST /v1/shipments/from-delivery-order` (backend updates the source DO status).
- Do not invent route names (`/request`, `/receive`, `/submit-to-kbi`,
  `/confirm-quotation`, `/assign-to-shipment`, `/mark-ready-to-ship`) — check the
  contract first.

## Outputs

- Typed modules in `src/shared/api`; stable keys in `src/shared/api/queryKeys.ts`.
- Page-level `useQuery`/`useMutation` wiring with invalidation.
- Compatibility mappers in `src/shared/api/logistics.ts` when old UI models consume V1 DTOs.
- Focused tests for query keys/mappers/stores when behavior is non-trivial.
- Verification notes listing commands run.

## Workflow

1. Read the contract and current client — identify exact path, method, body, response
   wrapper, and whether a compatibility adapter already exists.
2. Apply `FE_rule.md` — use screen DTOs, avoid local JSON imports, keep LOT Planning
   slot-free, and let backend responses be the source of truth after mutations.
3. Prefer business endpoints — `/v1/*` from `docs/API_CONTRACT.md`. Fall back to the
   dev-only `/v1/mock/:collection` only when a business endpoint is absent, kept inside
   `src/shared/api`.
4. Preserve boundary types — keep API field names (`purchase_order_id`, `lot_ids`,
   `currency_code`, `qty_lotted`); map only for UI compatibility models.
5. Normalize responses — unwrap `{ data, meta, errors }`; surface `errors[0].message`;
   preserve `errors[0].error_code`.
6. Hydrate details when needed — fetch detail/lines/lots/charge-lines/milestones/documents
   before mapping a page that expects nested UI data.
7. Update query keys and invalidate the affected list, detail, dashboard, and parent keys.
8. Keep server state in React Query; use Zustand only for UI state (filters, selected ids,
   draft forms, preferences).
9. Validate — `npm run typecheck`; add `npm run test` for keys/mappers and `npm run build`
   for broad adapter changes.

## Rules

- Shared API code under `src/shared/api`; feature UI under `src/features/<feature>`.
- Use aliases (`@shared/api/...`); do not import backend code; reuse `apiClient` from
  `axiosConfig.ts` rather than adding a new client.
- Keep decimal/numeric API fields as `string | number` at boundaries.
- Named exports, existing style: TypeScript, two-space indent, single quotes, semicolons.

## Validation Checklist

| Check | Pass Criteria |
|---|---|
| Contract aligned | Every route exists in `docs/API_CONTRACT.md` or uses the dev-only `/v1/mock` fallback |
| Backend-agnostic | No host/port hardcoded, no DB assumption; mock scaffolding stays in `src/shared/api` |
| FE rules aligned | Follows `FE_rule.md`; no dependence on removed `docs/modules` docs |
| Response unwrapped | `/v1` `{ data, meta, errors }` and compat `{ data }` handled separately |
| Slot removed | No `delivery_slot_id`, `slot_id`, `/delivery-slots`, or `/move-slot` |
| State ownership | React Query owns server records; Zustand owns UI state only |
| Errors useful | Backend `message` and `error_code` survive Axios normalization |
| Verification run | Typecheck plus focused tests/build reported |

## Example

Task: "Fix the PO screen to use the LOT planning API."

1. Read `docs/API_CONTRACT.md`, `purchaseOrders.ts`, `queryKeys.ts`, and
   `features/purchase-orders/page.tsx`.
2. Ensure `fetchPurchaseOrderLotPlanning` calls `GET /v1/purchase-orders/:id/lot-planning`.
3. Ensure create/update/delete LOT use `/v1/purchase-orders/:id/lots` and `/v1/po-lots/:lotId`.
4. Ensure drag/drop uses `/v1/po-lot-lines/:lineId/move` and split `/v1/po-lot-lines/:lineId/split`.
5. Remove any Slot assumptions from types and UI.
6. Run `npm run typecheck` and report the result.
