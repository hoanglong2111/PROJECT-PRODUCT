# Purchase Request Entity

Purchase Request (PR) captures internal purchase demand for production/material planning. Production creates the PR, purchasing sources it into PO, and SAP synchronization keeps the control tower aligned with vendor and PO identifiers. It starts the chain:

```text
PR -> PO -> DO -> Booking -> Customs -> Delivery/POD -> Warehouse Entry
```

## Purpose

PR answers:

- what item/material is needed
- how much is needed
- which production contract it serves
- when it must reach warehouse
- who requested and who buys
- whether the demand is approved, sourced, delayed, or cancelled
- how delay should be measured against the original warehouse promise date

## Current Shape

| Field | Meaning |
|---|---|
| `id` | internal immutable id |
| `requested_order_id` | business PR code |
| `item_code`, `item_name`, `quantity`, `unit` | legacy summary of demand |
| `line_items[]` | canonical demand lines for multi-line PR and split/bulk flows |
| `priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `requested_order_date`, `warehouse_deadline_date` | request date and warehouse deadline |
| `production_contract_number` | production contract served by this demand |
| `requester`, `purchasing_manager` | operational owners |
| `status` | PR lifecycle status |
| `supplier_expected_delivery_date`, `expected_arrival_date`, `actual_warehouse_entry_date` | planning/actual dates |
| `delay_days` | derived warehouse delay |
| `linked_po_numbers`, `linked_do_numbers` | denormalized links |
| `flow_tags` | business-flow tags derived from PR/PO/DO graph |

## Line Item

Each `line_items[]` row should include:

- `id`
- `item_code`, `item_name`
- `quantity`, `unit`
- `warehouse_deadline_date`
- `warehouse_code`
- `production_contract_number`
- `linked_po_numbers`
- `linked_do_numbers`

## Status

| Status | Meaning |
|---|---|
| `NEW` | draft PR |
| `PENDING_APPROVAL` | waiting approval |
| `APPROVED` | can create PO from remaining lines |
| `REJECTED` | rejected and needs correction/cancel |
| `CONVERTED_TO_PO` | at least one PO has sourced the PR |
| `CANCELLED` | stopped, cannot create new PO/DO |

## Rules

- Approval requires item, quantity, unit, warehouse deadline, and production contract.
- Quantity must be greater than zero.
- PO creation is allowed only from `APPROVED` or partially sourced PRs with remaining quantity.
- PO source quantity cannot exceed remaining PR line quantity.
- `CANCELLED` PR cannot create PO/DO.
- Core demand fields should lock after sourcing unless manager override exists.
- Delay compares actual warehouse entry first, otherwise expected arrival, against warehouse deadline.
- `warehouse_deadline_date` is the original operational promise date and must be preserved for `delay_days`.
- SAP-sourced supplier, PO, and material identifiers should be synchronized rather than manually re-keyed when integration data exists.

## UI Notes

PR list should show code, item summary, quantity, deadline, expected arrival, buyer, status, risk, and flow tag. Detail should show demand summary, line items, delay, owners, linked PO/DO, update form, and notes.

## API Notes

Create PR should accept `lineItems[]` while preserving legacy summary fields. Update PR should validate locked fields once sourced.

## Sample

```json
{
  "requested_order_id": "PR-2026-000145",
  "status": "APPROVED",
  "priority": "HIGH",
  "warehouse_deadline_date": "2026-06-15",
  "production_contract_number": "PC-2026-HCM-042",
  "line_items": [
    {
      "id": "pr-line-001",
      "item_code": "RM-ALU-6061-T6",
      "item_name": "Aluminum 6061-T6 bar",
      "quantity": 1200,
      "unit": "kg",
      "warehouse_code": "WH-HCM-01",
      "linked_po_numbers": ["PO-4500098123"]
    }
  ],
  "linked_po_numbers": ["PO-4500098123"],
  "linked_do_numbers": ["DO-2026-000087"],
  "flow_tags": ["LINEAR"]
}
```
