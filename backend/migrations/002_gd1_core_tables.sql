-- Migration 002: GD1 Core Tables (public schema, TEXT IDs for compatibility)

CREATE TABLE IF NOT EXISTS shipment_milestones (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  shipment_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  sequence_no SMALLINT NOT NULL CHECK (sequence_no >= 1 AND sequence_no <= 10),
  milestone_code TEXT NOT NULL,
  planned_date DATE,
  actual_date DATE,
  recorded_by TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shipment_milestones_seq UNIQUE (shipment_id, sequence_no),
  CONSTRAINT uq_shipment_milestones_code UNIQUE (shipment_id, milestone_code)
);

CREATE TABLE IF NOT EXISTS shipment_costs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  shipment_id TEXT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency_code CHAR(3) NOT NULL,
  exchange_rate NUMERIC NOT NULL CHECK (exchange_rate > 0),
  alloc_method TEXT NOT NULL DEFAULT 'BY_VALUE',
  invoice_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_task_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  po_type TEXT NOT NULL,
  po_stage TEXT NOT NULL,
  task_name TEXT NOT NULL,
  default_assignee_role TEXT NOT NULL,
  sla_hours INT NOT NULL CHECK (sla_hours > 0),
  linked_milestone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_stage_tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  po_stage TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_template_id TEXT REFERENCES po_task_templates(id) ON DELETE SET NULL,
  assignee_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  linked_shipment_milestone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_matrix_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  applies_to TEXT NOT NULL DEFAULT 'PR',
  department_id TEXT,
  min_amount NUMERIC NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  max_amount NUMERIC CHECK (max_amount IS NULL OR max_amount > min_amount),
  currency_code CHAR(3) NOT NULL,
  step_order INT NOT NULL CHECK (step_order > 0),
  approver_role TEXT NOT NULL,
  approver_user_id TEXT,
  escalation_timeout_hours INT NOT NULL CHECK (escalation_timeout_hours > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  step_order INT NOT NULL,
  approver_role TEXT NOT NULL,
  approver_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT,
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
