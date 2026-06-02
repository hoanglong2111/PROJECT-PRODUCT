-- GD1 Procurement and Import Tracking schema
-- Source of truth: docs/database/GD1_DOCUMENT_ERD.md
--
-- Scope:
-- - Creates GD1-owned core and support tables used by the GD1 component ERDs.
-- - Does not create shared master-data tables such as tenant, app_user,
--   department, item, supplier, currency, incoterm, port, or carrier.
-- - External references to shared tables are kept as UUID / CHAR / VARCHAR
--   columns and should be wired to the shared schema during implementation.

CREATE SCHEMA IF NOT EXISTS gd1;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_priority AS ENUM ('NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_pr_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'PARTIALLY_APPROVED',
    'APPROVED',
    'REJECTED',
    'CONVERTED',
    'CLOSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_po_status AS ENUM (
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_po_line_status AS ENUM (
    'OPEN',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'RECEIVED',
    'CLOSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_po_type AS ENUM ('SEA', 'AIR', 'DOMESTIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_template_po_type AS ENUM ('SEA', 'AIR', 'DOMESTIC', 'ALL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_shipment_mode AS ENUM ('SEA', 'AIR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_shipment_status AS ENUM (
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_customs_stream AS ENUM ('GREEN', 'YELLOW', 'RED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_milestone_code AS ENUM (
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_milestone_source AS ENUM ('MANUAL', 'API', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_cost_type AS ENUM (
    'FREIGHT',
    'INSURANCE',
    'CUSTOMS_DUTY',
    'VAT',
    'LOCAL_CHARGES',
    'DEMURRAGE',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_alloc_method AS ENUM ('BY_VALUE', 'BY_WEIGHT', 'BY_QTY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_assignee_role AS ENUM ('BUYER', 'LOGISTICS', 'FINANCE', 'CUSTOMS_BROKER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_approver_role AS ENUM ('DEPARTMENT_MANAGER', 'DIVISION_DIRECTOR', 'CEO', 'CFO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gd1.gd1_approval_applies_to AS ENUM ('PR', 'PO', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS gd1.purchase_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pr_no VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  requester_id UUID,
  department_id UUID,
  priority gd1.gd1_priority NOT NULL DEFAULT 'NORMAL',
  status gd1.gd1_pr_status NOT NULL DEFAULT 'DRAFT',
  required_date DATE NOT NULL,
  total_amount NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency_code CHAR(3) NOT NULL CHECK (currency_code = upper(currency_code)),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT purchase_request_submitted_status_check CHECK (
    status NOT IN ('SUBMITTED', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CLOSED')
    OR submitted_at IS NOT NULL
  ),
  CONSTRAINT purchase_request_approved_status_check CHECK (
    status NOT IN ('APPROVED', 'CONVERTED', 'CLOSED')
    OR approved_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_request_tenant_pr_no_active_uidx
  ON gd1.purchase_request (tenant_id, pr_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS purchase_request_tenant_status_required_date_idx
  ON gd1.purchase_request (tenant_id, status, required_date);

CREATE TABLE IF NOT EXISTS gd1.purchase_request_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  purchase_request_id UUID NOT NULL REFERENCES gd1.purchase_request(id),
  item_id UUID NOT NULL,
  line_no INT NOT NULL CHECK (line_no > 0),
  qty_requested NUMERIC(18,4) NOT NULL CHECK (qty_requested > 0),
  qty_converted NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (qty_converted >= 0),
  unit VARCHAR(20) NOT NULL,
  target_price NUMERIC(18,4) CHECK (target_price IS NULL OR target_price >= 0),
  currency_code CHAR(3) NOT NULL CHECK (currency_code = upper(currency_code)),
  required_date DATE NOT NULL,
  preferred_supplier_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT purchase_request_line_qty_converted_check CHECK (qty_converted <= qty_requested)
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_request_line_pr_line_no_active_uidx
  ON gd1.purchase_request_line (purchase_request_id, line_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS purchase_request_line_item_idx
  ON gd1.purchase_request_line (tenant_id, item_id);

CREATE TABLE IF NOT EXISTS gd1.purchase_request_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  purchase_request_id UUID NOT NULL REFERENCES gd1.purchase_request(id),
  revision_no INT NOT NULL CHECK (revision_no > 0),
  header_snapshot JSONB NOT NULL,
  lines_snapshot JSONB NOT NULL,
  revised_by UUID,
  revised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_request_revision_pr_revision_uidx
  ON gd1.purchase_request_revision (purchase_request_id, revision_no);

CREATE TABLE IF NOT EXISTS gd1.approval_matrix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  applies_to gd1.gd1_approval_applies_to NOT NULL DEFAULT 'PR',
  department_id UUID,
  min_amount NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  max_amount NUMERIC(18,4) CHECK (max_amount IS NULL OR max_amount > min_amount),
  currency_code CHAR(3) NOT NULL CHECK (currency_code = upper(currency_code)),
  step_order INT NOT NULL CHECK (step_order > 0),
  approver_role gd1.gd1_approver_role NOT NULL,
  approver_user_id UUID,
  escalation_timeout_hours INT NOT NULL CHECK (escalation_timeout_hours > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS approval_matrix_resolver_idx
  ON gd1.approval_matrix_config (tenant_id, applies_to, department_id, currency_code, min_amount, max_amount);

CREATE UNIQUE INDEX IF NOT EXISTS approval_matrix_active_step_uidx
  ON gd1.approval_matrix_config (
    tenant_id,
    applies_to,
    department_id,
    currency_code,
    min_amount,
    COALESCE(max_amount, -1),
    step_order
  )
  WHERE deleted_at IS NULL AND is_active = true;

CREATE TABLE IF NOT EXISTS gd1.approval_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('purchase_request', 'purchase_order')),
  entity_id UUID NOT NULL,
  matrix_config_id UUID REFERENCES gd1.approval_matrix_config(id),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT approval_instance_completed_check CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS approval_instance_entity_idx
  ON gd1.approval_instance (tenant_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS gd1.approval_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES gd1.approval_instance(id),
  step_order INT NOT NULL CHECK (step_order > 0),
  approver_id UUID,
  approver_role gd1.gd1_approver_role NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  due_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  escalated_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS approval_step_instance_order_active_uidx
  ON gd1.approval_step (instance_id, step_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS gd1.purchase_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_no VARCHAR(30) NOT NULL,
  revision INT NOT NULL DEFAULT 1 CHECK (revision >= 1),
  supplier_id UUID NOT NULL,
  po_type gd1.gd1_po_type NOT NULL,
  incoterm VARCHAR(10) NOT NULL,
  payment_term VARCHAR(100) NOT NULL,
  currency_code CHAR(3) NOT NULL CHECK (currency_code = upper(currency_code)),
  exchange_rate NUMERIC(18,6) NOT NULL CHECK (exchange_rate > 0),
  status gd1.gd1_po_status NOT NULL DEFAULT 'DRAFT',
  expected_etd DATE,
  expected_eta DATE,
  confirmed_by_supplier_at TIMESTAMPTZ,
  supplier_ref_no VARCHAR(100),
  tolerance_over_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tolerance_over_pct >= 0 AND tolerance_over_pct <= 20),
  tolerance_under_pct NUMERIC(5,2) NOT NULL DEFAULT 3.00 CHECK (tolerance_under_pct >= 0 AND tolerance_under_pct <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT purchase_order_eta_check CHECK (expected_eta IS NULL OR expected_etd IS NULL OR expected_eta >= expected_etd),
  CONSTRAINT purchase_order_confirmed_status_check CHECK (
    status NOT IN ('CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED', 'CLOSED')
    OR confirmed_by_supplier_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_tenant_po_no_active_uidx
  ON gd1.purchase_order (tenant_id, po_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS purchase_order_tenant_status_eta_idx
  ON gd1.purchase_order (tenant_id, status, expected_eta);

CREATE TABLE IF NOT EXISTS gd1.purchase_order_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES gd1.purchase_order(id),
  purchase_request_line_id UUID REFERENCES gd1.purchase_request_line(id),
  item_id UUID NOT NULL,
  line_no INT NOT NULL CHECK (line_no > 0),
  status gd1.gd1_po_line_status NOT NULL DEFAULT 'OPEN',
  qty_ordered NUMERIC(18,4) NOT NULL CHECK (qty_ordered > 0),
  qty_shipped NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (qty_shipped >= 0),
  qty_received NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_price NUMERIC(18,4) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  landed_cost_alloc NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (landed_cost_alloc >= 0),
  expected_eta_line DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_line_po_line_no_active_uidx
  ON gd1.purchase_order_line (purchase_order_id, line_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS purchase_order_line_tenant_po_status_idx
  ON gd1.purchase_order_line (tenant_id, purchase_order_id, status);

CREATE TABLE IF NOT EXISTS gd1.purchase_order_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES gd1.purchase_order(id),
  revision_no INT NOT NULL CHECK (revision_no > 0),
  header_snapshot JSONB NOT NULL,
  lines_snapshot JSONB NOT NULL,
  diff_from_previous JSONB,
  revised_by UUID,
  revised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier_reconfirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_revision_po_revision_uidx
  ON gd1.purchase_order_revision (purchase_order_id, revision_no);

CREATE TABLE IF NOT EXISTS gd1.shipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_no VARCHAR(30) NOT NULL,
  mode gd1.gd1_shipment_mode NOT NULL,
  forwarder_id UUID,
  carrier_id UUID,
  carrier VARCHAR(100),
  vessel_flight VARCHAR(100),
  bl_awb_no VARCHAR(100),
  container_no JSONB,
  pol_code VARCHAR(20),
  pod_code VARCHAR(20),
  pol VARCHAR(100),
  pod VARCHAR(100),
  etd DATE,
  eta DATE,
  atd DATE,
  ata DATE,
  status gd1.gd1_shipment_status NOT NULL DEFAULT 'BOOKING_PENDING',
  customs_stream gd1.gd1_customs_stream,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT shipment_eta_check CHECK (eta IS NULL OR etd IS NULL OR eta >= etd),
  CONSTRAINT shipment_ata_check CHECK (ata IS NULL OR atd IS NULL OR ata >= atd),
  CONSTRAINT shipment_container_no_array_check CHECK (container_no IS NULL OR jsonb_typeof(container_no) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_tenant_shipment_no_active_uidx
  ON gd1.shipment (tenant_id, shipment_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS shipment_tenant_status_eta_idx
  ON gd1.shipment (tenant_id, status, eta);

CREATE TABLE IF NOT EXISTS gd1.shipment_container (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES gd1.shipment(id),
  container_no VARCHAR(30) NOT NULL,
  seal_no VARCHAR(50),
  container_type VARCHAR(30),
  gross_weight_kg NUMERIC(18,4) CHECK (gross_weight_kg IS NULL OR gross_weight_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_container_active_uidx
  ON gd1.shipment_container (shipment_id, container_no)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS gd1.shipment_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES gd1.shipment(id),
  purchase_order_line_id UUID NOT NULL REFERENCES gd1.purchase_order_line(id),
  qty_shipped NUMERIC(18,4) NOT NULL CHECK (qty_shipped > 0),
  lot_no VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shipment_line_po_line_idx
  ON gd1.shipment_line (purchase_order_line_id);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_line_unique_lot_active_uidx
  ON gd1.shipment_line (shipment_id, purchase_order_line_id, COALESCE(lot_no, ''))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS gd1.shipment_milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES gd1.shipment(id),
  sequence_no SMALLINT NOT NULL CHECK (sequence_no >= 1 AND sequence_no <= 10),
  milestone_code gd1.gd1_milestone_code NOT NULL,
  planned_date DATE,
  actual_date DATE,
  recorded_by UUID,
  source gd1.gd1_milestone_source NOT NULL DEFAULT 'MANUAL',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT shipment_milestone_recorded_by_check CHECK (actual_date IS NULL OR recorded_by IS NOT NULL OR source <> 'MANUAL')
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_milestone_sequence_active_uidx
  ON gd1.shipment_milestone (shipment_id, sequence_no)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shipment_milestone_code_active_uidx
  ON gd1.shipment_milestone (shipment_id, milestone_code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS gd1.shipment_cost (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES gd1.shipment(id),
  cost_type gd1.gd1_cost_type NOT NULL,
  amount NUMERIC(18,4) NOT NULL CHECK (amount >= 0),
  currency_code CHAR(3) NOT NULL CHECK (currency_code = upper(currency_code)),
  exchange_rate NUMERIC(18,6) NOT NULL CHECK (exchange_rate > 0),
  alloc_method gd1.gd1_alloc_method NOT NULL DEFAULT 'BY_VALUE',
  invoice_ref VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shipment_cost_tenant_shipment_type_idx
  ON gd1.shipment_cost (tenant_id, shipment_id, cost_type);

CREATE TABLE IF NOT EXISTS gd1.po_task_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_type gd1.gd1_template_po_type NOT NULL,
  po_stage gd1.gd1_po_status NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  default_assignee_role gd1.gd1_assignee_role NOT NULL,
  sla_hours INT NOT NULL CHECK (sla_hours > 0),
  linked_milestone gd1.gd1_milestone_code,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT po_task_template_stage_check CHECK (
    po_stage IN ('SENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS po_task_template_active_uidx
  ON gd1.po_task_template (tenant_id, po_type, po_stage, task_name)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE TABLE IF NOT EXISTS gd1.po_stage_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES gd1.purchase_order(id),
  po_stage gd1.gd1_po_status NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  task_template_id UUID REFERENCES gd1.po_task_template(id),
  assignee_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  status gd1.gd1_task_status NOT NULL DEFAULT 'PENDING',
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  linked_shipment_milestone gd1.gd1_milestone_code,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT po_stage_task_stage_check CHECK (
    po_stage IN ('SENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED')
  ),
  CONSTRAINT po_stage_task_done_check CHECK (status <> 'DONE' OR (completed_at IS NOT NULL AND completed_by IS NOT NULL)),
  CONSTRAINT po_stage_task_blocked_check CHECK (status <> 'BLOCKED' OR length(trim(COALESCE(note, ''))) > 0),
  CONSTRAINT po_stage_task_completed_time_check CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS po_stage_task_assignee_dashboard_idx
  ON gd1.po_stage_task (tenant_id, assignee_id, status, due_date);

CREATE INDEX IF NOT EXISTS po_stage_task_po_stage_idx
  ON gd1.po_stage_task (purchase_order_id, po_stage);

CREATE TABLE IF NOT EXISTS gd1.task_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES gd1.po_stage_task(id),
  actor_id UUID,
  action VARCHAR(50) NOT NULL,
  before_payload JSONB,
  after_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_audit_log_task_created_idx
  ON gd1.task_audit_log (task_id, created_at);

CREATE TABLE IF NOT EXISTS gd1.file_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  storage_provider VARCHAR(50) NOT NULL,
  storage_key TEXT NOT NULL,
  checksum_sha256 CHAR(64),
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS file_storage_provider_key_uidx
  ON gd1.file_storage (storage_provider, storage_key);

CREATE TABLE IF NOT EXISTS gd1.document_attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES gd1.file_storage(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  milestone_code gd1.gd1_milestone_code,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_attachment_entity_idx
  ON gd1.document_attachment (tenant_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS gd1.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stage_code VARCHAR(80) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  due_offset_hours INT NOT NULL CHECK (due_offset_hours > 0),
  owner_role gd1.gd1_assignee_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS sla_config_active_uidx
  ON gd1.sla_config (tenant_id, stage_code, entity_type)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE TABLE IF NOT EXISTS gd1.sla_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  config_id UUID REFERENCES gd1.sla_config(id),
  shipment_id UUID REFERENCES gd1.shipment(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sla_event_resolved_check CHECK (resolved_at IS NULL OR resolved_at >= due_at)
);

CREATE INDEX IF NOT EXISTS sla_event_dashboard_idx
  ON gd1.sla_event (tenant_id, status, due_at);

CREATE TABLE IF NOT EXISTS gd1.notification_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_template_active_uidx
  ON gd1.notification_template (tenant_id, event_type, channel)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS gd1.notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_id UUID REFERENCES gd1.notification_template(id),
  recipient_id UUID NOT NULL,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_recipient_status_idx
  ON gd1.notification (tenant_id, recipient_id, status, created_at);

CREATE TABLE IF NOT EXISTS gd1.notification_preference (
  user_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_type, channel)
);

CREATE TABLE IF NOT EXISTS gd1.audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  actor_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  before_payload JSONB,
  after_payload JSONB,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON gd1.audit_log (tenant_id, entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS gd1.state_transition_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS state_transition_entity_idx
  ON gd1.state_transition_log (tenant_id, entity_type, entity_id, changed_at);

CREATE TABLE IF NOT EXISTS gd1.outbox_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_event_status_created_idx
  ON gd1.outbox_event (status, created_at);

CREATE TABLE IF NOT EXISTS gd1.inbox_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_system VARCHAR(80) NOT NULL,
  external_event_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  raw_payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS inbox_event_source_external_uidx
  ON gd1.inbox_event (source_system, external_event_id);

CREATE TABLE IF NOT EXISTS gd1.integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  system_code VARCHAR(80) NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_config_active_uidx
  ON gd1.integration_config (tenant_id, system_code, integration_type)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS gd1.forwarder_tracking_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  shipment_id UUID REFERENCES gd1.shipment(id),
  source VARCHAR(80) NOT NULL,
  raw_payload JSONB NOT NULL,
  parsed_milestone_code gd1.gd1_milestone_code,
  parsed_date DATE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS forwarder_tracking_raw_shipment_idx
  ON gd1.forwarder_tracking_raw (tenant_id, shipment_id, received_at);
