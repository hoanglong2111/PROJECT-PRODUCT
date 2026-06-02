# GD1 ERD DBML Source

Source format for dbdiagram.io. Detailed constraints live in `docs/database/GD1_DOCUMENT_ERD.md`.

```dbml
Project kbfe_gd1_procurement_import {
  database_type: 'PostgreSQL'
  Note: 'GD1 Procurement & Import Tracking: PR -> Approval -> PO -> Shipment -> Milestones -> Costs -> Tasks.'
}

Table purchase_request {
  id uuid [primary key]
  tenant_id uuid [not null]
  pr_no varchar(30) [not null]
  title varchar(255) [not null]
  requester_id uuid
  department_id uuid
  priority varchar [not null]
  status varchar [not null]
  required_date date [not null]
  total_amount numeric [not null]
  currency_code char(3) [not null]
  notes text
  submitted_at timestamptz
  approved_at timestamptz
  created_at timestamptz
  updated_at timestamptz
  created_by uuid
  updated_by uuid
  version int
  deleted_at timestamptz
}

Table purchase_request_line {
  id uuid [primary key]
  tenant_id uuid [not null]
  purchase_request_id uuid [not null]
  item_id uuid [not null]
  line_no int [not null]
  qty_requested numeric [not null]
  qty_converted numeric [not null]
  unit varchar(20) [not null]
  target_price numeric
  currency_code char(3) [not null]
  required_date date [not null]
  preferred_supplier_id uuid
  note text
}

Table purchase_order {
  id uuid [primary key]
  tenant_id uuid [not null]
  po_no varchar(30) [not null]
  revision int [not null]
  supplier_id uuid [not null]
  po_type varchar [not null]
  incoterm varchar(10) [not null]
  payment_term varchar(100) [not null]
  currency_code char(3) [not null]
  exchange_rate numeric [not null]
  status varchar [not null]
  expected_etd date
  expected_eta date
  confirmed_by_supplier_at timestamptz
  supplier_ref_no varchar(100)
  tolerance_over_pct numeric
  tolerance_under_pct numeric
  notes text
}

Table purchase_order_line {
  id uuid [primary key]
  tenant_id uuid [not null]
  purchase_order_id uuid [not null]
  purchase_request_line_id uuid
  item_id uuid [not null]
  line_no int [not null]
  status varchar [not null]
  qty_ordered numeric [not null]
  qty_shipped numeric [not null]
  qty_received numeric [not null]
  unit_price numeric [not null]
  tax_rate numeric
  discount_pct numeric
  landed_cost_alloc numeric
  expected_eta_line date
}

Table shipment {
  id uuid [primary key]
  tenant_id uuid [not null]
  shipment_no varchar(30) [not null]
  mode varchar [not null]
  forwarder_id uuid
  carrier varchar(100)
  vessel_flight varchar(100)
  bl_awb_no varchar(100)
  container_no jsonb
  pol varchar(100)
  pod varchar(100)
  etd date
  eta date
  atd date
  ata date
  status varchar [not null]
  customs_stream varchar
}

Table shipment_line {
  id uuid [primary key]
  tenant_id uuid [not null]
  shipment_id uuid [not null]
  purchase_order_line_id uuid [not null]
  qty_shipped numeric [not null]
  lot_no varchar(100)
}

Table shipment_milestone {
  id uuid [primary key]
  tenant_id uuid [not null]
  shipment_id uuid [not null]
  sequence_no smallint [not null]
  milestone_code varchar [not null]
  planned_date date
  actual_date date
  recorded_by uuid
  source varchar [not null]
  note text
}

Table shipment_cost {
  id uuid [primary key]
  tenant_id uuid [not null]
  shipment_id uuid [not null]
  cost_type varchar [not null]
  amount numeric [not null]
  currency_code char(3) [not null]
  exchange_rate numeric [not null]
  alloc_method varchar [not null]
  invoice_ref varchar(100)
}

Table po_stage_task {
  id uuid [primary key]
  tenant_id uuid [not null]
  purchase_order_id uuid [not null]
  po_stage varchar [not null]
  task_name varchar(255) [not null]
  task_template_id uuid
  assignee_id uuid [not null]
  assigned_by uuid [not null]
  status varchar [not null]
  due_date timestamptz
  started_at timestamptz
  completed_at timestamptz
  completed_by uuid
  linked_shipment_milestone varchar
  note text
}

Table po_task_template {
  id uuid [primary key]
  tenant_id uuid [not null]
  po_type varchar [not null]
  po_stage varchar [not null]
  task_name varchar(255) [not null]
  default_assignee_role varchar [not null]
  sla_hours int [not null]
  linked_milestone varchar
  is_active boolean
  sort_order int
}

Table approval_matrix_config {
  id uuid [primary key]
  tenant_id uuid [not null]
  applies_to varchar [not null]
  department_id uuid
  min_amount numeric [not null]
  max_amount numeric
  currency_code char(3) [not null]
  step_order int [not null]
  approver_role varchar [not null]
  approver_user_id uuid
  escalation_timeout_hours int [not null]
  is_active boolean
}

Ref: purchase_request_line.purchase_request_id > purchase_request.id
Ref: purchase_order_line.purchase_request_line_id > purchase_request_line.id
Ref: purchase_order_line.purchase_order_id > purchase_order.id
Ref: shipment_line.shipment_id > shipment.id
Ref: shipment_line.purchase_order_line_id > purchase_order_line.id
Ref: shipment_milestone.shipment_id > shipment.id
Ref: shipment_cost.shipment_id > shipment.id
Ref: po_stage_task.purchase_order_id > purchase_order.id
Ref: po_stage_task.task_template_id > po_task_template.id
```
