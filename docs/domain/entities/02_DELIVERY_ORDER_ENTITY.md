# Delivery Order Entity

Delivery Order (DO) represents the real shipment/lô hàng. In the current model, DO can also act as a shipment/container that consolidates multiple PO/PR source lines, with Sea FCL Export as the reference logistics process.

```text
PO line(s) -> DO source_lines -> documents/tasks/warehouse entry
```

## Purpose

DO tracks:

- shipment identity and status
- source PR/PO lines
- supplier/SAP sync state
- shipping route, ETD/ETA, documents
- booking, port, customs, and eFMS transport identifiers
- warehouse deadline and actual/planned entry
- finance/tax information and two-touch Debit Note closure
- task closure readiness

## Current Shape

| Group | Key fields |
|---|---|
| `order_info` | `order_number`, `request_code`, `tracking_number`, `purchase_contract_number`, `status`, `notes`, `xnk_notes` |
| `source_lines[]` | canonical PO/PR/item/quantity lines shipped by this DO |
| `product_details` | summary item, quantity, unit, lot/packaging |
| `sap_integration` | supplier, item code, PO number, sync status |
| `logistics_shipping` | incoterms, method, line/vessel, route, docs, ETD/ETA |
| `efms_transport` | booking number, MBL, HBL, manifest, SI, POL/POD, container, seal number, vehicle type |
| `warehouse_tracking` | warehouse code, deadline, planned/actual entry, delay |
| `finance_tax` | tax rate/amount, currency, payment deadline, insurance, Selling/Buying/OBH charges, Debit/Credit Note refs |
| `task_summary` | total/completed/blocked/required remaining |
| `flow_tags` | derived business-flow tags |

## Source Line

Each `source_lines[]` row should include:

- `id`
- `po_number`, `po_line_id`
- `request_code`, `pr_line_id`
- `item_code`, `item_name`
- `quantity`, `unit`

## Status

| Status | Meaning |
|---|---|
| `CREATED` | DO created from PO source lines |
| `CONFIRMED` | shipment info confirmed |
| `IN_PRODUCTION` | supplier preparing goods |
| `IN_TRANSIT` | goods in transit |
| `ARRIVED_PORT` | arrived at port/border |
| `CUSTOMS_PROCESSING` | customs in progress |
| `WAREHOUSE_PENDING` | waiting warehouse entry |
| `DELIVERED` | actual warehouse entry exists |
| `DELAYED` | late against warehouse deadline |
| `CANCELLED` | stopped |

## Rules

- DO source PO line must exist.
- DO source quantity cannot exceed remaining PO line quantity.
- Duplicate source lines in the same request must be aggregated before validation.
- Header quantity must match source-line total when `sourceLines[]` is used.
- Missing supplier/PO data marks SAP sync incomplete.
- Missing Invoice, Packing List, or B/L blocks customs readiness.
- Draft B/L, Commercial Invoice, Packing List, and quotation data must match before Final B/L confirmation.
- Shipping Instruction requires `gross_weight > 0` and `cbm > 0`.
- HBL must be linked to its DO/eFMS job before final document closure.
- LCL booking can auto-continue as accepted if the customer is silent for 2 hours.
- `DELIVERED` requires `actual_entry_date`.
- Required tasks and blockers must prevent DO close until completed or waived.
- International freight Debit Note OF/AF must be issued separately before final inland/local charges.
- Selling charges lock after confirmation; Buying charges remain adjustable by authorized users.

## SLA and Customs Notes

| Area | Rule |
|---|---|
| Quotation | Preliminary quotation response within 1 hour; official quotation or booking hold within 8 hours. |
| Port document check | Port Officer verifies Draft B/L, CI, and Packing List consistency within 1 hour. |
| Finance | Debit Note OF/AF is issued within 1 hour after complete information is available. |
| Customs lane | Green clears immediately, yellow requires additional documents, red requires field inspection. |

## eFMS Job Notes

For detailed eFMS General Info, Booking, Manifest, SI, HBL, Container, Charges, Notes, Assignment, Attach Files, Google Drive dossier, and SOP code mapping, use `docs/domain/workflows/04_EFMS_SEA_FCL_EXPORT_WORKFLOW.md`.

## UI Notes

DO list should show DO code, source links, supplier/item, route, ETA, warehouse deadline, task progress, documents, SAP state, risk, and flow tags. Detail should show overview, documents, tasks/closure, and source lines; logistics/warehouse/finance/audit can be added incrementally.

## API Notes

Create DO should prefer:

```ts
sourceLines: [{ poNumber, poLineId, quantity }]
```

Legacy `poNumber` and `requestCode` may still create simple 1-1-1 DOs.

## Sample

```json
{
  "order_info": {
    "order_number": "DO-2026-000087",
    "request_code": "PR-2026-000145",
    "status": "IN_TRANSIT"
  },
  "source_lines": [
    {
      "po_number": "PO-4500098123",
      "po_line_id": "po-line-001",
      "request_code": "PR-2026-000145",
      "pr_line_id": "pr-line-001",
      "item_code": "RM-ALU-6061-T6",
      "quantity": 600,
      "unit": "kg"
    }
  ],
  "logistics_shipping": {
    "shipping_method": "SEA",
    "eta_planned": "2026-06-12",
    "documents_list": ["Invoice", "Packing List"],
    "missing_documents": ["B/L"]
  },
  "warehouse_tracking": {
    "warehouse_code": "WH-HCM-01",
    "warehouse_deadline": "2026-06-15",
    "planned_entry_date": "2026-06-17",
    "delay_days": 2
  },
  "flow_tags": ["PARTIAL_DELIVERY"]
}
```
