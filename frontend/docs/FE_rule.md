# FRONTEND BUSINESS LOGIC RULES

> Purpose: This document defines business rules for AI agents (Claude Code) when
> modifying the frontend UI of the KBFE GD1 Procurement & Import Tracking app.
>
> The frontend is **backend-agnostic**: it depends on the **API contract**
> (`docs/API_CONTRACT.md`), not on any specific backend. A mock backend implements
> that contract today and is a replaceable detail; these rules must never assume how
> the backend stores data.

## Contents

- [1. Current Project Direction](#1-current-project-direction)
- [2. Core Flow](#2-core-flow)
- [3. API Usage Rule](#3-api-usage-rule)
- [4. Standard API Response](#4-standard-api-response)
- [5. Screen-first UI Rule](#5-screen-first-ui-rule)
- [6. Main Screens](#6-main-screens)
- [7. LOT Planning Rules](#7-lot-planning-rules)
- [8. Internal DO UI Rules](#8-internal-do-ui-rules)
- [9. Quotation UI Rules](#9-quotation-ui-rules)
- [10. Shipment UI Rules](#10-shipment-ui-rules)
- [11. Customs UI Rules](#11-customs-ui-rules)
- [12. Carrier DO UI Rules](#12-carrier-do-ui-rules)
- [13. DTO UI Rules](#13-dto-ui-rules)
- [14. Frontend Do / Don't](#14-frontend-do--dont)
- [15. Acceptance Criteria](#15-acceptance-criteria)
- [16. Master Data Rules](#16-master-data-rules)
- [17. Task Template ↔ Runtime Task Rules](#17-task-template--runtime-task-rules)

---

## 1. Current Project Direction

The project is now following:

```txt
UI-first
→ screen data shape
→ screen DTO (API contract)
→ backend implementation (mock today, real DB later)
```

Frontend must not be designed around database tables directly.

Frontend must be designed around **screen DTOs** defined by the API contract and
returned by REST API endpoints (`docs/API_CONTRACT.md`).

---

## 2. Core Flow

The frontend must follow this business flow:

```txt
PO
→ Supplier Confirmation
→ LOT Planning
→ Internal DO
→ Quotation
→ Shipment
→ Customs Clearance
→ Carrier DO / Cargo Release
→ DTO
```

Out of scope for current UI:

```txt
PR / Approval
Warehouse Receiving
GRN
ERP sync
Real payment
Detailed SLA engine
RBAC/users
```

---

## 3. API Usage Rule

Frontend must call real REST endpoints defined by the API contract
(`docs/API_CONTRACT.md`).

Do not import backend data files (e.g. mock JSON) directly inside React components.

Correct:

```txt
React component
→ API client
→ backend API endpoint (per API contract)
→ screen DTO response
```

Avoid:

```txt
React component
→ import local JSON directly
```

---

## 4. Standard API Response

All frontend API clients must expect this response format:

```json
{
  "data": {},
  "meta": {},
  "errors": []
}
```

Frontend must read business data from:

```txt
response.data
```

Frontend must handle errors from:

```txt
response.errors
```

---

## 5. Screen-first UI Rule

Frontend must not manually join many database-like resources.

Avoid building screens by manually joining:

```txt
purchase_orders
purchase_order_lines
item_master
po_lots
po_lot_lines
suppliers
```

Instead, use screen-ready endpoints such as:

```txt
GET /api/v1/purchase-orders/:id/lot-planning
```

The API should return already-joined UI data:

```txt
purchase_order
po_lines
lots
items inside lots
summary
actions
```

---

## 6. Main Screens

Frontend should prioritize these screens:

```txt
1. PO List
2. PO Detail
3. PO LOT Planning Board (inside PO Detail)
4. Internal DO List + Detail
5. Quotation (inside DO Detail → Quotations tab)
6. Shipment List
7. Shipment Detail — tabs: Overview, Milestones, Documents, Customs,
   Landed Cost, PO Tasks, Carrier DO, DTOs
8. Domestic Transport Orders (own list + detail screen)
```

Note on screen structure:

```txt
- Customs, Carrier DO, and the (read-only) Shipment↔DTO list are TABS inside Shipment Detail,
  not standalone top-level screens.
- DTO has a dedicated list/detail screen (Domestic Transport Orders). DTOs are created from
  customs-cleared shipment(s) through ONE shared, container-aware modal — opened either from the
  Shipment List (single selection = Create, multi-selection = Consolidate) or from the DTO
  screen's "Create from shipment" control — and then driven through their status flow.
```

---

# 7. LOT Planning Rules

## 7.1 Critical Rule: No Slot

There is no Slot in PO LOT Planning.

Do not create UI concepts like:

```txt
Delivery Slot
Slot Column
Move LOT to Slot
```

Do not call deprecated APIs:

```txt
/delivery-slots
/move-slot
```

Correct concept:

```txt
PO
→ LOT-001 default
→ create more LOTs
→ drag/drop item lines between LOTs
→ split item quantity between LOTs
```

---

## 7.2 LOT Planning Board UI

The LOT Planning UI should be a board:

```txt
LOT-001 | LOT-002 | LOT-003
```

Each LOT contains item lines.

Each item line represents quantity from a PO line.

Example:

```txt
LOT-001
- Diesel Engine Assembly | qty 60 PCS

LOT-002
- Diesel Engine Assembly | qty 40 PCS
```

---

## 7.3 Default LOT Rule

When opening PO LOT Planning:

```txt
- Every PO must have at least one LOT.
- Default LOT is LOT-001.
- Initial PO lines should belong to LOT-001.
```

Frontend should assume at least one LOT exists.

If no LOT is returned, show an empty-state warning and allow reload, but do not invent Slot.

---

## 7.4 Drag and Drop Rule

Frontend drag/drop works on **LOT item lines**, not on Slot.

Allowed actions:

```txt
1. Move item line from one LOT to another.
2. Split item quantity into another LOT.
3. Reorder LOTs.
4. Reorder item lines inside LOT.
```

When user drops an item into another LOT:

```txt
POST /api/v1/po-lot-lines/:lineId/move
```

When user splits quantity:

```txt
POST /api/v1/po-lot-lines/:lineId/split
```

After every move/split, backend should return the full refreshed LOT board.

Frontend should replace local board state with the response.

---

## 7.5 Split Quantity Rule

When splitting item quantity:

```txt
split_qty > 0
split_qty < source qty_lotted
```

Invalid examples:

```txt
source qty = 100, split_qty = 0     INVALID
source qty = 100, split_qty = 100   INVALID
source qty = 100, split_qty = 120   INVALID
```

Valid example:

```txt
source qty = 100, split_qty = 40
→ source remains 60
→ target gets 40
```

Frontend should validate this before sending request.

Backend remains source of truth.

---

## 7.6 Quantity Rule

For each PO line:

```txt
sum(qty_lotted across all LOTs) <= qty_ordered
```

Frontend should show warning if quantity is over-planned.

Backend must block invalid updates.

---

## 7.7 Locked LOT Rule

Frontend must disable move/split/delete actions if LOT status is:

```txt
ASSIGNED_TO_SHIPMENT
SHIPPED
CANCELLED
```

Locked LOTs are read-only.

---

## 7.8 Delete LOT Rule

Frontend can allow deleting LOT only when:

```txt
- LOT has no items
- LOT is not the last LOT of the PO
- LOT is not locked
```

If LOT has items, show message:

```txt
Cannot delete LOT because it still contains items.
```

---

# 8. Internal DO UI Rules

Internal DO is created from selected LOTs.

Internal DO is not Carrier DO and not DTO.

Frontend should use:

```txt
POST /api/v1/delivery-orders/from-lots
```

Required behavior:

```txt
- User selects one or more LOTs.
- Frontend opens a confirmation modal before calling the API.
- Modal includes optional DO no, requested pickup date, POL, POD, ETD, ETA, and notes.
- POL/POD prefill from selected LOT route fields; if the selected LOT has no route, fallback to PO header `origin_port` / `destination_port`.
- Frontend sends selected lot_ids plus the confirmed route/date fields.
- Backend creates Internal DO.
- Backend copies LOT item lines into DO lines.
```

After DO is created, frontend should navigate to:

```txt
/delivery-orders/:id
```

PO route display rule:

```txt
- PO header owns default `origin_port` / `destination_port` for POL/POD.
- Each LOT may override `origin_port` / `destination_port`.
- Origin country is display-only from `purchase_order.supplier.country`.
- Destination country is display-only and always `VN`.
- No country fields are stored on PO or LOT records.
```

---

# 9. Quotation UI Rules (reversed flow)

RFQ is now a **top-level feature** at `/quotation-requests`. It represents the inbound
KBI-entered request phase before FDS drafts a quotation. RFQ records are PO-shaped:
customer ref, optional free-text KBI SAP `customer_po_ref`, optional KBI
`customer_contract_ref`, real supplier, incoterm, mode, currency, POL/POD, desired
cargo-ready date, cargo hints, item lines, note, and responding quotations. Do not
use a picker into FDS UI PO entities here.
RFQ status flow: `SUBMITTED -> RECEIVED -> QUOTED -> CONFIRMED`, with `CANCELLED`
available before confirmation.

The RFQ create form shares the order-intake core with PO create through
`@shared/components/order-intake`. It captures KBI-owned values with near-PO field
parity, excluding FDS-internal `exchange_rate`, `po_type`, `payment_term`,
line-level customs profile, tax, discount, line ETA, and `quotation_id`. RFQ payloads
remain code-based (`incoterm_code`, `currency_code`, `mode`); PO payloads remain
id-based (`incoterm_id`, `currency_id`, `transport_mode_id`).

Quotation records link back to RFQ through `rfq_id`, inherit customer/supplier/
route/mode/incoterm/currency, and expose quote options. The quotation UI must show
that inherited header once as read-only RFQ context, then edit only quote options,
charge lines, currency, and validity. There is no standalone "New quotation" entry
point; create through RFQ detail only. Each option compares carrier, ETD/ETA,
transit days, risk warning, and headline amount. The UI warns when fewer than two
carrier/ETD options are present; this is an SOP warning, not a draft hard-block.
KBI must select one option before confirm; the Confirm action is disabled until
`selected_option_id` exists and the backend enforces the same rule. The old
quotation RFQ tab is retired because RFQ now has its own screen.

The Purchase Order UI represents FDS internal PO management, not KBI SAP PO.
Creating a PO from a confirmed quotation with `rfq_id` preloads goods lines from
the originating RFQ lines while preserving the existing confirmed-quotation gate.

Quotation is a **top-level feature** (own sidebar tab at `/quotations`), no longer a tab
inside the DO. In the UI it is **RFQ-derived** and freight-only: goods line items stay
on the RFQ, while the quotation owns freight options and freight `charge_lines`.

Quotation charges are edited manually in exactly three collapsible groups:
`FREIGHT`, `ORIGIN`, and `DESTINATION`. The "Add fee" dropdown in every group lists
all active charge codes; Incoterm no longer filters or auto-suggests fee rows, and
there is no per-code checkbox include/exclude mode. The group is determined by the
section where the fee is added and is persisted as `charge_group` on the line.

Every charge line has its own `currency_code`; there is no global default currency,
and new charge lines stay blank until the user chooses a currency. The form and
detail screens show subtotals per currency and never merge different currencies
into one customer-facing total. Seeded `GET /v1/currency-rates` (`vnd_rate`, VND
base = 1, no live bank/API source) appears once as a quote-level reference rate.
Any VND grand total is an internal reference only, never the customer total.
`chargeCodeToChargeType(code, mode)` stays in use to populate `charge_type` for
shipment-margin roll-ups.

"Tạo báo giá" opens the manual form first; it creates a quotation only when the user
confirms/submits the form via `POST /v1/quotation-requests/:id/quotations` with
manual `charge_lines`. Opening the form from RFQ detail or the Quotations RFQ picker
must not create a quotation record.

Canonical flow: `Quotation(CONFIRMED) → PO → DO → Shipment → DTO`.

5-state lifecycle (who acts):

```txt
REQUEST_FOR_QUOTATION  (KBI raises the RFQ)
  → DRAFT              (FDS drafts)
  → PENDING_APPROVAL   (FDS submits; KBI to approve)
  → CONFIRMED          (KBI confirms — unlocks PO creation)
  (any non-terminal)   → REJECTED (carries reject_reason)
```

Important rules:

```txt
- RFQ has its own sidebar tab; the old quotation RFQ status tab is retired.
- Quotation options compare carrier, ETD/ETA, transit days, risk warning, and headline amount.
- Show a warning when fewer than two carrier/ETD options exist; do not hard-block drafting on that warning.
- KBI must select one quotation option before confirm; frontend disables Confirm and backend rejects missing selection.
- Do not edit old quotation price directly; create a new version when price changes.
- Only one CONFIRMED quotation per quotation_group_id.
- A PO can only be created from a CONFIRMED quotation (see §8 Purchase Orders).
```

Frontend actions: open manual quotation creation from an RFQ, submit the manual
quotation form, advance status (submit for approval / confirm / reject), view
charge lines/events, and **Create PO from quotation** (on a CONFIRMED quotation,
opens the PO create form prefilled with the commercial header + `quotation_id`;
goods lines prefill from the originating RFQ when `rfq_id` exists).

---

# 10. Shipment UI Rules

Quotation no longer gates the DO, so the old `QUOTATION_CONFIRMED` gate is removed.
A shipment can be created from any DO that is **eligible**:

```txt
eligible  =  no linked shipment yet  AND  status ∉ { CANCELLED, CLOSED, ASSIGNED_TO_SHIPMENT }
```

This single predicate (`isDeliveryOrderShipmentEligible`, `features/shipments/model/shipmentModel.ts`)
is the source of truth and must back **both** create entry points — do not re-inline the rule per call
site (that drift previously left one path filtering on the dead `QUOTATION_CONFIRMED` status):

1. **DO detail** → the "Create Shipment" action (`CreateShipmentFromDoPanel`) shows for an eligible DO.
2. **Shipments tab → Create** → the "Linked DO" picker lists eligible DOs (fetch DOs, filter client-side
   with the same predicate; no `status` query filter).

Creating a shipment flips its DO to `ASSIGNED_TO_SHIPMENT` (so it drops out of both pickers). The backend
`createShipmentFromDeliveryOrder` enforces the same gate.

Shipment has 10 milestones:

```txt
1. BOOKING_CONFIRMED
2. CARGO_READY
3. PICKED_UP
4. BL_ISSUED
5. GATE_IN_POL
6. ATD
7. CUSTOMS_DRAFT
8. ARRIVAL_NOTICE
9. CUSTOMS_CLEARED
10. DELIVERED
```

Milestone update should call:

```txt
POST /api/v1/shipments/:id/milestones/:code/done
```

After milestone update, frontend should update the shipment status from backend response.

---

# 11. Customs UI Rules

Customs declaration is created from Shipment.

Frontend should allow customs declaration only when shipment exists and is not cancelled.

When customs is cleared:

```txt
customs_declaration.status = CLEARED
shipment.status = CUSTOMS_CLEARED
CUSTOMS_CLEARED milestone = DONE
```

After customs cleared, frontend can show actions:

```txt
Create Carrier DO
Create DTO
```

---

# 12. Carrier DO UI Rules

Carrier DO is for cargo release from carrier/forwarder.

Carrier DO is not Internal DO and not DTO.

Frontend should allow creating Carrier DO only when:

```txt
shipment.status = CUSTOMS_CLEARED
```

Carrier DO status:

```txt
PENDING
ISSUED
RELEASED
EXPIRED
CANCELLED
```

## 12.1 Carrier DO tab (Shipment detail)

Carrier DO is managed in the **"Carrier DO" tab of Shipment detail** (next to the DTOs tab):

```txt
- List   : GET    /api/v1/shipments/:shipmentId/carrier-delivery-orders
- Create : POST   /api/v1/shipments/:shipmentId/carrier-delivery-orders  (only when CUSTOMS_CLEARED)
- Issue  : POST   /api/v1/carrier-delivery-orders/:id/issue              (PENDING -> ISSUED)
- Release: POST   /api/v1/carrier-delivery-orders/:id/release            (ISSUED -> RELEASED)
- Cancel : POST   /api/v1/carrier-delivery-orders/:id/cancel
```

Disable each action button when the current status does not allow that transition.

---

# 13. DTO UI Rules

DTO means Domestic Transport Order.

DTO is for inland trucking from port/airport to KBI warehouse.

## 13.1 Shipment ↔ DTO Relationship (n:n)

The relationship is **many-to-many**:

- One Shipment can have **multiple DTOs** (multiple truck runs, partial delivery, delivery to multiple warehouses).
- One DTO can serve **multiple Shipments** (LCL consolidation: one truck consolidates cargo from multiple shipments).

Frontend must reflect this n:n relationship in both Shipment detail and DTO detail screens.

## 13.2 Shipment detail — DTOs tab (read-only + Unlink)

Shipment detail includes a **"DTOs" tab** that is **read-only with Unlink only**:

- Lists all DTOs currently linked to the shipment (fetched via `GET /api/v1/shipments/:id/domestic-transport-orders`).
- Allows **unlinking** a DTO from the shipment (via `DELETE /api/v1/shipments/:id/domestic-transport-orders/:dtoId/unlink`). Unlink only detaches the n:n link; it does not delete the DTO.
- Shows a notice explaining the n:n model so users understand one DTO can serve multiple shipments.

The tab has **no "create" button and no manual "link existing DTO" control**. Creating a DTO and
consolidating multiple shipments onto one DTO both go through the shared container-aware modal
(see 13.4) so container allocation and POD validation always apply. The backend `.../link` endpoint
still exists and is called internally by that modal when consolidating.

## 13.3 DTO list / detail — multi-shipment display

When a DTO is linked to more than one shipment:

- **In the DTO list table**: display "N shipments" instead of a single shipment number.
- **In DTO detail panel**: display all linked shipments as separate entity badges/links (not just the primary `shipment_id`).

When a DTO is linked to only one shipment, display the single shipment number as before.

## 13.4 Create DTO (shared modal)

DTO creation/consolidation is funneled through **one shared, container-aware modal**, reachable from two places:

```txt
1. Shipment List — select one or more customs-cleared shipments, then:
   - 1 shipment   -> "Create DTO"
   - 2+ shipments -> "Consolidate DTO (N)"   (LCL consolidation into one DTO)
2. Domestic Transport Orders screen — pick one customs-cleared shipment in
   "Create from shipment", then "Create DTO".
```

Frontend should allow creation only for shipments where:

```txt
shipment.status = CUSTOMS_CLEARED
```

In the modal:

```txt
- Containers : list containers of the selected shipment(s). A container already allocated
               (container.dto_id set) is shown disabled/allocated; free containers are
               selectable. Empty selection -> DTO created without container allocation.
- POD check  : for consolidation, all selected shipments must share the same discharge port
               (dest_port). Mismatched PODs block creation.
- Other      : truck vendor, warehouse (default "KBI Main Warehouse"), scheduled pickup, note.
```

API (single shipment): `POST /api/v1/shipments/:shipmentId/domestic-transport-orders` — the backend
auto-creates the junction record. **Consolidation (2+ shipments) uses one atomic call**:
`POST /api/v1/domestic-transport-orders/consolidate` with `{ shipment_ids, primary_shipment_id,
container_ids?, ... }`. The backend creates the DTO, links the other shipments, and reassigns their
containers server-side (the frontend no longer loops link + container updates).

## 13.5 DTO status flow

```txt
DRAFT
→ QUOTE_PENDING
→ QUOTED
→ QUOTE_CONFIRMED
→ DISPATCHED
→ IN_TRANSIT
→ DELIVERED
→ POD_RECEIVED
→ CLOSED
```

Frontend must not allow Dispatch if DTO is not:

```txt
QUOTE_CONFIRMED
```

`POD_RECEIVED` is reached via the **Mark POD received** action (`POST .../:id/pod-received`, enabled
when status = `DELIVERED`). `Close` is enabled at `DELIVERED` or `POD_RECEIVED`. Inland freight quote
fields (`quote_amount` / `quote_currency`) are saved via `PATCH /api/v1/domestic-transport-orders/:id`.

---

# 14. Frontend Do / Don't

## Do

```txt
- Use screen-level DTO responses. The DO list/detail comes from the backend screen-DTO
  endpoints (GET /api/v1/delivery-orders/screen and /:id/screen); do NOT synthesize
  task_summary / missing_documents / warehouse on the frontend.
- Validate critical responses at the API boundary with the dev-only zod guard
  (src/shared/api/contracts, parseContract) — it warns on contract drift, never throws.
- Keep UI state simple.
- Refetch or replace board after mutations.
- Disable invalid actions based on status.
- Keep LOT Planning free of Slot.
- Use `docs/I18N_GLOSSARY.md` as the source of truth for forwarding terminology
  when adding or changing UI translations.
- Depend on the API contract (`docs/API_CONTRACT.md`), not on the backend
  implementation. Dev-only mock scaffolding (deterministic IDs, `/v1/mock/:collection`,
  seed data) must stay inside `src/shared/api` adapters and never leak into features.
```

## Don't

```txt
- Do not design UI around PostgreSQL schema.
- Do not manually join many table-like JSON files in components.
- Do not use po_delivery_slots in LOT Planning.
- Do not expose Slot UI.
- Do not assume database relationship is final.
- Do not add PR/GRN/ERP/payment screens unless explicitly requested.
```

---

# 15. Acceptance Criteria

Frontend implementation is correct when:

```txt
- App runs against any backend that honours docs/API_CONTRACT.md (today the mock
  backend), with no assumption about the backend's storage (no DB/PostgreSQL coupling).
- PO List renders.
- PO Detail renders.
- LOT Planning Board renders without Slot.
- User can create LOT.
- User can move item line between LOTs.
- User can split item quantity between LOTs.
- User can create Internal DO from LOTs.
- User can view Quotation, Shipment, Customs, Carrier DO, DTO screens.
- UI actions are disabled when status does not allow them.
```

---

# 16. Master Data Rules

Master Data lives in `features/master-data` and is organized into two grouped tab sections:

```txt
Core master data : Item Master | Supplier | Forwarder & Carrier | Task Template
Reference data   : Currency | Incoterm | Transport Mode
```

The four Core entities follow the Phase-1 import templates in
`docs/master_data/*.html`. Use the documented field schema:

```txt
Item Master : item_code, item_name, item_name_en, item_category
              (NVL|BTP|TP|CCDC|DONG_GOI), item_type
              (RAW|SEMI|FG|CONSUMABLE|PACKAGING), base_uom, purchase_uom,
              uom_conversion, hs_code (on item), country_of_origin,
              unit_price_usd, barcode
Supplier    : supplier_code, supplier_name, supplier_name_en, supplier_type
              (OVERSEAS_SEA|OVERSEAS_AIR|DOMESTIC), country, city,
              contact_person, contact_email, contact_phone, payment_term,
              currency, default_incoterm, lead_time_production_days, bank_info
Forwarder   : forwarder_code, forwarder_name, forwarder_type
              (SEA|AIR|TRUCKING|MULTI), country, contact_person, contact_email,
              contact_phone, is_primary, note
Carrier     : carrier_code, carrier_name, carrier_type
              (SHIPPING_LINE|AIRLINE), scac_iata_code, service_route_note,
              contact_booking, contact_email, note
```

Rules:

```txt
- Renamed Item/Supplier fields are entity-scoped. Do NOT rename line-level
  unit / lead_time_* on PO / DO / Shipment lines.
- Forwarder & Carrier are SEPARATE entities; do not split or migrate the
  existing supplier partner rows in this scope.
- Master-data clients call /api compatibility endpoints and read the
  { data, total, pagination } / { data } / { data, message } shapes.
```

## 16.1 Master Data / Mock Backend Non-Issues

These are intentionally not frontend work items:

```txt
- STT with filtering/pagination is safe because the master-data tables do not expose click-to-sort.
  The row number is a continuous visible-row counter, not a persisted sort key.
- Dropping or splitting kbi-mock-api is backend-only work. The frontend is already decoupled through
  VITE_API_URL and the API contract, with dev-only mock scaffolding kept inside shared API adapters.
```

---

# 17. Task Template ↔ Runtime Task Rules

Task Template (Master Data, `task-templates`) is the SOP catalog of the 20
Phase-1 tasks. It is the single source of SOP vocabulary:

```txt
milestone_code : PRE_SHIPMENT, MS1_BOOKING_CONFIRMED, MS2_CARGO_READY,
                 MS3_LOADED, MS4_IN_TRANSIT, MS5_ARRIVED_PORT,
                 MS6_CUSTOMS_SUBMITTED, MS7_CUSTOMS_CLEARED, MS8_DELIVERED_GATE
department     : FDS_SALES, KBI_PURCHASING, FDS_OPS, FDS_OPS_CUSTOMS,
                 FDS_ACCOUNTING, KBI_WAREHOUSE
assignee_code  : S01..S03, O01..O03, A01..A02 (SOP §6.2)
```

The runtime Tasks screen (`features/tasks`) is **linked to**, not a duplicate
of, the catalog:

```txt
- Each runtime task carries task_template_id + a `template` snapshot
  (milestone_code, department, sla, related_documents, group).
- Surface the template metadata (milestone badge on the board, SOP panel in
  TaskDetail). Render milestone/department labels from MILESTONE_CODES /
  DEPARTMENTS in `@shared/api/taskTemplates` — do not hand-map SOP codes.
- A runtime task with no template link shows no SOP panel; never invent a link
  on the frontend (the backend seed owns the mapping).
```

Manual add / edit (`TaskFormModal`, opened from the board "Create task" button
and the TaskDetail "Edit" button):

```txt
- The modal is template-driven: picking a Task Template prefills task_name and
  previews the SOP milestone / department / SLA that the backend will snapshot.
- A task can also be created freeform (no template) and any field overridden.
- Create -> createLogisticsTask (POST /v1/tasks); edit -> updateLogisticsTask
  (PATCH /v1/tasks/:id). Invalidate queryKeys.tasks + globalPoStageTasks after.
- Default tasks/roles are system-generated (backend seed). The modal is the
  manual escape hatch, not a replacement for that default generation.
```

Out of scope (do not implement unless requested): generating runtime tasks
from templates per PO/Shipment, and replacing the legacy `TaskRole`/free-text
assignee.department vocabulary on runtime tasks.

