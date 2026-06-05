-- 007_gd1_remaining_tables.sql

CREATE TABLE IF NOT EXISTS domestic_transport_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  dto_no TEXT UNIQUE,
  shipment_id TEXT REFERENCES delivery_orders(id) ON DELETE CASCADE,
  transporter_id TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  vehicle_type TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  planned_pickup_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  planned_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  cost_estimate NUMERIC(18, 4),
  cost_actual NUMERIC(18, 4),
  currency_code CHAR(3) DEFAULT 'VND',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dto_quotes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  dto_id TEXT NOT NULL REFERENCES domestic_transport_orders(id) ON DELETE CASCADE,
  transporter_id TEXT NOT NULL,
  amount NUMERIC(18, 4) NOT NULL,
  currency_code CHAR(3) DEFAULT 'VND',
  is_selected BOOLEAN DEFAULT false,
  valid_until TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  issue_no TEXT UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED, CLOSED
  description TEXT NOT NULL,
  reported_by TEXT,
  assigned_to TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_status_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dto_shipment ON domestic_transport_orders(shipment_id);
CREATE INDEX IF NOT EXISTS idx_dto_status ON domestic_transport_orders(status);
CREATE INDEX IF NOT EXISTS idx_dto_quotes_dto ON dto_quotes(dto_id);
CREATE INDEX IF NOT EXISTS idx_issue_logs_entity ON issue_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_issue_logs_status ON issue_logs(status);
CREATE INDEX IF NOT EXISTS idx_status_history_entity ON entity_status_history(entity_type, entity_id);
