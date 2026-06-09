# GD1 Procurement And Import Tracking ERD

Companion SQL planning DDL: `docs/database/GD1_SCHEMA.sql`.

This file models only the tables defined for the GD1 PO-to-DO architecture:

- `purchase_order`
- `purchase_order_line`
- `delivery_order`
- `delivery_order_line`
- `quotation` (Managed under DO)
- `quotation_version` (Managed under DO)
- `shipment`
- `shipment_line`
- `shipment_milestone` (10 milestones total)
- `po_stage_task`
- `po_task_template`

External FK targets such as tenant, user, department, item, supplier, and warehouse are referenced but not expanded.

## Naming And Common Columns

Every table follows the GD1 convention:

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | Primary key. |
| `tenant_id` | UUID | Required. FK to external tenant table. |
| `created_at` | TIMESTAMPTZ | Required, default `now()`. |
| `updated_at` | TIMESTAMPTZ | Required, default `now()`. |
| `created_by` | UUID | Nullable FK to external user table. |
| `updated_by` | UUID | Nullable FK to external user table. |
| `version` | INT | Required, default `1`, check `version >= 1`. |
| `deleted_at` | TIMESTAMPTZ | Nullable soft-delete timestamp. |

Money/numeric fields use:
- Amount, quantity, price: `NUMERIC(18,4)`
- Exchange rate: `NUMERIC(18,6)`
- Percent: `NUMERIC(5,2)`
- Currency: `CHAR(3)` with uppercase ISO-4217 check

## Type Setup

```sql
CREATE TYPE gd1_priority AS ENUM ('NORMAL', 'HIGH', 'URGENT');

CREATE TYPE gd1_po_status AS ENUM (
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'RECEIVED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE gd1_po_line_status AS ENUM ('OPEN', 'PARTIALLY_SHIPPED', 'SHIPPED', 'RECEIVED', 'CLOSED', 'CANCELLED');
CREATE TYPE gd1_po_type AS ENUM ('SEA', 'AIR', 'DOMESTIC');
CREATE TYPE gd1_template_po_type AS ENUM ('SEA', 'AIR', 'DOMESTIC', 'ALL');
CREATE TYPE gd1_shipment_mode AS ENUM ('SEA', 'AIR');

CREATE TYPE gd1_do_status AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'READY_TO_SHIP',
  'IN_TRANSIT',
  'DELIVERED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE gd1_quotation_status AS ENUM (
  'DRAFT',
  'SENT',
  'REJECTED',
  'FINAL',
  'CANCELLED'
);

CREATE TYPE gd1_shipment_status AS ENUM (
  'BOOKING_PENDING',
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICKED_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'IN_TRANSIT',
  'CUSTOMS_DRAFT',
  'ARRIVED',
  'CUSTOMS_CLEARED',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE gd1_customs_stream AS ENUM ('GREEN', 'YELLOW', 'RED');

CREATE TYPE gd1_milestone_code AS ENUM (
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICK_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'ATD',
  'CUSTOM_DRAFT_SUBMITTED',
  'AN_ATA',
  'CUSTOM_CLEARED',
  'EDO_DELIVERY'
);

CREATE TYPE gd1_milestone_source AS ENUM ('MANUAL', 'API', 'EMAIL');
CREATE TYPE gd1_task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');
CREATE TYPE gd1_assignee_role AS ENUM ('BUYER', 'LOGISTICS', 'FINANCE', 'CUSTOMS_BROKER');
```

## Table Definitions

### `purchase_order`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `po_no` | VARCHAR(30) | NOT NULL, unique per tenant when active |
| `revision` | INT | NOT NULL, default `1`, check `>= 1` |
| `supplier_id` | UUID | NOT NULL |
| `po_type` | `gd1_po_type` | NOT NULL |
| `incoterm` | VARCHAR(10) | NOT NULL |
| `payment_term` | VARCHAR(100) | NOT NULL |
| `currency_code` | CHAR(3) | NOT NULL |
| `exchange_rate` | NUMERIC(18,6) | NOT NULL |
| `status` | `gd1_po_status` | NOT NULL |
| `expected_etd` | DATE | NULL |
| `expected_eta` | DATE | NULL |
| `confirmed_by_supplier_at` | TIMESTAMPTZ | NULL |
| `supplier_ref_no` | VARCHAR(100) | NULL |
| `tolerance_over_pct` | NUMERIC(5,2) | NOT NULL, default `5.00` |
| `notes` | TEXT | NULL |

### `purchase_order_line`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `purchase_order_id` | UUID | NOT NULL, FK `purchase_order(id)` |
| `item_id` | UUID | NOT NULL |
| `line_no` | INT | NOT NULL |
| `status` | `gd1_po_line_status` | NOT NULL |
| `qty_ordered` | NUMERIC(18,4) | NOT NULL |
| `qty_shipped` | NUMERIC(18,4) | NOT NULL |
| `qty_received` | NUMERIC(18,4) | NOT NULL |
| `unit_price` | NUMERIC(18,4) | NOT NULL |

### `delivery_order`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `purchase_order_id` | UUID | NOT NULL, FK `purchase_order(id)` |
| `do_no` | VARCHAR(30) | NOT NULL, unique per tenant |
| `origin_warehouse_id` | UUID | NOT NULL |
| `destination_warehouse_id` | UUID | NOT NULL |
| `transport_type` | VARCHAR(10) | NOT NULL (SEA, AIR, etc) |
| `status` | `gd1_do_status` | NOT NULL |
| `confirmed_at` | TIMESTAMPTZ | NULL |

### `delivery_order_line`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `delivery_order_id` | UUID | NOT NULL, FK `delivery_order(id)` |
| `purchase_order_line_id` | UUID | NOT NULL, FK `purchase_order_line(id)` |
| `qty_ordered` | NUMERIC(18,4) | NOT NULL |
| `qty_shipped` | NUMERIC(18,4) | NOT NULL |

### `quotation`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `delivery_order_id` | UUID | NOT NULL, FK `delivery_order(id)` |
| `quotation_no` | VARCHAR(30) | NOT NULL, unique per tenant |
| `current_version_id` | UUID | NULL |
| `status` | `gd1_quotation_status` | NOT NULL |
| `fds_sales_incharge_id` | UUID | NULL |

### `quotation_version`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `quotation_id` | UUID | NOT NULL, FK `quotation(id)` |
| `version_no` | INT | NOT NULL |
| `freight_cost` | NUMERIC(18,4) | NOT NULL |
| `insurance_cost` | NUMERIC(18,4) | NULL |
| `other_costs` | NUMERIC(18,4) | NULL |
| `currency_code` | CHAR(3) | NOT NULL |
| `terms` | TEXT | NULL |
| `is_inclusive` | BOOLEAN | NOT NULL DEFAULT true |

### `shipment`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `shipment_no` | VARCHAR(30) | NOT NULL, unique per tenant |
| `mode` | `gd1_shipment_mode` | NOT NULL |
| `forwarder_id` | UUID | NULL |
| `carrier` | VARCHAR(100) | NULL |
| `bl_awb_no` | VARCHAR(100) | NULL |
| `etd` | DATE | NULL |
| `eta` | DATE | NULL |
| `atd` | DATE | NULL |
| `ata` | DATE | NULL |
| `status` | `gd1_shipment_status` | NOT NULL |
| `customs_stream` | `gd1_customs_stream` | NULL |

### `shipment_line`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `shipment_id` | UUID | NOT NULL, FK `shipment(id)` |
| `delivery_order_line_id` | UUID | NOT NULL, FK `delivery_order_line(id)` |
| `qty_shipped` | NUMERIC(18,4) | NOT NULL |
| `lot_no` | VARCHAR(100) | NULL |

### `shipment_milestone`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `shipment_id` | UUID | NOT NULL, FK `shipment(id)` |
| `sequence_no` | SMALLINT | NOT NULL |
| `milestone_code` | `gd1_milestone_code` | NOT NULL |
| `planned_date` | DATE | NULL |
| `actual_date` | DATE | NULL |
| `recorded_by` | UUID | NULL |
| `source` | `gd1_milestone_source` | NOT NULL |

### `po_stage_task`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `purchase_order_id` | UUID | NOT NULL, FK `purchase_order(id)` |
| `po_stage` | `gd1_po_status` | NOT NULL |
| `task_name` | VARCHAR(255) | NOT NULL |
| `assignee_id` | UUID | NOT NULL |
| `status` | `gd1_task_status` | NOT NULL |
| `due_date` | TIMESTAMPTZ | NULL |
| `linked_shipment_milestone` | `gd1_milestone_code` | NULL |

### `po_task_template`

| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `po_type` | `gd1_template_po_type` | NOT NULL |
| `po_stage` | `gd1_po_status` | NOT NULL |
| `task_name` | VARCHAR(255) | NOT NULL |
| `default_assignee_role` | `gd1_assignee_role` | NOT NULL |
| `sla_hours` | INT | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true |

## Index Checklist

| Table | Index | Purpose |
|---|---|---|
| `purchase_order` | `(tenant_id, status, expected_eta)` | PO delivery tracking. |
| `delivery_order` | `(tenant_id, status, confirmed_at)` | DO tracking. |
| `quotation` | `(tenant_id, status)` | Quotation lists. |
| `shipment` | `(tenant_id, status, eta)` | Shipment dashboard. |
| `shipment_milestone` | unique `(shipment_id, milestone_code)` | Prevent duplicate milestone code per shipment. |
| `shipment_milestone` | unique `(shipment_id, sequence_no)` | Guarantee 10 ordered milestone slots. |
| `shipment_line` | `(delivery_order_line_id)` | Trace DO Line to Shipment. |
| `po_stage_task` | `(tenant_id, assignee_id, status, due_date)` | My tasks dashboard. |
