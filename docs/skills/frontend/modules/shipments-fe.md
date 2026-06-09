# Shipments Frontend Module

Use this when implementing `frontend/src/features/shipments/page.tsx`.

## Query

Target GD1:

- `fetchShipments` with query key `['shipments']`
- `fetchShipmentMilestones` with query key `['shipments', shipmentId, 'milestones']`
- `fetchShipmentDocuments` with query key `['shipments', shipmentId, 'documents']`

## State

Use Zustand for:

- `shipmentSearch`
- `shipmentStatusFilter`
- `shipmentRiskOnly`
- `shipmentModeFilter`

Use URL params:

- `shipment`
- context: `po`, `do`

## Filtering

Search dimensions:

- shipment number
- PO/DO number
- supplier/forwarder
- B/L or AWB
- container number
- vessel/flight

Risk is:

- overdue/missing milestone actual date
- missing required document
- customs yellow/red
- linked task blocked/overdue
- Draft B/L 2h review timer near SLA threshold

## Detail Panel / Drawer

Use tabs:

- **Overview**: Basic fields (ETA/ETD, carrier, mode, routing).
- **Lines**: List of DO lines.
- **Milestones**: Standard 10 milestone vertical/horizontal stepper UI:
  - Nested logic: Milestone 3 (`PICK_UP`) is shown nested or inline under Milestone 2 (`CARGO_READY`). Milestone 5 (`GATE_IN_POL`) is shown nested or inline under Milestone 4 (`BL_ISSUED`).
  - Disabled milestones: Milestones 6 (`ATD`) and 7 (`CUSTOM_DRAFT_SUBMITTED`) are disabled/hidden.
- **Documents**: Grid of required documents per active milestone. Includes Draft B/L review section with 2-hour countdown timer computed on client side (`uploadedAt` + 2 hours).
- **Customs**: Declared stream status, lane indicator.
- **Tasks**: PO-stage tasks linked to this shipment.
- **Audit**: State transition history.

Selected detail should remain synchronized with route params.

## Mutations

Target actions:

- Create shipment from DO lines.
- Update milestone actual date.
- **Document mutations**:
  - `uploadShipmentDocument(shipmentId, milestoneCode, file)` -> Uploads document, records version, updates status.
  - `confirmDraftBL(shipmentId)` -> Triggers KBI confirmation of Draft B/L.
  - `rejectDraftBL(shipmentId, comments)` -> Rejects Draft B/L, requesting FDS revision.
- Update customs stream (Green/Yellow/Red).

Invalidate `shipments`, `delivery-orders`, `purchase-orders`, `tasks`, `workflow`, and `dashboard` after mutations.
