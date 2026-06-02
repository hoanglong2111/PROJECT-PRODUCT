# GD1 Procurement & Import Tracking ERD Overview

This is the reduced overview for the tables named in `GD1_Technical_Requirements.docx`.

Canonical detailed table/type/constraint source:

- `docs/database/GD1_DOCUMENT_ERD.md`

Mermaid source:

- `docs/database/PHASE1_PROCUREMENT_IMPORT_ERD.mermaid`

## Scope

This overview intentionally includes only GD1 document tables:

| # | Table | Purpose |
|---:|---|---|
| 1 | `purchase_request` | PR header, approval state, required date, value. |
| 2 | `purchase_request_line` | Item-level demand and converted quantity. |
| 3 | `purchase_order` | Supplier PO header, revision, terms, ETA/ETD, lifecycle. |
| 4 | `purchase_order_line` | Ordered/shipped/received quantities and landed cost allocation. |
| 5 | `shipment` | SEA/AIR import shipment header. |
| 6 | `shipment_line` | Bridge from shipment to PO line. |
| 7 | `shipment_milestone` | 10 runtime shipment milestones. |
| 8 | `shipment_cost` | Freight, duty, VAT, local charges, demurrage, and allocation method. |
| 9 | `po_stage_task` | Runtime task for one PO stage. |
| 10 | `po_task_template` | Task template generated when PO enters a stage. |
| 11 | `approval_matrix_config` | Department/value approval configuration. |

External master data such as tenant, user, department, item, supplier, incoterm, and currency is referenced by FK but not expanded here because the GD1 document does not define those table schemas.

## Core Relationships

| Relationship | Meaning |
|---|---|
| `purchase_request` 1 - N `purchase_request_line` | One PR has many requested item lines. |
| `purchase_request_line` 1 - N `purchase_order_line` | One PR line can be split into many PO lines. |
| `purchase_order` 1 - N `purchase_order_line` | One PO has many item lines. |
| `purchase_order_line` N - N `shipment` through `shipment_line` | One shipment can contain many PO lines; one PO line can ship across many shipments. |
| `shipment` 1 - 10 `shipment_milestone` | Each shipment has the 10 standard milestone slots. |
| `shipment` 1 - N `shipment_cost` | Shipment costs are allocated back to PO lines. |
| `purchase_order` 1 - N `po_stage_task` | Tasks are owned by PO stage. |
| `po_task_template` 1 - N `po_stage_task` | Templates generate runtime tasks. |
| `approval_matrix_config` N - PR/PO | Approval rules are resolved by department and value. |

## 10 Shipment Milestones

| Seq | Code | Milestone |
|---:|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmed |
| 2 | `CARGO_READY` | Cargo ready |
| 3 | `PICK_UP` | Pick-up |
| 4 | `BL_ISSUED` | B/L or AWB issued |
| 5 | `GATE_IN_POL` | Gate-in POL |
| 6 | `ATD` | Actual time of departure |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Customs draft/submitted |
| 8 | `AN_ATA` | Arrival Notice / ATA |
| 9 | `CUSTOM_CLEARED` | Custom Cleared |
| 10 | `EDO_DELIVERY` | EDO & Delivery |

## Key Constraints

- `purchase_request_line.qty_requested > 0`.
- `purchase_request_line.qty_converted <= qty_requested`.
- `purchase_order_line.qty_ordered > 0`.
- `shipment_line.qty_shipped > 0`.
- Total shipped quantity per PO line cannot exceed ordered quantity plus PO tolerance.
- Unique `(shipment_id, sequence_no)` on `shipment_milestone`.
- Unique `(shipment_id, milestone_code)` on `shipment_milestone`.
- `shipment_cost.amount >= 0`.
- `shipment_cost.exchange_rate > 0`.
- `po_stage_task` `DONE` requires completion metadata.
- `po_stage_task` `BLOCKED` requires note.
