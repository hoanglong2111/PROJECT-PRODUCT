# Delivery Orders UI/UX Module

Use this when designing or changing the Delivery Orders route.

## Purpose

Delivery Order (DO) represents a single LOT of a PO scheduled for transit. The page should show the origin/destination warehouses, transport type (SEA/AIR/ROAD/RAIL), expected/actual dates, and its confirmation status. **Quotation** (freight-forwarding pricing) is managed as a sub-workflow directly inside the DO module.

## Default Layout

- Page header with Workflow action.
- Metrics: total DOs, pending confirmation, ready to ship, in transit, delivered.
- Toolbar: search, status filter, transport mode filter, date ranges.
- Main table displaying DO lists grouped by PO.
- Selected DO detail surface (drawer or right panel).

## Table Columns

Recommended columns:

- DO number.
- PO reference.
- Origin warehouse.
- Destination warehouse.
- Transport type.
- Planned delivery dates.
- Status badge (DRAFT, CONFIRMED, READY_TO_SHIP, etc.).
- Active Quotation status (DRAFT, SENT, FINAL, etc.).
- Confirmation action button.

## Detail Surface (Drawer or Right Panel)

Show:

- **General Tab**:
  - DO header status and confirmation timeline.
  - Linked PO information.
  - DO item lines and quantities.
  - Shipment connection (if linked to a shipment).
- **Quotation Tab (Sub-workflow)**:
  - Carrier bidding record and status (DRAFT, SENT, FINAL).
  - Rate quote and inclusions (all-inclusive pricing per SOP).
  - **SLA Timer**: 1-hour countdown for KBI response if status is SENT (triggers auto-approval).
  - **Version History & Comparison**: Side-by-side comparison panel between any two quotation versions to inspect price/term changes.
- **Audit Logs Tab**:
  - Transit logs and audit trail for DO state changes and quotation revisions.

## Risk UX

- DO not confirmed but cargo ready date near.
- Incorrect transport mode or missing warehouse fields.
- Overdue delivery dates.
- Quotation SENT but approaching the 1-hour auto-approve SLA threshold.
