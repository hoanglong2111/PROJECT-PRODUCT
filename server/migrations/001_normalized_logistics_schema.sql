CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  requested_order_id TEXT NOT NULL UNIQUE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  priority TEXT NOT NULL,
  requested_order_date DATE NOT NULL,
  adjusted_date DATE,
  warehouse_deadline_date DATE NOT NULL,
  production_contract_number TEXT NOT NULL,
  requester_id TEXT,
  purchasing_manager_id TEXT,
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  actual_warehouse_entry_date DATE,
  supplier_expected_delivery_date DATE,
  expected_arrival_date DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  warehouse_code TEXT NOT NULL,
  flow_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id TEXT PRIMARY KEY,
  purchase_request_id TEXT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  warehouse_deadline_date DATE NOT NULL,
  warehouse_code TEXT NOT NULL,
  production_contract_number TEXT NOT NULL,
  linked_po_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  linked_do_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  sap_object_id TEXT,
  sap_raw_payload JSONB,
  sap_synced_at TIMESTAMPTZ,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL,
  order_date DATE NOT NULL,
  currency TEXT NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  sap_sync_status TEXT NOT NULL,
  linked_do_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  warehouse_code TEXT NOT NULL,
  flow_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sap_sync_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sap_object_type TEXT NOT NULL,
  sap_object_id TEXT,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  source_pr_code TEXT NOT NULL,
  source_pr_line_id TEXT,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  warehouse_deadline_date DATE NOT NULL,
  warehouse_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  request_code TEXT NOT NULL,
  po_number TEXT,
  tracking_number TEXT,
  purchase_contract_number TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  xnk_notes TEXT NOT NULL DEFAULT '',
  item_code TEXT,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  supplier_code TEXT,
  supplier_name TEXT,
  sap_raw_date DATE,
  sap_sync_status TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  warehouse_deadline DATE NOT NULL,
  planned_entry_date DATE,
  actual_entry_date DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  flow_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_order_source_lines (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  po_line_id TEXT,
  request_code TEXT NOT NULL,
  pr_line_id TEXT,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS efms_transport_records (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL UNIQUE REFERENCES delivery_orders(id) ON DELETE CASCADE,
  incoterms TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  shipping_line TEXT,
  vessel_code TEXT,
  booking_number TEXT,
  mbl_number TEXT,
  hbl_number TEXT,
  manifest_number TEXT,
  port_of_departure TEXT NOT NULL,
  port_of_destination TEXT NOT NULL,
  cut_off_date DATE,
  etd_planned DATE,
  eta_planned DATE,
  documents_list TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  missing_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  gross_weight NUMERIC CHECK (gross_weight IS NULL OR gross_weight > 0),
  cbm NUMERIC CHECK (cbm IS NULL OR cbm > 0)
);

CREATE TABLE IF NOT EXISTS efms_containers (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  container_type TEXT NOT NULL,
  container_number TEXT NOT NULL,
  seal_number TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT
);

CREATE TABLE IF NOT EXISTS logistics_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  role TEXT NOT NULL,
  assignee_id TEXT,
  do_number TEXT NOT NULL,
  request_code TEXT NOT NULL,
  po_number TEXT,
  production_contract_number TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,
  notes TEXT NOT NULL DEFAULT '',
  is_required_for_do_closure BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_charge_lines (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('SELLING', 'BUYING', 'OBH')),
  charge_code TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_notes (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  note_number TEXT NOT NULL UNIQUE,
  note_type TEXT NOT NULL,
  accounting_code TEXT NOT NULL CHECK (accounting_code IN ('S', 'B', 'OBH')),
  status TEXT NOT NULL,
  issued_at TIMESTAMPTZ,
  sent_to_accounting_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_payload JSONB,
  after_payload JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_lines_pr_id ON purchase_request_lines(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po_id ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_request_code ON delivery_orders(request_code);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_po_number ON delivery_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_logistics_tasks_do_number ON logistics_tasks(do_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sap_sync_events_entity ON sap_sync_events(entity_type, entity_id);
