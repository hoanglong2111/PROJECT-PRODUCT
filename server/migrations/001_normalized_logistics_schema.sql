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
  mbl_type TEXT CHECK (mbl_type IN ('COPY', 'ORIGINAL', 'SEAWAY_BILL', 'SURRENDERED')),
  hbl_number TEXT,
  manifest_number TEXT,
  port_of_departure TEXT NOT NULL,
  port_of_destination TEXT NOT NULL,
  cut_off_date DATE,
  etd_planned DATE,
  eta_planned DATE,
  actual_departure_at TIMESTAMPTZ,
  actual_arrival_at TIMESTAMPTZ,
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
  hbl_number TEXT,
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
  hbl_number TEXT,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_quotations (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  request_code TEXT NOT NULL,
  shipping_mode TEXT NOT NULL CHECK (shipping_mode IN ('AIR', 'FCL', 'LCL')),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PRELIMINARY_SENT', 'OFFICIAL_SENT', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'BOOKED')),
  preliminary_due_at TIMESTAMPTZ NOT NULL,
  preliminary_sent_at TIMESTAMPTZ,
  official_due_at TIMESTAMPTZ NOT NULL,
  official_sent_at TIMESTAMPTZ,
  auto_approve_at TIMESTAMPTZ,
  customer_response_at TIMESTAMPTZ,
  quote_amount NUMERIC,
  currency TEXT,
  booking_number TEXT,
  booking_confirmed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS efms_house_bills (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  hbl_number TEXT NOT NULL,
  shipper TEXT NOT NULL,
  consignee TEXT NOT NULL,
  place_of_receipt TEXT,
  place_of_delivery TEXT,
  assigned_to TEXT,
  final_bl_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (delivery_order_id, hbl_number)
);

CREATE TABLE IF NOT EXISTS efms_document_reviews (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  hbl_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('WAITING_DOCUMENTS', 'READY_FOR_CHECK', 'MISMATCH', 'DRAFT_BL_CONFIRMED', 'FINAL_BL_CONFIRMED')),
  draft_bl_attachment_id TEXT,
  commercial_invoice_attachment_id TEXT,
  packing_list_attachment_id TEXT,
  final_bl_attachment_id TEXT,
  cross_check_due_at TIMESTAMPTZ NOT NULL,
  cross_checked_at TIMESTAMPTZ,
  sla_status TEXT NOT NULL DEFAULT 'ON_TRACK' CHECK (sla_status IN ('ON_TRACK', 'OVERDUE', 'DONE')),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customs_declarations (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL UNIQUE REFERENCES delivery_orders(id) ON DELETE CASCADE,
  declaration_number TEXT,
  channel TEXT CHECK (channel IN ('GREEN', 'YELLOW', 'RED')),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'CLEARED', 'NEEDS_DOCUMENTS', 'INSPECTION', 'VIOLATION_HANDLING')),
  lane_status TEXT CHECK (lane_status IN ('GREEN_CLEARANCE', 'YELLOW_NEED_SUPPLEMENT', 'RED_FIELD_INSPECTION', 'RED_VIOLATION_HANDLING', 'RELEASE_READY')),
  telex_released BOOLEAN NOT NULL DEFAULT FALSE,
  telex_released_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  invoiced_note_id TEXT,
  invoiced_at TIMESTAMPTZ,
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
  charge_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sla_due_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  sent_to_accounting_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS advance_settlements (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  hbl_number TEXT,
  settlement_number TEXT NOT NULL UNIQUE,
  requested_by TEXT,
  assigned_role TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'SETTLED')),
  approved_by TEXT,
  settled_by TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive_dossiers (
  id TEXT PRIMARY KEY,
  delivery_order_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  dossier_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('READY', 'PENDING_CONFIG', 'BLOCKED', 'SYNCED', 'FAILED')),
  required_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  missing_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  external_folder_url TEXT,
  error_message TEXT,
  requested_by TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_logistics_quotations_request_code ON logistics_quotations(request_code);
CREATE INDEX IF NOT EXISTS idx_efms_house_bills_do_id ON efms_house_bills(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_efms_document_reviews_do_id ON efms_document_reviews(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_advance_settlements_do_id ON advance_settlements(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_drive_dossiers_do_id ON drive_dossiers(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sap_sync_events_entity ON sap_sync_events(entity_type, entity_id);
