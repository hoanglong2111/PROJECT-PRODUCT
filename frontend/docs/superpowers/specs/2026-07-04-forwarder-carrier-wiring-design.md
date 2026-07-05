# Wire Forwarder & Carrier master data into operations — Design

**Date:** 2026-07-04
**Package:** `PROJECT-PRODUCT/frontend` (FE-owned contract; mock synced to match)
**Status:** Approved design, pending plan

## Context / Problem

The system has three distinct real-world parties, each with its own master-data
entity and admin screen:

- **Supplier** (`supplier_type` OVERSEAS_SEA / OVERSEAS_AIR / DOMESTIC) — the party
  that **sells the goods** we buy.
- **Forwarder** (`forwarder_type` SEA / AIR / **TRUCKING** / MULTI) — the party that
  **organises/coordinates** a shipment (books space, files docs, collects local
  charges). Per docs `03_Forwarder.html`, FDS itself is the primary forwarder, and a
  domestic trucking company is a `forwarder_type = TRUCKING`.
- **Carrier** (`carrier_type` SHIPPING_LINE / AIRLINE) — the party that **physically
  moves** the cargo with its own assets (MSC, COSCO, Vietnam Airlines Cargo…). Docs:
  "Carrier thường do FDS chọn và booking. KBI chỉ cần biết để tracking."

In the current frontend these are conflated: operational flows pick a **Supplier**
(or free text) wherever a Forwarder or Carrier is meant. As a result the Forwarder and
Carrier master data are **orphaned** — visible only on the master-data admin page,
never used in the Shipment / DTO / Carrier-DO flows.

### Audit — mismatch sites

| # | Location | Current (wrong) | Correct target |
|---|---|---|---|
| 1 | DTO "Truck vendor" picker — `features/domestic-transport-orders/page.tsx:155` | `fetchSuppliers({ role: 'TRUCKING_VENDOR' })`; `truck_vendor: Supplier` | Forwarder (`forwarder_type` TRUCKING/MULTI) |
| 2 | Shipment container-creation "Truck vendor" — `features/shipments/components/CreateDtoFromShipmentPanel.tsx:99` | `fetchSuppliers({ role: 'TRUCKING_VENDOR' })` | Forwarder (TRUCKING/MULTI) |
| 3 | Carrier-DO "Forwarder" picker — `features/shipments/components/ShipmentCarrierDoPanel.tsx:58` | label "Forwarder" but list = `fetchSuppliers()` (no role filter); shows `cdo.forwarder?.supplier_name` | Forwarder master |
| 4 | Shipment `carrier` field — `ShipmentDetailView.tsx:309`, `ShipmentListView`, filters | free-text string, never linked to Carrier master | reference to Carrier master |
| 5 | DTO detail + Shipment detail — display | forwarder/carrier not surfaced from master | show the linked Forwarder / Carrier |

## Goals

- Operational pickers select from the **real Forwarder / Carrier master**, not Supplier.
- Forwarder & Carrier master data is **surfaced** in the Shipment / DTO / Carrier-DO
  screens (no longer orphaned).
- Change is **data-driven & backend-agnostic**: expressed in FE types + `API_CONTRACT.md`,
  with the mock synced to implement it. A real backend swaps in by returning the same
  shape — no UI change.

## Non-goals

- Do **not** modify the `Supplier` entity or remove the `TRUCKING_VENDOR` supplier role
  (just stop mis-using Supplier for forwarder/carrier).
- Do not rename the existing `truck_vendor_id` / `forwarder_id` fields.
- No new database (mock stays mock).

## Target model & contract changes (FE-owned)

Field names stay; the entity they reference changes.

1. **DTO `truck_vendor_id`** (`shared/api/domesticTransportOrders.ts`) — embedded
   relation `truck_vendor?: Supplier` → `truck_vendor?: Forwarder`. Still a domestic
   trucking party, now a Forwarder (TRUCKING/MULTI).
2. **Carrier-DO `forwarder_id`** (`shared/api/carrierDeliveryOrders.ts`,
   `domesticTransportOrders.ts`) — embedded `forwarder?: Supplier` → `forwarder?: Forwarder`.
3. **Shipment `forwarder_id`** (`shared/api/shipments.ts:180`) — embedded
   `forwarder?: Supplier` → `forwarder?: Forwarder`.
4. **Shipment carrier** — add **`carrier_id: string | null`** + embedded
   `carrier?: Carrier` to `ShipmentV1`, `CreateShipmentFromDeliveryOrderPayload`,
   `UpdateShipmentPayload`. **Keep** the existing `carrier` string
   (mapped to `ShipmentRecord.carrier_name`) for backward-compatible list/detail/filter.
   Selecting a `carrier_id` also sets `carrier` (the display name), so existing
   filters keep working.

`docs/API_CONTRACT.md` is updated for all of the above; mock data + mock responses are
then synced to return Forwarder/Carrier objects in these relations.

## Components & data flow

Reuse what already exists — no new API client is needed:

- `shared/api/forwarders.ts` already provides `fetchForwarders` /
  `normalizeForwarder` (supports `forwarder_type` filter) and `fetchCarriers` /
  `normalizeCarrier` (supports `carrier_type` filter).
- `shared/api/queryKeys.ts` already has `forwarders`, `carriers`, `forwarderDetail`,
  `carrierDetail` keys.

Fix sites:

- **#1, #2 (truck vendor):** swap the supplier query for
  `fetchForwarders({ forwarder_type: 'TRUCKING' /* + MULTI */, is_active: true })`;
  options built from `forwarder_code - forwarder_name`. `truck_vendor_id` still carries
  the chosen id (now a forwarder id).
- **#3 (Carrier-DO forwarder):** swap `fetchSuppliers` for `fetchForwarders({ is_active: true })`;
  display `cdo.forwarder?.forwarder_name`.
- **#4 (Shipment carrier):** add a Carrier `Select` in the shipment create/update
  surface, sourced from `fetchCarriers`, filtered by mode
  (SEA→SHIPPING_LINE, AIR→AIRLINE); on change, set both `carrier_id` and `carrier`
  (name). Detail/list keep rendering `carrier_name`.
- **#5 (display):** DTO detail shows the linked Forwarder; Shipment detail shows the
  linked Carrier + Forwarder read-only.

### Normalizers (swap-friendly)

Where a relation is embedded, add/adjust the normalizer so `truck_vendor` / `forwarder`
parse as `Forwarder` and `carrier` as `Carrier` via the existing `normalizeForwarder` /
`normalizeCarrier`. When a real backend replaces the mock, returning the same shape
requires no UI change.

### i18n

Relabel so the two roles read distinctly: "Forwarder (Đơn vị giao nhận)" vs
"Hãng tàu/bay (Carrier)". `glossary.forwarder` hint already exists; add a carrier
glossary hint. Keep both EN and VN message blocks in sync (MessageKey union).

## Defaults chosen (no further input needed)

- Truck-vendor picker filters `forwarder_type` ∈ {TRUCKING, MULTI}.
- Carrier-DO forwarder picker shows all active forwarders (any type).
- Shipment carrier picker filters by mode (SEA→SHIPPING_LINE, AIR→AIRLINE).

## Testing & verification

- Unit tests for the new/changed normalizers (embedded `forwarder`/`truck_vendor` as
  Forwarder; `carrier` as Carrier; `carrier_id` present).
- `npm run typecheck && npm run test && npm run check:boundaries`.
- Manual (skill `verify`): DTO truck-vendor list shows Forwarders; Carrier-DO forwarder
  list shows Forwarders and renders `forwarder_name`; Shipment carrier is chosen from
  the Carrier master and displayed; Supplier pickers elsewhere unchanged.

## Out of scope

- `Supplier` entity, `supplier_roles`, `TRUCKING_VENDOR` role.
- Field renames.
- Any real database / backend beyond the mock sync.
