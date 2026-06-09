# Shipments UI/UX Module

Use this when designing or changing the Shipments route.

## Purpose

Shipment is the GD1 import tracking board. It should show where the shipment is, which milestone is next, whether documents/customs/tasks are ready, and which action is blocking progress. **Document management** (5) and **10 Milestones** (4) are managed directly as sub-flows inside the Shipment module.

## Default Layout

- Page header with Workflow action.
- Metrics: active shipments, delayed milestones, customs attention, task workload.
- Toolbar: search, status filter, mode filter, risk-only switch.
- Wide operations table.
- Selected shipment detail surface.

## Table Columns

Recommended columns:

- Shipment number.
- Linked DO/PO lines.
- Mode (SEA/AIR).
- Forwarder/carrier.
- B/L or AWB.
- Route (POL/POD).
- ETA/ATA.
- Milestone progress (showing current milestone code).
- Customs stream (Green/Yellow/Red).
- Task/doc risk.
- Status.
- Row action.

## Detail Surface (Tabs)

- **Overview**: General information, supplier details, planned/actual ETD/ETA.
- **Lines**: DO lines grouped in this shipment.
- **Milestones**:
  - Vertical/horizontal timeline displaying the 10 standard milestones.
  - Milestone 3 (`PICK_UP`) is nested under Milestone 2 (`CARGO_READY`).
  - Milestone 5 (`GATE_IN_POL`) is nested under Milestone 4 (`BL_ISSUED`).
  - Milestones 6 (`ATD`) and 7 (`CUSTOM_DRAFT_SUBMITTED`) are visually disabled or marked as deferred.
  - Editable actual dates per active milestone.
- **Documents (Sub-workflow)**:
  - Document grid/list grouped by milestone.
  - Document status (CI, PL, CO, Draft B/L, Final B/L) with upload and version-history download.
  - **Draft B/L Workflow**: FDS Ops upload Draft B/L → 2h SLA review timer → KBI confirm or request changes → final upload.
- **Customs**: Customs stream (Green, Yellow, Red) and declaration status.
- **Tasks**: Linked PO-stage tasks, assignees, and blocked status.
- **Audit**: Log of milestone edits, document updates, and status transitions.

## Risk UX

Risk reasons:

- Milestone overdue.
- Missing milestone document.
- Customs yellow/red.
- Blocked or overdue linked task.
- Draft B/L review SLA timer (2h) approaching.
