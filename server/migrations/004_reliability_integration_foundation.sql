-- Migration 004: Reliability, integration, idempotency, audit, and analytics foundation

ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE logistics_tasks ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE shipment_milestones ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE shipment_costs ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE po_stage_tasks ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'DATABASE_DATA_URL';
ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT;
ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS encryption_key_ref TEXT;
ALTER TABLE logistics_attachments ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  idempotency_key TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  response_status INT,
  response_body JSONB,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT 'internal',
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_error TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  source_system TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_system, external_event_id)
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  system_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WEBHOOK', 'REST_POLLING', 'EMAIL_IMAP', 'SFTP_CSV', 'MESSAGE_BROKER')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'BOTH')),
  endpoint_ref TEXT,
  schedule_cron TEXT,
  polling_interval_minutes INT CHECK (polling_interval_minutes IS NULL OR polling_interval_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, system_name, channel, direction)
);

CREATE TABLE IF NOT EXISTS integration_raw_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  source_system TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WEBHOOK', 'REST_POLLING', 'EMAIL_IMAP', 'SFTP_CSV')),
  external_ref TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parsed_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (parsed_status IN ('PENDING', 'PARSED', 'FAILED', 'IGNORED')),
  parsed_entity_type TEXT,
  parsed_entity_id TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS scheduler_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  job_name TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  schedule_interval_seconds INT NOT NULL CHECK (schedule_interval_seconds > 0),
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING', 'DISABLED', 'FAILED')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_aggregate_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant-001',
  aggregate_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  dimensions JSONB NOT NULL DEFAULT '{}'::JSONB,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, aggregate_name, period_start, period_end, dimensions)
);

CREATE TABLE IF NOT EXISTS state_transition_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table % cannot be updated or deleted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_state_transition_logs_append_only ON state_transition_logs;
CREATE TRIGGER trg_state_transition_logs_append_only
BEFORE UPDATE OR DELETE ON state_transition_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_inbox_events_source ON inbox_events(tenant_id, source_system, external_event_id);
CREATE INDEX IF NOT EXISTS idx_integration_raw_events_parse ON integration_raw_events(parsed_status, received_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_due ON scheduler_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_aggregate_name ON dashboard_aggregate_snapshots(tenant_id, aggregate_name, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_state_transition_entity ON state_transition_logs(entity_type, entity_id, created_at);
