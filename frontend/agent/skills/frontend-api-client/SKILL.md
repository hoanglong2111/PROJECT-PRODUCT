---
name: frontend-api-client
description: >
  Build, refactor, or review typed API integrations for PROJECT-PRODUCT/frontend
  against the current KBI mock-only backend. Use when Codex must wire React,
  Axios, React Query, query keys, response mappers, or compatibility adapters to
  kbi-mock-api endpoints. Trigger on "fix frontend API", "connect mock API",
  "wire /api/v1", "replace UI mock data", "sync frontend with backend
  contract", or requests involving src/shared/api.
---

# Frontend API Client

Integrate the React frontend with the mock-only KBI backend while preserving the
existing feature-sliced frontend architecture.

## Project Sources

Read these first when the task touches contracts or runtime behavior:

- `PROJECT-PRODUCT/frontend/AGENTS.md`
- `PROJECT-PRODUCT/frontend/docs/modules/platform/api-integration.md`
- `kbi-mock-api/docs/API_CONTRACT.md`
- `kbi-mock-api/docs/MOCK_JSON_RUNTIME.md`
- Relevant files in `PROJECT-PRODUCT/frontend/src/shared/api`
- Relevant consuming page in `PROJECT-PRODUCT/frontend/src/features/<feature>/page.tsx`

## Current Runtime Contract

- Base URL is configured by `VITE_API_URL` and normalized in
  `src/shared/api/axiosConfig.ts`; default target is `http://localhost:3001/api`.
- Canonical business endpoints use `/api/v1/*` and return:

```json
{ "data": {}, "meta": {}, "errors": [] }
```

- Error entries use `error_code`, `message`, and `details`.
- Legacy master-data compatibility endpoints under `/api/*` still exist for
  `tradeMasterData.ts` and `items.ts`; do not migrate them unless the task asks.
- Generic debug/mutation endpoints are available as `/api/v1/mock/:collection`.
  Use them only when a real business endpoint is absent.
- Collection names may be table-style, such as `purchase_orders`, or file-style,
  such as `purchase-orders`.

## Mock API Boundaries

- Backend runtime is mock JSON only. Do not add PostgreSQL, Prisma, database URL,
  migration, or backend imports to frontend code.
- LOT planning has no active delivery slot layer. Do not call `/delivery-slots`,
  `/move-slot`, or depend on `delivery_slot_id` or `slot_id`.
- Active LOT response shape is:

```ts
{
  purchase_order: PurchaseOrderV1;
  po_lines: PurchaseOrderLineV1[];
  lots: Array<PoLot & { items: PoLotLine[] }>;
}
```

- PO create returns the LOT planning board; frontend helpers should unwrap and
  return `data.purchase_order` when a page expects a PO header.
- Supplier confirmation is `POST /api/v1/purchase-orders/:id/confirmations`.
- DO creation is `POST /api/v1/delivery-orders/from-lots` with `lot_ids`.
- Shipment creation is `POST /api/v1/shipments/from-delivery-order`; the backend
  updates the source DO status.
- Quotation, shipment, customs, Carrier DO, and DTO endpoints exist in
  `API_CONTRACT.md`; avoid inventing route names such as `/request`,
  `/receive`, `/submit-to-kbi`, `/versions`, `/confirm-quotation`,
  `/assign-to-shipment`, or `/mark-ready-to-ship` unless the contract adds them.

## Outputs

- Typed modules in `src/shared/api`.
- Stable query keys in `src/shared/api/queryKeys.ts`.
- Page-level `useQuery` and `useMutation` wiring, with invalidation.
- Compatibility mappers in `src/shared/api/logistics.ts` when old UI models must
  consume newer V1 DTOs.
- Focused tests for query keys, mappers, or stores when behavior is non-trivial.
- Verification notes listing commands run.

## Workflow

1. Read the contract and current client - identify exact path, method, body,
   response wrapper, and whether the frontend already has a compatibility adapter.
2. Prefer business endpoints - use `/api/v1/*` routes from `API_CONTRACT.md`.
   Fall back to `/api/v1/mock/:collection` only for header/status patch or CRUD
   operations missing from the business API.
3. Preserve boundary types - keep API field names such as `purchase_order_id`,
   `delivery_order_id`, `lot_ids`, `currency_code`, and `qty_lotted` at the API
   boundary; map only for UI compatibility models.
4. Normalize responses - unwrap `{ data, meta, errors }`; surface
   `errors[0].message`; preserve `errors[0].error_code` in normalized errors.
5. Hydrate details when needed - if a list endpoint returns light rows, fetch
   detail, lines, lots, charge lines, milestones, or documents before mapping a
   page that expects nested UI data.
6. Update query keys and invalidation - invalidate the affected list, detail,
   dashboard, and related parent entity keys after mutations.
7. Keep server state in React Query - use Zustand only for UI state such as
   filters, selected ids, draft forms, and workspace preferences.
8. Validate - run `npm.cmd run typecheck`; also run `npm.cmd run test` for query
   keys/mappers and `npm.cmd run build` for broad API-adapter changes.

## Rules

- Keep shared API code under `src/shared/api`.
- Keep feature-specific UI behavior under `src/features/<feature>`.
- Use aliases such as `@shared/api/...`; do not import backend code.
- Keep decimal/API numeric fields as `string | number` at boundaries.
- Use named exports and existing file style: TypeScript, two-space indentation,
  single quotes, and semicolons.
- Do not add a new API client if `apiClient` in `axiosConfig.ts` can be reused.
- Do not silently convert endpoint names from the old DB-first API; check
  `API_CONTRACT.md` first.

## Validation Checklist

| Check | Pass Criteria |
|---|---|
| Contract aligned | Every route exists in `API_CONTRACT.md` or uses documented `/v1/mock` fallback |
| Response unwrapped | V1 `{ data, meta, errors }` and compatibility `{ data }` are handled separately |
| Slot removed | No active `delivery_slot_id`, `slot_id`, `/delivery-slots`, or `/move-slot` usage |
| State ownership clear | React Query owns server records; Zustand owns UI state only |
| Errors useful | Backend `message` and `error_code` survive Axios normalization |
| Verification run | Typecheck plus focused tests/build are reported as appropriate |

## Example

Task: "Fix the PO screen to use the new mock LOT API."

Expected approach:

1. Read `API_CONTRACT.md`, `purchaseOrders.ts`, `queryKeys.ts`, and
   `features/purchase-orders/page.tsx`.
2. Ensure `fetchPurchaseOrderLotPlanning` calls
   `GET /v1/purchase-orders/:id/lot-planning`.
3. Ensure create/update/delete LOT use `/v1/purchase-orders/:id/lots` and
   `/v1/po-lots/:lotId`.
4. Ensure drag/drop uses `/v1/po-lot-lines/:lineId/move` and split uses
   `/v1/po-lot-lines/:lineId/split`.
5. Remove any Slot assumptions from types and UI.
6. Run `npm.cmd run typecheck` and report the result.
