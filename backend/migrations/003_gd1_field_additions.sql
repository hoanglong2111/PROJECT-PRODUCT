-- Migration 003: GD1 Field Additions to existing tables

-- purchase_requests
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS pr_no TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS currency_code CHAR(3) DEFAULT 'USD';
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- purchase_request_lines
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS qty_converted NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS target_price NUMERIC(18,4);
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS currency_code CHAR(3) DEFAULT 'USD';
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS preferred_supplier_id TEXT;
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS line_no INT;
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE purchase_request_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS revision INT DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_type TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS incoterm TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_term TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1.0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_etd DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_eta DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmed_by_supplier_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_ref_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tolerance_over_pct NUMERIC(5,2) DEFAULT 5.0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tolerance_under_pct NUMERIC(5,2) DEFAULT 3.0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- purchase_order_lines
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS purchase_request_line_id TEXT REFERENCES purchase_request_lines(id) ON DELETE SET NULL;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS qty_shipped NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS qty_received NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS landed_cost_alloc NUMERIC(18,4) DEFAULT 0;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS expected_eta_line DATE;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS line_no INT;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- delivery_orders (acting as Shipment runtime compatibility)
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS shipment_no TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS forwarder_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS carrier_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS vessel_flight TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS bl_awb_no TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS container_no JSONB;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pol_code TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pod_code TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pol TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS pod TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS etd DATE;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS eta DATE;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS atd DATE;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS ata DATE;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customs_stream TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- delivery_order_source_lines
ALTER TABLE delivery_order_source_lines ADD COLUMN IF NOT EXISTS purchase_order_line_id TEXT REFERENCES purchase_order_lines(id) ON DELETE CASCADE;
ALTER TABLE delivery_order_source_lines ADD COLUMN IF NOT EXISTS lot_no TEXT;
ALTER TABLE delivery_order_source_lines ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE delivery_order_source_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE delivery_order_source_lines
SET purchase_order_line_id = po_line_id
WHERE purchase_order_line_id IS NULL
  AND po_line_id IN (SELECT id FROM purchase_order_lines);

CREATE INDEX IF NOT EXISTS idx_gd1_shipment_milestones_shipment ON shipment_milestones(shipment_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_gd1_shipment_costs_shipment ON shipment_costs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_gd1_po_stage_tasks_po_stage_status ON po_stage_tasks(purchase_order_id, po_stage, status);
CREATE INDEX IF NOT EXISTS idx_gd1_approval_steps_entity_order ON approval_steps(entity_type, entity_id, step_order);
CREATE INDEX IF NOT EXISTS idx_gd1_delivery_source_po_line ON delivery_order_source_lines(purchase_order_line_id);
