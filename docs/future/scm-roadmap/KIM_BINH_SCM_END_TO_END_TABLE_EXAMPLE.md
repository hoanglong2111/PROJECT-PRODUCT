# Kim Binh SCM End-To-End Table Example

Date: 2026-05-28  
Related ERD: `docs/future/scm-roadmap/KIM_BINH_SCM_EXPANDED_ERD.mermaid`

Current GD1 component ERDs: `docs/database/component-erds/README.md`

This file gives one concrete data story across the expanded Kim Binh SCM tables. It is not a SQL seed file. IDs are readable aliases so the relationship chain is easy to inspect.

## Scenario

Planner needs to run a manufacturing order for finished item `FG-KB-PANEL`.

- MO: `MO-2026-000031`
- Planned quantity: `1,000 PCS`
- Due date: `2026-07-15`
- BOM requires raw material `NVL-ALU-FOIL`.
- Required raw material: `500 KG`.
- Current on-hand: `420 KG`.
- Current allocated: `0 KG`.
- Shortage: `80 KG`.
- MOQ from supplier: `100 KG`.

The system creates a suggested PR for `100 KG`, converts it to PO, tracks the import shipment, receives it into WMS, updates inventory, allocates material to the MO, issues material, and posts finished goods.

## End-To-End Flow

```text
Shared master data
  -> GD3 MO and MRP shortage
  -> GD1 PR approval
  -> GD1 PO conversion
  -> GD1 shipment and 10 milestones
  -> GD1 landed cost and ERP/WMS events
  -> GD2 ASN, GRN, QC, putaway, stock movement
  -> GD3 allocation, picking, material issue, production output
```

## 1. Shared Master Data

These rows already exist before the transaction starts.

### `tenant`

| id | code | name | status |
|---|---|---|---|
| `TENANT-KBI` | `KBI` | Kim Binh | `Active` |

### `department`

| id | tenant_id | code | name |
|---|---|---|---|
| `DEPT-PROD` | `TENANT-KBI` | `PROD` | Production Planning |
| `DEPT-PUR` | `TENANT-KBI` | `PUR` | Purchasing |
| `DEPT-LOG` | `TENANT-KBI` | `LOG` | Logistics |
| `DEPT-WH` | `TENANT-KBI` | `WH` | Warehouse |
| `DEPT-FIN` | `TENANT-KBI` | `FIN` | Finance |

### `app_user`

| id | tenant_id | email | full_name | department_id |
|---|---|---|---|---|
| `USER-PLANNER-01` | `TENANT-KBI` | `planner@kbi.local` | Planner 01 | `DEPT-PROD` |
| `USER-BUYER-01` | `TENANT-KBI` | `buyer@kbi.local` | Buyer 01 | `DEPT-PUR` |
| `USER-MANAGER-01` | `TENANT-KBI` | `manager@kbi.local` | Manager 01 | `DEPT-PUR` |
| `USER-LOG-01` | `TENANT-KBI` | `logistics@kbi.local` | Logistics 01 | `DEPT-LOG` |
| `USER-WH-01` | `TENANT-KBI` | `warehouse@kbi.local` | Warehouse 01 | `DEPT-WH` |
| `USER-FIN-01` | `TENANT-KBI` | `finance@kbi.local` | Finance 01 | `DEPT-FIN` |

### `item`

| id | item_code | name | unit_code | item_type | moq | lead_time_days | weight_kg |
|---|---|---|---|---|---:|---:|---:|
| `ITEM-FG-PANEL` | `FG-KB-PANEL` | Kim Binh Panel | `PCS` | `TP` | 0 | 0 | 1.2000 |
| `ITEM-NVL-ALU` | `NVL-ALU-FOIL` | Aluminum Foil Roll | `KG` | `NVL` | 100.0000 | 15 | 1.0000 |

### `supplier`

| id | supplier_code | name | supplier_type | country | currency_code | incoterm_default |
|---|---|---|---|---|---|---|
| `SUP-GZ-ALU` | `GZ-ALU` | Guangzhou Aluminum Supplier | `VENDOR` | `CN` | `USD` | `FOB` |
| `SUP-FDS-FWD` | `FDS-FWD` | FDS Forwarding | `FORWARDER` | `VN` | `VND` | `FOB` |

### `carrier`

| id | code | name | carrier_type |
|---|---|---|---|
| `CAR-MAERSK` | `MAEU` | Maersk Line | `SEA` |

### `warehouse`, `warehouse_zone`, `warehouse_rack`, `warehouse_bin`, `inventory_stock`

| table | id | key fields |
|---|---|---|
| `warehouse` | `WH-KBI-01` | `code=KBI-MAIN`, `name=Kim Binh Main Warehouse` |
| `warehouse_zone` | `ZONE-A` | `warehouse_id=WH-KBI-01`, `code=A`, `zone_type=DRY` |
| `warehouse_rack` | `RACK-A-01` | `zone_id=ZONE-A`, `code=A-01` |
| `warehouse_bin` | `BIN-A-01-01` | `rack_id=RACK-A-01`, `code=A-01-01`, `status=AVAILABLE` |
| `inventory_stock` | `STOCK-ALU-A0101` | `item_id=ITEM-NVL-ALU`, `bin_id=BIN-A-01-01`, `qty_on_hand=420`, `qty_allocated=0` |

## 2. GD3 Creates Demand And Detects Shortage

### `bom_header`

| id | item_id | version | status | effective_from |
|---|---|---|---|---|
| `BOM-FG-PANEL-V1` | `ITEM-FG-PANEL` | `V1` | `Active` | `2026-01-01` |

### `bom_line`

| id | bom_id | component_item_id | qty_per_unit | uom |
|---|---|---|---:|---|
| `BOML-FG-PANEL-ALU` | `BOM-FG-PANEL-V1` | `ITEM-NVL-ALU` | 0.5000 | `KG` |

### `production_order`

| id | mo_no | item_id | qty_planned | bom_id | status | due_date |
|---|---|---|---:|---|---|---|
| `MO-31` | `MO-2026-000031` | `ITEM-FG-PANEL` | 1000 | `BOM-FG-PANEL-V1` | `Planned` | `2026-07-15` |

### `production_order_component`

| id | production_order_id | component_item_id | qty_required | qty_allocated | qty_issued |
|---|---|---|---:|---:|---:|
| `MOC-31-ALU` | `MO-31` | `ITEM-NVL-ALU` | 500 | 0 | 0 |

### `mrp_run`

| id | run_date | horizon_days | status | triggered_by |
|---|---|---:|---|---|
| `MRP-20260528-01` | `2026-05-28` | 60 | `Completed` | `USER-PLANNER-01` |

### `mrp_requirement`

| id | mrp_run_id | item_id | required_date | required_qty | source_type | source_id |
|---|---|---|---|---:|---|---|
| `MRP-REQ-ALU-01` | `MRP-20260528-01` | `ITEM-NVL-ALU` | `2026-07-15` | 500 | `MO` | `MO-31` |

### `mrp_supply`

| id | mrp_run_id | item_id | available_date | qty | source_type | source_id |
|---|---|---|---|---:|---|---|
| `MRP-SUP-ALU-STOCK` | `MRP-20260528-01` | `ITEM-NVL-ALU` | `2026-05-28` | 420 | `ON_HAND` | `STOCK-ALU-A0101` |

### `mrp_shortage`

| id | mrp_run_id | item_id | shortage_date | shortage_qty | suggested_action |
|---|---|---|---|---:|---|
| `MRP-SHORT-ALU-01` | `MRP-20260528-01` | `ITEM-NVL-ALU` | `2026-07-15` | 80 | `CREATE_PR` |

### `mrp_suggested_pr`

| id | mrp_shortage_id | suggested_supplier_id | suggested_qty | suggested_order_date | status |
|---|---|---|---:|---|---|
| `MRP-SPR-ALU-01` | `MRP-SHORT-ALU-01` | `SUP-GZ-ALU` | 100 | `2026-05-28` | `Pending` |

The suggested quantity is `100 KG`, not `80 KG`, because the item MOQ is `100 KG`.

## 3. GD1 Creates And Approves PR

### `purchase_request`

| id | pr_no | requester_id | department_id | status | required_date | total_amount | currency_code |
|---|---|---|---|---|---|---:|---|
| `PR-145` | `PR-2026-000145` | `USER-PLANNER-01` | `DEPT-PROD` | `SUBMITTED` | `2026-06-20` | 420.0000 | `USD` |

### `purchase_request_line`

| id | purchase_request_id | item_id | line_no | qty_requested | qty_converted | unit_code | target_price | preferred_supplier_id |
|---|---|---|---:|---:|---:|---|---:|---|
| `PRL-145-01` | `PR-145` | `ITEM-NVL-ALU` | 1 | 100 | 0 | `KG` | 4.2000 | `SUP-GZ-ALU` |

### `approval_matrix_config`

| id | applies_to | department_id | min_amount_vnd | max_amount_vnd | required_roles | escalation_timeout_hours |
|---|---|---|---:|---:|---|---:|
| `APM-PUR-L1` | `PR` | `DEPT-PROD` | 0 | 100000000 | `["MANAGER"]` | 8 |

### `approval_instance`

| id | entity_type | entity_id | matrix_config_id | status | started_at | completed_at |
|---|---|---|---|---|---|---|
| `APR-PR-145` | `PR` | `PR-145` | `APM-PUR-L1` | `Approved` | `2026-05-28 09:05:00+07` | `2026-05-28 10:00:00+07` |

### `approval_step`

| id | instance_id | step_order | approver_id | approver_role | status | decision_at |
|---|---|---:|---|---|---|---|
| `APR-PR-145-S1` | `APR-PR-145` | 1 | `USER-MANAGER-01` | `MANAGER` | `Approved` | `2026-05-28 10:00:00+07` |

After approval:

| table | row | changed fields |
|---|---|---|
| `purchase_request` | `PR-145` | `status=APPROVED`, `approved_at=2026-05-28 10:00:00+07` |
| `state_transition_log` | `STL-PR-145-01` | `entity_type=PR`, `from_state=SUBMITTED`, `to_state=APPROVED` |
| `audit_log` | `AUD-PR-145-01` | before/after snapshot for approval action |

## 4. GD1 Converts PR To PO

Buyer converts `PRL-145-01` into one supplier PO.

### `purchase_order`

| id | po_no | supplier_id | po_type | incoterm_code | currency_code | exchange_rate | status | expected_etd | expected_eta |
|---|---|---|---|---|---|---:|---|---|---|
| `PO-1024` | `PO-2026-001024` | `SUP-GZ-ALU` | `SEA` | `FOB` | `USD` | 25500.000000 | `CONFIRMED` | `2026-06-10` | `2026-06-23` |

### `purchase_order_line`

| id | purchase_order_id | purchase_request_line_id | item_id | qty_ordered | qty_shipped | qty_received | unit_price | landed_cost_alloc |
|---|---|---|---|---:|---:|---:|---:|---:|
| `POL-1024-01` | `PO-1024` | `PRL-145-01` | `ITEM-NVL-ALU` | 100 | 0 | 0 | 4.2000 | 0 |

After conversion:

| table | row | changed fields |
|---|---|---|
| `purchase_request_line` | `PRL-145-01` | `qty_converted=100` |
| `purchase_request` | `PR-145` | `status=CONVERTED` |
| `outbox_event` | `OUT-PO-1024-CREATED` | `event_type=po.created`, `aggregate_type=PO`, `aggregate_id=PO-1024` |

## 5. GD1 Generates PO-Stage Tasks

When PO reaches `CONFIRMED`, task templates create runtime tasks.

### `po_task_template`

| id | po_type | po_stage | task_name | default_assignee_role | sla_hours | linked_milestone |
|---|---|---|---|---|---:|---|
| `PTT-SEA-BOOKING` | `SEA` | `CONFIRMED` | Confirm booking with forwarder | `LOGISTICS` | 4 | `BOOKING_CONFIRMED` |
| `PTT-SEA-DOCS` | `SEA` | `SHIPPED` | Review Draft B/L, CI, PL | `LOGISTICS` | 2 | `BL_ISSUED` |
| `PTT-SEA-COST` | `SEA` | `ARRIVED` | Enter final landed cost | `FINANCE` | 24 | `CUSTOM_CLEARED` |

### `po_stage_task`

| id | purchase_order_id | po_stage | task_name | assignee_id | status | due_date | linked_shipment_milestone |
|---|---|---|---|---|---|---|---|
| `TASK-PO1024-BOOKING` | `PO-1024` | `CONFIRMED` | Confirm booking with forwarder | `USER-LOG-01` | `PENDING` | `2026-05-30 14:00:00+07` | `BOOKING_CONFIRMED` |

## 6. GD1 Creates Shipment And 10 Milestones

### `shipment`

| id | shipment_no | mode | forwarder_id | carrier_id | bl_awb_no | etd | eta | status | customs_stream |
|---|---|---|---|---|---|---|---|---|---|
| `SHP-87` | `SHP-2026-000087` | `SEA` | `SUP-FDS-FWD` | `CAR-MAERSK` | `BL-CN-VN-20260607` | `2026-06-10` | `2026-06-23` | `BOOKING_CONFIRMED` | null |

### `shipment_container`

| id | shipment_id | container_no | seal_no | container_type |
|---|---|---|---|---|
| `CONT-SHP87-01` | `SHP-87` | `MSKU1234567` | `SEAL9988` | `20GP` |

### `shipment_line`

| id | shipment_id | purchase_order_line_id | qty_shipped | lot_no |
|---|---|---|---:|---|
| `SHPL-87-01` | `SHP-87` | `POL-1024-01` | 100 | `LOT-ALU-CN-260607` |

After shipment line insert:

| table | row | changed fields |
|---|---|---|
| `purchase_order_line` | `POL-1024-01` | `qty_shipped=100` |
| `purchase_order` | `PO-1024` | later becomes `SHIPPED` when `ATD` actual date is recorded |

### `shipment_milestone`

| sequence_no | milestone_code | planned_date | actual_date | source |
|---:|---|---|---|---|
| 1 | `BOOKING_CONFIRMED` | `2026-05-30` | `2026-05-30` | `MANUAL` |
| 2 | `CARGO_READY` | `2026-06-07` | `2026-06-07` | `EMAIL` |
| 3 | `PICK_UP` | `2026-06-08` | `2026-06-08` | `MANUAL` |
| 4 | `BL_ISSUED` | `2026-06-09` | `2026-06-09` | `EMAIL` |
| 5 | `GATE_IN_POL` | `2026-06-09` | `2026-06-09` | `API` |
| 6 | `ATD` | `2026-06-10` | `2026-06-10` | `API` |
| 7 | `CUSTOM_DRAFT_SUBMITTED` | `2026-06-20` | `2026-06-20` | `MANUAL` |
| 8 | `AN_ATA` | `2026-06-23` | `2026-06-23` | `API` |
| 9 | `CUSTOM_CLEARED` | `2026-06-24` | `2026-06-24` | `MANUAL` |
| 10 | `EDO_DELIVERY` | `2026-06-25` | `2026-06-25` | `MANUAL` |

Milestone effects:

| Milestone | Effects |
|---|---|
| `BOOKING_CONFIRMED` | `TASK-PO1024-BOOKING` auto-closes if still pending. |
| `ATD` | `shipment.status=IN_TRANSIT`, `purchase_order.status=SHIPPED`. |
| `CUSTOM_CLEARED` | Finance cost task becomes active or due. |
| `EDO_DELIVERY` | `shipment.status=DELIVERED`; emits `shipment.arrived_at_warehouse`. |

## 7. Documents, SLA, Forwarder Events, And Landed Cost

### `file_storage` and `document_attachment`

| table | id | key fields |
|---|---|---|
| `file_storage` | `FILE-BL-SHP87` | `file_name=BL-CN-VN-20260607.pdf`, `uploaded_by=USER-LOG-01` |
| `document_attachment` | `DOC-BL-SHP87` | `file_id=FILE-BL-SHP87`, `entity_type=SHIPMENT_MILESTONE`, `entity_id=<BL_ISSUED milestone id>`, `doc_type=BL` |
| `file_storage` | `FILE-INV-SHP87` | `file_name=Commercial-Invoice-PO1024.pdf`, `uploaded_by=USER-LOG-01` |
| `document_attachment` | `DOC-INV-SHP87` | `entity_type=SHIPMENT`, `entity_id=SHP-87`, `doc_type=INVOICE` |

### `sla_event`

| id | shipment_id | stage_code | due_at | resolved_at | status |
|---|---|---|---|---|---|
| `SLA-SHP87-CUSTOMS-DRAFT` | `SHP-87` | `STAGE_3_CUSTOMS` | `2026-06-20 17:00:00+07` | `2026-06-20 11:00:00+07` | `Resolved` |
| `SLA-SHP87-AN` | `SHP-87` | `STAGE_2_DOCS` | `2026-06-21 17:00:00+07` | `2026-06-21 09:00:00+07` | `Resolved` |

### `forwarder_tracking_raw`

| id | shipment_id | source | parsed_milestone_code | parsed_date | applied_at |
|---|---|---|---|---|---|
| `FTR-SHP87-ATD` | `SHP-87` | `WEBHOOK` | `ATD` | `2026-06-10` | `2026-06-10 09:30:00+07` |

### `shipment_cost`

| id | shipment_id | cost_type | amount | currency_code | exchange_rate | alloc_method |
|---|---|---|---:|---|---:|---|
| `SC-SHP87-FREIGHT` | `SHP-87` | `FREIGHT` | 500.0000 | `USD` | 25500.000000 | `BY_WEIGHT` |
| `SC-SHP87-DUTY` | `SHP-87` | `CUSTOMS_DUTY` | 535500.0000 | `VND` | 1.000000 | `BY_VALUE` |
| `SC-SHP87-VAT` | `SHP-87` | `VAT` | 1124550.0000 | `VND` | 1.000000 | `BY_VALUE` |
| `SC-SHP87-LOCAL` | `SHP-87` | `LOCAL_CHARGES` | 2000000.0000 | `VND` | 1.000000 | `BY_QTY` |

Allocation result:

| table | row | changed fields |
|---|---|---|
| `purchase_order_line` | `POL-1024-01` | `landed_cost_alloc=16410050` |

Calculation:

```text
freight 500 USD * 25,500 = 12,750,000 VND
duty                         535,500 VND
VAT                        1,124,550 VND
local charges              2,000,000 VND
total landed cost alloc   16,410,050 VND
```

## 8. GD1 Emits Events To ERP And WMS

### `outbox_event`

| id | aggregate_type | aggregate_id | event_type | status |
|---|---|---|---|---|
| `OUT-PO-1024-CREATED` | `PO` | `PO-1024` | `po.created` | `Published` |
| `OUT-SHP87-WH-ARRIVED` | `Shipment` | `SHP-87` | `shipment.arrived_at_warehouse` | `Published` |

`shipment.arrived_at_warehouse` payload contains:

```json
{
  "tenant_id": "TENANT-KBI",
  "shipment_id": "SHP-87",
  "shipment_no": "SHP-2026-000087",
  "po_lines": [
    {
      "purchase_order_line_id": "POL-1024-01",
      "item_id": "ITEM-NVL-ALU",
      "qty": 100,
      "lot_no": "LOT-ALU-CN-260607"
    }
  ]
}
```

## 9. GD2 Receives ASN, GRN, QC, Putaway

### `asn` and `asn_line`

| table | id | key fields |
|---|---|---|
| `asn` | `ASN-SHP87` | `shipment_id=SHP-87`, `status=Arrived`, `expected_arrival_at=2026-06-25 09:00:00+07` |
| `asn_line` | `ASNL-SHP87-01` | `asn_id=ASN-SHP87`, `purchase_order_line_id=POL-1024-01`, `item_id=ITEM-NVL-ALU`, `expected_qty=100` |

### `goods_receipt_note` and `grn_line`

| table | id | key fields |
|---|---|---|
| `goods_receipt_note` | `GRN-88` | `grn_no=GRN-2026-000088`, `asn_id=ASN-SHP87`, `warehouse_id=WH-KBI-01`, `status=Posted` |
| `grn_line` | `GRNL-88-01` | `purchase_order_line_id=POL-1024-01`, `qty_received=100`, `qty_accepted=100`, `qty_rejected=0`, `lot_no=LOT-ALU-CN-260607` |

### `quality_inspection`

| id | grn_line_id | inspector_id | result | defect_qty |
|---|---|---|---|---:|
| `QC-GRNL88-01` | `GRNL-88-01` | `USER-WH-01` | `Pass` | 0 |

### `inventory_lot`

| id | item_id | lot_no | supplier_id | received_grn_line_id | original_qty |
|---|---|---|---|---|---:|
| `LOT-ALU-260625` | `ITEM-NVL-ALU` | `LOT-ALU-CN-260607` | `SUP-GZ-ALU` | `GRNL-88-01` | 100 |

### `putaway_task`

| id | grn_line_id | suggested_bin_id | actual_bin_id | putaway_by | status |
|---|---|---|---|---|---|
| `PUT-GRNL88-01` | `GRNL-88-01` | `BIN-A-01-01` | `BIN-A-01-01` | `USER-WH-01` | `Done` |

### `inventory_movement`

| id | stock_id | item_id | movement_type | qty_delta | ref_doc_type | ref_doc_id | posted_by |
|---|---|---|---|---:|---|---|---|
| `MOV-GRN88-ALU-IN` | `STOCK-ALU-A0101` | `ITEM-NVL-ALU` | `GRN_IN` | 100 | `GRN_LINE` | `GRNL-88-01` | `USER-WH-01` |

### `inventory_stock`

Before GRN:

| stock_id | qty_on_hand | qty_allocated | qty_available |
|---|---:|---:|---:|
| `STOCK-ALU-A0101` | 420 | 0 | 420 |

After GRN:

| stock_id | qty_on_hand | qty_allocated | qty_available |
|---|---:|---:|---:|
| `STOCK-ALU-A0101` | 520 | 0 | 520 |

GRN effects upstream:

| table | row | changed fields |
|---|---|---|
| `purchase_order_line` | `POL-1024-01` | `qty_received=100` |
| `purchase_order` | `PO-1024` | `status=RECEIVED`, then later `CLOSED` after finance closure |
| `outbox_event` | `OUT-GRN88-POSTED` | `event_type=grn.posted`, payload for ERP |

## 10. GD3 Allocates And Issues Material To MO

### `inventory_allocation`

| id | stock_id | allocated_to_type | allocated_to_id | qty | allocated_at |
|---|---|---|---|---:|---|
| `ALLOC-MO31-ALU` | `STOCK-ALU-A0101` | `PROD_ORDER` | `MO-31` | 500 | `2026-06-26 08:00:00+07` |

After allocation:

| table | row | changed fields |
|---|---|---|
| `inventory_stock` | `STOCK-ALU-A0101` | `qty_on_hand=520`, `qty_allocated=500`, `qty_available=20` |
| `production_order_component` | `MOC-31-ALU` | `qty_allocated=500` |
| `production_order` | `MO-31` | `status=Released` |

### `picking_order` and `picking_line`

| table | id | key fields |
|---|---|---|
| `picking_order` | `PICK-MO31` | `source_type=PROD_ORDER`, `source_id=MO-31`, `warehouse_id=WH-KBI-01`, `status=Done` |
| `picking_line` | `PICKL-MO31-ALU` | `picking_order_id=PICK-MO31`, `item_id=ITEM-NVL-ALU`, `qty_required=500`, `actual_bin_id=BIN-A-01-01`, `stock_id=STOCK-ALU-A0101` |

### `material_issue`

| id | production_order_id | component_id | picking_order_id | item_id | qty | issued_at |
|---|---|---|---|---|---:|---|
| `MI-MO31-ALU` | `MO-31` | `MOC-31-ALU` | `PICK-MO31` | `ITEM-NVL-ALU` | 500 | `2026-06-26 10:00:00+07` |

### `inventory_movement`

| id | stock_id | item_id | movement_type | qty_delta | ref_doc_type | ref_doc_id |
|---|---|---|---|---:|---|---|
| `MOV-MO31-ALU-OUT` | `STOCK-ALU-A0101` | `ITEM-NVL-ALU` | `ISSUE_OUT` | -500 | `MATERIAL_ISSUE` | `MI-MO31-ALU` |

After material issue:

| table | row | changed fields |
|---|---|---|
| `inventory_stock` | `STOCK-ALU-A0101` | `qty_on_hand=20`, `qty_allocated=0`, `qty_available=20` |
| `production_order_component` | `MOC-31-ALU` | `qty_issued=500` |
| `production_order` | `MO-31` | `status=InProgress` |

## 11. GD3 Posts Production Output And Costing

### `production_output`

| id | production_order_id | item_id | qty_produced | lot_no | posted_at |
|---|---|---|---:|---|---|
| `OUT-MO31-FG` | `MO-31` | `ITEM-FG-PANEL` | 1000 | `LOT-FG-260715-01` | `2026-07-15 16:00:00+07` |

### `cost_rollup`

| id | item_id | bom_id | rollup_date | material_cost | labor_cost | overhead_cost | total_cost |
|---|---|---|---|---:|---:|---:|---:|
| `COST-MO31-FG` | `ITEM-FG-PANEL` | `BOM-FG-PANEL-V1` | `2026-07-15` | 2710050 | 1500000 | 800000 | 5010050 |

### `item_cost`

| id | item_id | cost_date | standard_cost | actual_cost | cost_method |
|---|---|---|---:|---:|---|
| `IC-FG-PANEL-20260715` | `ITEM-FG-PANEL` | `2026-07-15` | 4800.00 | 5010.05 | `ACTUAL` |

Final production effects:

| table | row | changed fields |
|---|---|---|
| `production_order` | `MO-31` | `qty_produced=1000`, `status=Completed` |
| `inventory_movement` | `MOV-MO31-FG-IN` | finished-goods stock receipt if internal GRN/stock posting is enabled |
| `outbox_event` | `OUT-MO31-COMPLETED` | `event_type=production.completed` |

## 12. Trace Queries By Business Question

### Question A: This MO used which PR/PO/shipment?

Trace path:

```text
production_order_component.component_item_id
  -> mrp_requirement.source_id = production_order.id
  -> mrp_shortage
  -> mrp_suggested_pr.converted_to_pr_id
  -> purchase_request
  -> purchase_request_line
  -> purchase_order_line.purchase_request_line_id
  -> shipment_line.purchase_order_line_id
  -> shipment
```

For this example:

```text
MO-2026-000031
  -> MRP-SHORT-ALU-01
  -> MRP-SPR-ALU-01
  -> PR-2026-000145
  -> PO-2026-001024
  -> SHP-2026-000087
  -> GRN-2026-000088
```

### Question B: Why was the PR quantity 100 KG if shortage was 80 KG?

Trace path:

```text
mrp_shortage.shortage_qty = 80
item.moq = 100
mrp_suggested_pr.suggested_qty = 100
purchase_request_line.qty_requested = 100
```

### Question C: Where did current inventory come from?

Trace path:

```text
inventory_stock
  -> inventory_movement
  -> grn_line
  -> goods_receipt_note
  -> asn
  -> shipment
  -> shipment_line
  -> purchase_order_line
  -> purchase_order
```

For this example:

```text
STOCK-ALU-A0101
  -> MOV-GRN88-ALU-IN
  -> GRNL-88-01
  -> GRN-2026-000088
  -> ASN-SHP87
  -> SHP-2026-000087
  -> PO-2026-001024
```

### Question D: How did landed cost reach the PO line?

Trace path:

```text
shipment_cost
  -> shipment
  -> shipment_line
  -> purchase_order_line
```

For this example:

```text
SC-SHP87-FREIGHT + SC-SHP87-DUTY + SC-SHP87-VAT + SC-SHP87-LOCAL
  -> SHP-2026-000087
  -> SHPL-87-01
  -> POL-1024-01.landed_cost_alloc = 16,410,050 VND
```

## Final State

| Area | Result |
|---|---|
| MRP | Shortage `80 KG` was resolved by suggested PR `100 KG`. |
| PR | `PR-2026-000145` approved and converted. |
| PO | `PO-2026-001024` confirmed, shipped, received, and ready for closure. |
| Shipment | `SHP-2026-000087` completed all 10 milestones and delivered to warehouse. |
| Landed cost | `16,410,050 VND` allocated to `POL-1024-01`. |
| WMS | `GRN-2026-000088` posted; stock increased from `420 KG` to `520 KG`. |
| Production | `500 KG` allocated and issued to `MO-2026-000031`; finished goods `1,000 PCS` produced. |
| Remaining stock | `20 KG` available after material issue. |

## Minimal Table Touch List

If implementing this as a test fixture, the minimum useful table path is:

```text
tenant
department
app_user
item
supplier
carrier
warehouse
warehouse_zone
warehouse_rack
warehouse_bin
inventory_stock
bom_header
bom_line
production_order
production_order_component
mrp_run
mrp_requirement
mrp_supply
mrp_shortage
mrp_suggested_pr
purchase_request
purchase_request_line
approval_matrix_config
approval_instance
approval_step
purchase_order
purchase_order_line
po_task_template
po_stage_task
shipment
shipment_line
shipment_milestone
shipment_cost
outbox_event
asn
asn_line
goods_receipt_note
grn_line
quality_inspection
putaway_task
inventory_lot
inventory_movement
inventory_allocation
picking_order
picking_line
material_issue
production_output
cost_rollup
item_cost
audit_log
state_transition_log
```
