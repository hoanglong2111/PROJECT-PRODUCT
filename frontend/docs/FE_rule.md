# FRONTEND BUSINESS LOGIC RULES

> Purpose: This document defines business rules for AI/Codex when modifying the frontend UI of the eFMS Mock API project.

---

## 1. Current Project Direction

The project is now following:

```txt
UI-first
→ screen data shape
→ mock API response
→ backend mock JSON
→ database later
```

Frontend must not be designed around database tables directly.

Frontend must be designed around **screen DTOs** returned by REST API endpoints.

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

Frontend must call real REST endpoints.

Do not import mock JSON directly inside React components unless explicitly requested.

Correct:

```txt
React component
→ API client
→ backend mock API endpoint
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
- Frontend sends selected lot_ids.
- Backend creates Internal DO.
- Backend copies LOT item lines into DO lines.
```

After DO is created, frontend should navigate to:

```txt
/delivery-orders/:id
```

---

# 9. Quotation UI Rules

Quotation is created from Internal DO.

Important rules:

```txt
- Do not edit old quotation price directly.
- Create new version when price changes.
- Only one final quotation per quotation_group_id.
- Mark final quotation before creating Shipment.
```

Frontend actions:

```txt
Create quotation
Create quotation version
Mark quotation final
View charge lines
View quotation events
```

When quotation is marked final:

```txt
delivery_order.status = QUOTATION_CONFIRMED
```

---

# 10. Shipment UI Rules

Shipment can only be created after quotation final.

Frontend should show Create Shipment only when:

```txt
delivery_order.status = QUOTATION_CONFIRMED
```

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

API: `POST /api/v1/shipments/:shipmentId/domestic-transport-orders` (the primary shipment).
The backend auto-creates the junction record linking the new DTO to the primary shipment. For
consolidation the modal additionally calls `.../domestic-transport-orders/link` for each other
shipment and reassigns their selected containers to the new DTO.

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

---

# 14. Frontend Do / Don't

## Do

```txt
- Use screen-level DTO responses.
- Keep UI state simple.
- Refetch or replace board after mutations.
- Disable invalid actions based on status.
- Keep LOT Planning free of Slot.
- Use deterministic mock IDs for development.
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
- App can run against mock backend without PostgreSQL.
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
