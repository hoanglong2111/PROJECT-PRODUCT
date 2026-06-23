# Frontend API Contract

> Purpose: this is the **interface the frontend depends on** — the agreed shape of
> requests, responses, and endpoints the SPA calls. It is **owned by the frontend**
> and is **backend-agnostic**.
>
> This contract is *implemented today* by a mock backend (currently the separate
> `kbi-mock-api` repo), but the frontend must depend on **this contract only** — never on backend internals (mock
> JSON files, seed scripts, a specific database schema). Any backend (the current
> mock, or a future real DB-backed service) that honours this contract is a valid
> drop-in replacement, and swapping it must require **zero frontend changes**.
>
> Source of truth for frontend work: this document + the frontend code in
> `src/shared/api`. The backend is a separate repo; if present it may keep its own
> implementation notes (e.g. `kbi-mock-api/docs/*`) describing *how* the contract is
> currently served — **not** required reading to build a frontend feature. On any conflict about
> what the frontend may rely on, **this document wins** — and when the real backend
> arrives, reconcile this contract with the backend team and update it here.

## Contents

- [1. Transport](#1-transport)
- [2. Standard envelope](#2-standard-envelope)
- [3. Screen-DTO principle](#3-screen-dto-principle)
- [4. Business endpoints](#4-business-endpoints)
- [5. Dev-only scaffolding — NOT part of the contract](#5-dev-only-scaffolding--not-part-of-the-contract)
- [6. Boundaries the frontend must keep](#6-boundaries-the-frontend-must-keep)
- [7. Changing the contract](#7-changing-the-contract)

---

## 1. Transport

- REST over HTTP, JSON request/response bodies.
- Base URL comes from `VITE_API_URL`, normalized in
  [`src/shared/api/axiosConfig.ts`](../src/shared/api/axiosConfig.ts) to always end
  with `/api`. The current dev default is `http://localhost:3001/api`, but the
  frontend must read it from config and **never hardcode a host/port**.
- Canonical business routes are versioned under `/v1/*` — i.e. the full path is
  `${VITE_API_URL}/v1/*` (e.g. `/api/v1/purchase-orders`). API modules pass the
  `/v1/...` suffix; the `/api` prefix lives in the base URL.

## 2. Standard envelope

Every business response uses the same envelope:

```json
{ "data": {}, "meta": {}, "errors": [] }
```

- Read business payloads from `response.data`.
- `meta` carries pagination/summary when present.
- Errors are returned in `errors[]`, each entry shaped as:

```json
{ "error_code": "VALIDATION_ERROR", "message": "field is required", "details": {} }
```

Error codes the frontend should expect: `VALIDATION_ERROR`, `NOT_FOUND`,
`STATE_CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`.

The shared Axios interceptor normalizes failures by surfacing `errors[0].message`
and preserving `errors[0].error_code` (see `axiosConfig.ts`). Validate critical
responses at the boundary with the dev-only zod guard
(`src/shared/api/contracts`, `parseContract`) — it warns on contract drift, never
throws.

## 3. Screen-DTO principle

The frontend is **UI-first**: screens consume already-joined **screen DTOs**, not
raw table-like resources.

```txt
screen UI  ->  screen DTO (this contract)  ->  backend implementation (mock today, real DB later)
```

- Prefer screen-ready endpoints (e.g. `/v1/purchase-orders/:id/lot-planning`,
  `/v1/delivery-orders/screen`) that return joined UI data.
- Do **not** rebuild a screen by manually joining many table-like resources in a
  feature component. If a screen needs joined data and no screen endpoint exists,
  that is a contract gap to add here — not a join to hand-roll in the UI.
- Keep API field names at the boundary (`purchase_order_id`, `delivery_order_id`,
  `lot_ids`, `currency_code`, `qty_lotted`, …); map to UI models only in
  `src/shared/api`, never assume the backend's storage layout.

## 4. Business endpoints

Canonical `/v1/*` routes the frontend depends on, grouped by domain. (Methods are
indicative of current usage; see the matching module in `src/shared/api` for the
exact request/response types.)

### Purchase Orders & Supplier Confirmation
- `GET|POST /v1/purchase-orders`
- `GET|PATCH /v1/purchase-orders/:id`
- `POST /v1/purchase-orders/:id/send`
- `POST /v1/purchase-orders/:id/cancel`
- `GET|POST /v1/purchase-orders/:id/confirmations`
- `GET /v1/purchase-orders/:id/lines`
- `GET /v1/purchase-orders/:id/delivery-orders`

### LOT Planning
- `GET /v1/purchase-orders/:id/lot-planning` — screen DTO (PO + lines + lots with items)
- `POST /v1/purchase-orders/:id/lots`
- `PATCH|DELETE /v1/po-lots/:lotId`
- `POST /v1/po-lots/reorder`
- `POST /v1/po-lot-lines/:lineId/move`
- `POST /v1/po-lot-lines/:lineId/split`
- `POST /v1/po-lot-lines/reorder`

### Delivery Orders (Internal DO)
- `GET /v1/delivery-orders`
- `GET /v1/delivery-orders/screen` — screen DTO (list with task_summary / missing_documents / warehouse)
- `GET /v1/delivery-orders/:id`
- `POST /v1/delivery-orders/from-lots`
- `POST /v1/delivery-orders/:id/ready-for-quotation`
- `POST /v1/delivery-orders/:id/cancel`
- `GET /v1/delivery-orders/:id/lots`
- `GET /v1/delivery-orders/:id/lines`
- `GET|POST /v1/delivery-orders/:id/documents`
- `PATCH|DELETE /v1/delivery-order-documents/:documentId`

### Quotations
- `GET /v1/quotations` · `GET /v1/quotations/:id`
- `GET|POST /v1/delivery-orders/:id/quotations`
- `POST /v1/quotations/:id/confirm-by-kbi`
- `POST /v1/quotations/:id/mark-final`
- `POST /v1/quotations/:id/reject`
- `POST /v1/quotations/:id/cancel`
- `POST /v1/quotations/:id/create-version`
- `GET|POST /v1/quotations/:id/charge-lines`
- `PATCH|DELETE /v1/quotation-charge-lines/:id`
- `GET /v1/quotations/:id/events`

### Shipments
- `GET /v1/shipments` · `GET|PATCH /v1/shipments/:id`
- `POST /v1/shipments/from-delivery-order`
- `POST /v1/shipments/:id/cancel`
- `GET /v1/shipments/:id/lines`
- `GET /v1/shipments/:id/milestones`
- `POST /v1/shipments/:id/milestones/:code/done`
- `GET|POST /v1/shipments/:id/documents` · `PATCH|DELETE /v1/shipment-documents/:id`
- `GET|POST /v1/shipments/:id/costs` · `PATCH|DELETE /v1/shipment-costs/:id`
- `GET|POST /v1/shipments/:id/containers` · `PATCH|DELETE /v1/shipment-containers/:containerId`

### Customs (inside Shipment detail)
- `GET|POST /v1/shipments/:id/customs-declarations`
- `GET|PATCH /v1/customs-declarations/:id`
- `GET|POST /v1/customs-declarations/:id/lines`
- `PATCH|DELETE /v1/customs-declaration-lines/:lineId`
- `POST /v1/customs-declarations/:id/open-draft`
- `POST /v1/customs-declarations/:id/open-official`
- `POST /v1/customs-declarations/:id/clear`
- `POST /v1/customs-declarations/:id/cancel`

### Carrier Delivery Orders (inside Shipment detail)
- `GET|POST /v1/shipments/:id/carrier-delivery-orders`
- `POST /v1/carrier-delivery-orders/:id/issue`
- `POST /v1/carrier-delivery-orders/:id/release`
- `POST /v1/carrier-delivery-orders/:id/cancel`

### Domestic Transport Orders (DTO)
- `GET /v1/domestic-transport-orders` · `GET|PATCH /v1/domestic-transport-orders/:id`
- `POST /v1/shipments/:id/domestic-transport-orders` — create from one shipment
- `POST /v1/domestic-transport-orders/consolidate` — atomic multi-shipment (LCL) create
- `GET /v1/shipments/:id/domestic-transport-orders`
- `POST /v1/shipments/:id/domestic-transport-orders/link`
- `DELETE /v1/shipments/:id/domestic-transport-orders/:dtoId/unlink`
- `POST /v1/domestic-transport-orders/:id/:action` — status transitions (dispatch, pod-received, close, …)

### Tasks
- `GET|POST /v1/tasks`
- `PATCH /v1/tasks/:id`
- `GET /v1/purchase-orders/:poNumber/tasks`

### Master data (compatibility endpoints)
Mounted under `/api/*` (no `/v1`) and returning compatibility shapes
(`{ data, total, pagination }` for lists, `{ data }` for detail, `{ data, message }`
for mutations): `/currencies`, `/incoterms`, `/transport-modes`, `/suppliers`,
`/forwarders`, `/carriers`, `/items`, `/item-groups`, `/item-tax-profiles`,
`/task-templates`, `/options`. These are part of the contract but use the legacy
envelope above; handle their shapes separately from the `/v1` envelope.

---

## 5. Dev-only scaffolding — NOT part of the contract

> The items below exist **only** to keep the frontend moving while there is no real
> backend. They are **mock-implementation scaffolding**, not a contract the frontend
> may build on. They **will not exist** against a real backend, so a frontend feature
> must never depend on them long-term. Quarantine every use inside `src/shared/api`
> adapters (clearly commented as dev-only); they must **never** leak into feature
> components, and each should be replaced by a real business endpoint as the contract
> grows.

- **Generic mock CRUD** — `/v1/mock/:collection` and `/v1/mock/:collection/:id`
  (used today for PO/DO/quotation header patches and PO-line CRUD where no business
  endpoint exists yet). Collection names may be table-style (`purchase_orders`,
  `purchase_order_lines`, `quotations`, `delivery_orders`). Each such call is a
  **known contract gap** to be promoted to a real `/v1/*` route.
- **Deterministic dev IDs** — stable mock IDs are a convenience for local dev/tests
  only; never assume an ID scheme, sequence, or that a seeded ID exists.
- **Seed/reset tooling** — `npm run mock:seed` and the `mock-data/*.json` files live
  in the backend repo. The frontend must not read those files or assume seeded
  records; treat all data as fetched at runtime through the endpoints above.

## 6. Boundaries the frontend must keep

- Do not add a database, ORM/Prisma, migration, DB URL, or any backend import to
  frontend code (enforced by `dependency-cruiser`). The frontend must not assume
  *how* the backend stores data.
- Do not depend on removed/stale backend docs or on `docs/modules/*`.
- No active LOT delivery-slot layer: never call `/delivery-slots` or `/move-slot`,
  and never depend on `delivery_slot_id` / `slot_id`.

## 7. Changing the contract

When a screen needs a new shape or endpoint:

1. Update **this document** first (it is the frontend's source of truth).
2. Wire the typed client in `src/shared/api` + query keys + invalidation.
3. Have the current backend implement it (today: the mock API; later: the real
   service). Keep this contract and the backend implementation in sync in the same
   change.
