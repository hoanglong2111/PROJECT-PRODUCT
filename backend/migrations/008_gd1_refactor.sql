-- Migration 008: GD1 Refactor - Drop PR, Restructure DO to Shipment (1:1), Add DTO/Quote fields, Add Master Data

-- 1. DROP PR TABLES
DROP TABLE IF EXISTS purchase_request_lines CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS logistics_quotations CASCADE;
DROP TABLE IF EXISTS efms_transport_records CASCADE;
DROP TABLE IF EXISTS efms_containers CASCADE;
DROP TABLE IF EXISTS efms_house_bills CASCADE;
DROP TABLE IF EXISTS efms_document_reviews CASCADE;
DROP TABLE IF EXISTS finance_charge_lines CASCADE;
DROP TABLE IF EXISTS finance_notes CASCADE;
DROP TABLE IF EXISTS advance_settlements CASCADE;
DROP TABLE IF EXISTS drive_dossiers CASCADE;

-- 2. CREATE MASTER DATA TABLES
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  item_type TEXT NOT NULL, -- NVL, TP, CCDC
  lead_time_days INT NOT NULL DEFAULT 0,
  moq NUMERIC NOT NULL DEFAULT 1,
  hs_code TEXT,
  import_tax_pct NUMERIC(5,2) DEFAULT 0,
  vat_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  lead_time_days INT NOT NULL DEFAULT 0,
  payment_term TEXT,
  currency CHAR(3) DEFAULT 'USD',
  incoterm_default TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RENAME DELIVERY ORDERS TO SHIPMENTS AND UPDATE CONSTRAINTS
-- First drop constraints on delivery_orders references
ALTER TABLE IF EXISTS shipment_milestones DROP CONSTRAINT IF EXISTS shipment_milestones_shipment_id_fkey;
ALTER TABLE IF EXISTS shipment_milestones DROP CONSTRAINT IF EXISTS uq_shipment_milestones_seq;
ALTER TABLE IF EXISTS shipment_milestones DROP CONSTRAINT IF EXISTS uq_shipment_milestones_code;

ALTER TABLE IF EXISTS shipment_costs DROP CONSTRAINT IF EXISTS shipment_costs_shipment_id_fkey;

ALTER TABLE IF EXISTS domestic_transport_orders DROP CONSTRAINT IF EXISTS domestic_transport_orders_shipment_id_fkey;

-- Conditionally rename delivery_orders to shipments or drop dummy delivery_orders
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_orders') AND
     NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipments') THEN
    ALTER TABLE delivery_orders RENAME TO shipments;
  ELSE
    DROP TABLE IF EXISTS delivery_orders CASCADE;
  END IF;
END $$;

-- Re-add constraints pointing to shipments
ALTER TABLE shipment_milestones 
  ADD CONSTRAINT shipment_milestones_shipment_id_fkey 
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

ALTER TABLE shipment_milestones
  ADD CONSTRAINT uq_shipment_milestones_seq UNIQUE (shipment_id, sequence_no);

ALTER TABLE shipment_milestones
  ADD CONSTRAINT uq_shipment_milestones_code UNIQUE (shipment_id, milestone_code);

ALTER TABLE shipment_costs
  ADD CONSTRAINT shipment_costs_shipment_id_fkey
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

ALTER TABLE domestic_transport_orders
  ADD CONSTRAINT domestic_transport_orders_shipment_id_fkey
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

-- Rename delivery_order_source_lines to shipment_source_lines
ALTER TABLE IF EXISTS delivery_order_source_lines DROP CONSTRAINT IF EXISTS delivery_order_source_lines_delivery_order_id_fkey;
ALTER TABLE IF EXISTS shipment_source_lines DROP CONSTRAINT IF EXISTS shipment_source_lines_shipment_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_order_source_lines') AND
     NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipment_source_lines') THEN
    ALTER TABLE delivery_order_source_lines RENAME TO shipment_source_lines;
  ELSE
    DROP TABLE IF EXISTS delivery_order_source_lines CASCADE;
  END IF;
END $$;

ALTER TABLE shipment_source_lines
  ADD CONSTRAINT shipment_source_lines_shipment_id_fkey
  FOREIGN KEY (delivery_order_id) REFERENCES shipments(id) ON DELETE CASCADE;

-- 4. MODIFY PURCHASE ORDERS AND LINES
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS source_pr_codes;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS confirmed_date TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS lot_split_mode TEXT; -- EQUAL, CUSTOM, NONE

ALTER TABLE purchase_order_lines DROP COLUMN IF EXISTS source_pr_code;
ALTER TABLE purchase_order_lines DROP COLUMN IF EXISTS source_pr_line_id;
ALTER TABLE purchase_order_lines DROP COLUMN IF EXISTS purchase_request_line_id;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS item_id TEXT REFERENCES items(id) ON DELETE SET NULL;

-- 5. PO REVISIONS & PERFORMANCE
CREATE TABLE IF NOT EXISTS po_revisions (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  diff_payload JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_performance (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  on_time_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  qty_accuracy_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MODIFY DOMESTIC TRANSPORT ORDERS AND QUOTES
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS fuel_ref_price NUMERIC(18, 4);
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS route_name TEXT;
ALTER TABLE domestic_transport_orders ADD COLUMN IF NOT EXISTS issue_level TEXT; -- LEVEL_1, LEVEL_2, LEVEL_3

ALTER TABLE dto_quotes ADD COLUMN IF NOT EXISTS quote_version INT NOT NULL DEFAULT 1; -- 1 (Quote 1), 2 (Quote 2)
ALTER TABLE dto_quotes ADD COLUMN IF NOT EXISTS fuel_price_date DATE;
ALTER TABLE dto_quotes ADD COLUMN IF NOT EXISTS fuel_ref_price NUMERIC(18, 4);
ALTER TABLE dto_quotes ADD COLUMN IF NOT EXISTS adjusted_price NUMERIC(18, 4);
ALTER TABLE dto_quotes ADD COLUMN IF NOT EXISTS adjustment_formula TEXT;

-- 7. CLEANUP SHIPMENTS TABLE
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS do_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS incoterms TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS documents_list TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS missing_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE shipments SET do_number = order_number WHERE do_number IS NULL;
ALTER TABLE shipments DROP COLUMN IF EXISTS request_code;
