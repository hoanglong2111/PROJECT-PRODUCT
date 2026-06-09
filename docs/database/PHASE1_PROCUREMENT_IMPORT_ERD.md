# GD1 Procurement & Import Tracking ERD Overview

This is the reduced overview for the tables named in `GD1_Technical_Requirements.docx` adjusted for the updated DO and Quotation model.

Canonical detailed table/type/constraint source:

- `docs/database/GD1_DOCUMENT_ERD.md`

## Scope

This overview intentionally includes only GD1 document tables:

| # | Table | Purpose |
|---:|---|---|
| 1 | `purchase_order` | Supplier PO header, revision, terms, ETA/ETD, lifecycle. |
| 2 | `purchase_order_line` | Ordered quantities, unit price, tax, discount. |
| 3 | `delivery_order` | Delivery Order header, origin/destination warehouses, transport type, confirmation. |
| 4 | `delivery_order_line` | Item-level lot quantities for delivery. |
| 5 | `quotation` | Quotation header, current version link, status, assigned FDS Sales. |
| 6 | `quotation_version` | Detailed quotation version, freight costs, validity, is_inclusive check. |
| 7 | `shipment` | SEA/AIR import shipment header. |
| 8 | `shipment_line` | Bridge from shipment to DO line. |
| 9 | `shipment_milestone` | 10 runtime shipment milestones. |
| 10 | `po_stage_task` | Runtime task for one PO stage. |
| 11 | `po_task_template` | Task template generated when PO enters a stage. |

External master data such as tenant, user, department, item, supplier, incoterm, and currency is referenced by FK but not expanded here.

## Core Relationships

| Relationship | Meaning |
|---|---|
| `purchase_order` 1 - N `purchase_order_line` | One PO has many item lines. |
| `purchase_order` 1 - N `delivery_order` | One PO can be split into multiple DOs (default 1:1). |
| `delivery_order` 1 - N `delivery_order_line` | One DO has many delivery lines. |
| `purchase_order_line` 1 - N `delivery_order_line` | PO lines are linked to DO lines. |
| `delivery_order` 1 - 1 `quotation` | Each DO has a corresponding freight quotation. |
| `quotation` 1 - N `quotation_version` | One quotation can have multiple negotiation versions. |
| `delivery_order_line` N - N `shipment` through `shipment_line` | One shipment can contain many DO lines; one DO line can ship across many shipments. |
| `shipment` 1 - 10 `shipment_milestone` | Each shipment has the 10 standard milestone slots. |
| `purchase_order` 1 - N `po_stage_task` | Tasks are owned by PO stage. |
| `po_task_template` 1 - N `po_stage_task` | Templates generate runtime tasks. |

## 10 Shipment Milestones

| Seq | Code | Milestone |
|---:|---|---|
| 1 | `BOOKING_CONFIRMED` | Booking confirmed |
| 2 | `CARGO_READY` | Cargo ready |
| 3 | `PICK_UP` | Pick-up (nested under Cargo Ready) |
| 4 | `BL_ISSUED` | B/L or AWB issued |
| 5 | `GATE_IN_POL` | Gate-in POL (nested under B/L Issued) |
| 6 | `ATD` | Actual time of departure (disabled/deferred) |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | Customs draft/submitted (disabled/deferred) |
| 8 | `AN_ATA` | Arrival Notice / ATA |
| 9 | `CUSTOM_CLEARED` | Custom Cleared |
| 10 | `EDO_DELIVERY` | EDO & Delivery |

## Key Constraints

- `purchase_order_line.qty_ordered > 0`.
- `delivery_order_line.qty_ordered > 0`.
- `shipment_line.qty_shipped > 0`.
- Total shipped quantity per DO line cannot exceed ordered quantity plus tolerance.
- Unique `(shipment_id, sequence_no)` on `shipment_milestone`.
- Unique `(shipment_id, milestone_code)` on `shipment_milestone`.
- `po_stage_task` `DONE` requires completion metadata.
- `po_stage_task` `BLOCKED` requires note.
