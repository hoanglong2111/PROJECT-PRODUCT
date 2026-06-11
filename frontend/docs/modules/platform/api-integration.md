# Frontend API Integration Baseline

Last updated: 2026-06-11

This document records which frontend areas are currently wired to the KBI mock API and which areas still use UI-only compatibility data.

Backend API source of truth:

- `kbi-mock-api/docs/api_doc.md`
- Local base URL: `http://localhost:3001/api`
- Frontend config: `VITE_API_URL`, defaulting through `src/shared/api/axiosConfig.ts`

## Shared Rules

- Keep API clients in `src/shared/api`.
- Use React Query for server state.
- Keep endpoint payloads in backend field names, such as `supplier_id`, `purchase_order_id`, `lot_ids`, and `transport_mode_id`.
- `/api/v1/*` responses use `{ data, meta, errors }`.
- Master-data endpoints use `{ data }`, paginated list wrappers, and mutation `message` fields.
- Decimal fields may arrive as strings or numbers.

## Current API Coverage

| Area | Runtime source | Frontend client |
|---|---|---|
| Master data: currencies, incoterms, transport modes, suppliers | Real API | `src/shared/api/tradeMasterData.ts` |
| Master data: item groups, items, customs profiles | Real API | `src/shared/api/items.ts` |
| Purchase Orders V1 | Real API | `src/shared/api/purchaseOrders.ts` |
| PO LOT planning | Real API | `src/shared/api/purchaseOrders.ts` |
| Internal Delivery Orders V1 | Real API | `src/shared/api/deliveryOrders.ts` |
| Delivery Order list/detail compatibility view | Real API through adapter | `src/shared/api/logistics.ts` |
| Quotations | UI-only compatibility data | `src/shared/api/logistics.ts` |
| Shipments | UI-only compatibility data | `src/shared/api/logistics.ts` |
| Tasks / SLA | UI-only compatibility data | `src/shared/api/logistics.ts` |
| Dashboard stats | UI-only compatibility data | `src/shared/api/logistics.ts` |

## Purchase Order V1

The PO screen calls `/api/v1/purchase-orders` directly.

Supported frontend operations:

- list, detail, create, update, delete
- send, confirm, cancel
- mark in production, mark ready to ship
- PO lines list/create/update/delete
- LOT planning reset, slot CRUD, LOT CRUD
- LOT split, merge, merge-back-default, transfer lines, move slot, reorder

PO status values currently supported by frontend types:

```text
DRAFT -> SENT -> CONFIRMED -> IN_PRODUCTION -> READY_TO_SHIP
CANCELLED
```

## Delivery Order V1

The canonical backend DO lifecycle currently exposed to the frontend is:

```text
DRAFT
-> READY_FOR_QUOTATION
-> QUOTATION_CONFIRMED
-> ASSIGNED_TO_SHIPMENT
-> CLOSED
CANCELLED
```

Frontend API coverage:

- list/detail via `fetchDeliveryOrdersV1`, `fetchDeliveryOrderV1`
- create header via `createDeliveryOrderV1`
- create from selected PO LOTs via `createDeliveryOrderFromLots`
- update/delete
- actions: ready for quotation, confirm quotation, assign to shipment, cancel, close
- sub-resources: delivery order LOTs and lines
- PO sub-resource: delivery orders for a purchase order

The existing Delivery Orders page still expects the older UI shape from `@shared/model/logistics`. To keep the screen stable while moving to real data, `src/shared/api/logistics.ts` adapts `DeliveryOrderV1` into that compatibility shape. The adapter maps real backend fields for DO number, PO, supplier, transport mode, LOTs, lines, dates, and status; fields not yet provided by V1 endpoints remain empty or zero.

## Known Compatibility Boundaries

- The Delivery Orders page now reads real DO rows and can run real DO lifecycle actions.
- Quotation comparison and document upload panels still use UI-only data because there is no matching backend endpoint in `api_doc.md`.
- Shipment, task, and dashboard stats remain UI-only until backend endpoints are available or a read-model endpoint is added.
- `CreateDeliveryOrderDrawer` still represents the older PO-line selection UX. The backend-preferred creation path is `createDeliveryOrderFromLots`, which should be wired from selected PO LOTs in LOT planning.

## Next Integration Step

The next high-value backend wiring is a focused DO creation flow:

1. Select a confirmed/in-production/ready-to-ship PO.
2. Fetch its LOT planning board.
3. Select one or more eligible active LOTs.
4. Submit `POST /api/v1/delivery-orders/from-lots`.
5. Invalidate DO list, PO detail, PO LOT planning, and dashboard queries.

Do not wire shipment/task screens to mock assumptions as real API unless their endpoints are present in `api_doc.md`.
