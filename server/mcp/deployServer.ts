import 'dotenv/config';

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { pool } from '../db';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

type EnvCheck = {
  name: string;
  present: boolean;
  safePreview: string;
  warning?: string;
};

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const migrationUrls = [
  new URL('../migrations/001_normalized_logistics_schema.sql', import.meta.url),
  new URL('../migrations/002_gd1_core_tables.sql', import.meta.url),
  new URL('../migrations/003_gd1_field_additions.sql', import.meta.url),
  new URL('../migrations/004_reliability_integration_foundation.sql', import.meta.url),
];
const protocolVersion = '2024-11-05';

const requiredRuntimeEnv = ['VITE_API_URL', 'CORS_ORIGIN', 'DATABASE_URL', 'JWT_SECRET'];
const optionalDeployEnv = [
  'PORT',
  'BE_PORT',
  'APP_BASE_URL',
  'API_BASE_URL',
  'DEPLOY_PROVIDER',
  'DEPLOY_TOKEN',
  'GITHUB_TOKEN',
  'FE_DEPLOY_WEBHOOK_URL',
  'BE_DEPLOY_WEBHOOK_URL',
  'DEPLOY_WEBHOOK_TOKEN',
];
const normalizedTables = [
  'app_users',
  'purchase_requests',
  'purchase_request_lines',
  'purchase_orders',
  'purchase_order_lines',
  'delivery_orders',
  'delivery_order_source_lines',
  'efms_transport_records',
  'efms_containers',
  'logistics_tasks',
  'logistics_attachments',
  'finance_charge_lines',
  'finance_notes',
  'audit_logs',
  'shipment_milestones',
  'shipment_costs',
  'po_task_templates',
  'po_stage_tasks',
  'approval_matrix_configs',
  'approval_steps',
  'idempotency_keys',
  'outbox_events',
  'inbox_events',
  'integration_configs',
  'integration_raw_events',
  'scheduler_jobs',
  'dashboard_aggregate_snapshots',
  'state_transition_logs',
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safePreview(name: string, value: string | undefined): string {
  if (!value) return 'missing';
  if (name.includes('SECRET') || name.includes('TOKEN') || name.includes('DATABASE_URL') || name.includes('API_KEY')) return 'set';
  if (value.length <= 80) return value;
  return `${value.slice(0, 77)}...`;
}

function checkEnv(): EnvCheck[] {
  const names = [...requiredRuntimeEnv, ...optionalDeployEnv];

  return names.map((name) => {
    const value = process.env[name];
    const check: EnvCheck = {
      name,
      present: Boolean(value),
      safePreview: safePreview(name, value),
    };

    if (name === 'JWT_SECRET' && value === 'kbfe-dev-secret') {
      check.warning = 'Using dev fallback secret. Set a strong value before deploy.';
    }

    if (name === 'VITE_API_URL' && process.env.VITE_API_BASE_URL && !value) {
      check.warning = 'Project code reads VITE_API_URL, not VITE_API_BASE_URL.';
    }

    return check;
  });
}

async function inspectDbSchema() {
  const tables = await pool.query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name ASC
    `,
    [normalizedTables],
  );

  const columns = await pool.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(
    `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name ASC, ordinal_position ASC
    `,
    [normalizedTables],
  );

  const existingTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = normalizedTables.filter((table) => !existingTables.has(table));

  return {
    existingTables: tables.rows.map((row) => row.table_name),
    missingTables,
    columns: columns.rows,
  };
}

async function inspectDbCounts() {
  const counts: Record<string, number> = {};

  for (const table of normalizedTables) {
    const exists = await pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS exists
      `,
      [table],
    );

    if (!exists.rows[0]?.exists) {
      counts[table] = -1;
      continue;
    }

    const result = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }

  return counts;
}

async function checkHealth(apiBaseUrl?: string) {
  const baseUrl = apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.VITE_API_URL ?? 'http://localhost:4000/api';
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const text = await response.text();

    return {
      url: healthUrl,
      ok: response.ok,
      status: response.status,
      bodyPreview: text.slice(0, 1000),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCommand(command: string, args: string[]) {
  return new Promise<{ command: string; exitCode: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      stdout = stdout.slice(-8000);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      stderr = stderr.slice(-8000);
    });

    child.on('error', (error) => {
      resolve({
        command: [command, ...args].join(' '),
        exitCode: 1,
        stdout,
        stderr: error.message,
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        command: [command, ...args].join(' '),
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function checkRepoReadiness(includeBuild: boolean) {
  const checks = [await runCommand('pnpm', ['typecheck'])];

  if (includeBuild) {
    checks.push(await runCommand('pnpm', ['build']));
  }

  return {
    ok: checks.every((check) => check.exitCode === 0),
    checks,
  };
}

async function runDbMigration(confirm: boolean) {
  if (!confirm) {
    return {
      ok: false,
      dryRun: true,
      message: 'Set confirm=true to apply the allowlisted normalized logistics and GD1 migrations.',
      migrationFiles: migrationUrls.map((url) => fileURLToPath(url)),
    };
  }

  for (const migrationUrl of migrationUrls) {
    const migrationSql = await readFile(migrationUrl, 'utf8');
    await pool.query(migrationSql);
  }

  return {
    ok: true,
    dryRun: false,
    migrationFiles: migrationUrls.map((url) => fileURLToPath(url)),
  };
}

async function triggerDeploy(target: 'frontend' | 'backend', confirm: boolean) {
  const envName = target === 'frontend' ? 'FE_DEPLOY_WEBHOOK_URL' : 'BE_DEPLOY_WEBHOOK_URL';
  const webhookUrl = process.env[envName];

  if (!webhookUrl) {
    return {
      ok: false,
      dryRun: true,
      target,
      message: `Set ${envName} to enable MCP-triggered ${target} deploys.`,
    };
  }

  if (!confirm) {
    return {
      ok: false,
      dryRun: true,
      target,
      message: 'Set confirm=true to trigger the configured deploy webhook.',
    };
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.DEPLOY_WEBHOOK_TOKEN) {
    headers.authorization = `Bearer ${process.env.DEPLOY_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      target,
      source: 'kbfe-deploy-mcp',
      triggeredAt: new Date().toISOString(),
    }),
  });

  const bodyPreview = (await response.text()).slice(0, 1000);

  return {
    ok: response.ok,
    dryRun: false,
    target,
    status: response.status,
    bodyPreview,
  };
}

async function getPendingTasks() {
  try {
    const exists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'logistics_tasks'
      )
    `);
    if (!exists.rows[0]?.exists) {
      return { message: 'Table logistics_tasks does not exist. Run db migrations or seed first.' };
    }
    const result = await pool.query(`
      SELECT task_id, task_name, role, do_number, status, progress, due_date, is_required_for_do_closure
      FROM logistics_tasks
      WHERE status != 'COMPLETED'
      ORDER BY due_date ASC
      LIMIT 100
    `);
    return { pendingTasks: result.rows };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function getLogisticsRisks() {
  try {
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('delivery_orders', 'efms_document_reviews', 'purchase_orders')
    `);
    const existing = new Set(tablesCheck.rows.map(r => r.table_name));
    if (!existing.has('delivery_orders')) {
      return { message: 'Required logistics tables do not exist. Run db migrations or seed first.' };
    }

    const lateDos = await pool.query(`
      SELECT order_number, warehouse_deadline, planned_entry_date, actual_entry_date, delay_days, status
      FROM delivery_orders
      WHERE (actual_entry_date IS NULL AND planned_entry_date > warehouse_deadline)
         OR (actual_entry_date IS NULL AND NOW()::date > warehouse_deadline)
         OR (actual_entry_date > warehouse_deadline)
      LIMIT 50
    `);

    let docIssues: any[] = [];
    if (existing.has('efms_document_reviews')) {
      const docResult = await pool.query(`
        SELECT delivery_order_id, hbl_number, status, sla_status, notes
        FROM efms_document_reviews
        WHERE status IN ('WAITING_DOCUMENTS', 'MISMATCH')
        LIMIT 50
      `);
      docIssues = docResult.rows;
    }

    let sapSyncIssues: any[] = [];
    if (existing.has('purchase_orders')) {
      const sapResult = await pool.query(`
        SELECT po_number AS reference, sap_sync_status, status, 'PO' AS entity_type
        FROM purchase_orders
        WHERE sap_sync_status IN ('FAILED', 'PENDING')
        UNION
        SELECT order_number AS reference, sap_sync_status, status, 'DO' AS entity_type
        FROM delivery_orders
        WHERE sap_sync_status IN ('FAILED', 'PENDING')
        LIMIT 50
      `);
      sapSyncIssues = sapResult.rows;
    }

    return {
      lateDeliveryOrders: lateDos.rows,
      documentIssues: docIssues,
      sapSyncIssues: sapSyncIssues,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function jsonText(value: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorText(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

async function readResource(uri: string) {
  if (uri === 'kbfe://deploy/env') {
    return { env: checkEnv() };
  }

  if (uri === 'kbfe://deploy/db-schema') {
    return inspectDbSchema();
  }

  if (uri === 'kbfe://deploy/db-counts') {
    return inspectDbCounts();
  }

  if (uri === 'kbfe://deploy/health') {
    return checkHealth();
  }

  if (uri === 'kbfe://deploy/readiness') {
    const env = checkEnv();
    const requiredMissing = env.filter((item) => requiredRuntimeEnv.includes(item.name) && !item.present);

    return {
      ok: requiredMissing.length === 0,
      requiredMissing: requiredMissing.map((item) => item.name),
      env,
    };
  }

  if (uri === 'kbfe://risk-queue') {
    return {
      risks: [
        'Deploy-triggering MCP tools are disabled until webhook env is configured and confirm=true is supplied.',
        'DB write tools should stay limited to allowlisted migrations until audit/idempotency are complete.',
        'Project frontend reads VITE_API_URL. Keep deploy env aligned with that name.',
      ],
    };
  }

  if (uri === 'kbfe://logistics/risk-queue') {
    return getLogisticsRisks();
  }

  if (uri === 'kbfe://logistics/tasks/pending') {
    return getPendingTasks();
  }

  throw new Error(`Unknown resource: ${uri}`);
}

function listResources() {
  return [
    {
      uri: 'kbfe://deploy/readiness',
      name: 'Deployment Readiness',
      description: 'Required env readiness for FE, BE, DB, and deploy automation.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://deploy/env',
      name: 'Deployment Environment',
      description: 'Safe env presence check without secret values.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://deploy/db-schema',
      name: 'Normalized DB Schema',
      description: 'Live normalized table and column inspection.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://deploy/db-counts',
      name: 'Normalized DB Counts',
      description: 'Allowlisted table counts for deploy smoke checks.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://deploy/health',
      name: 'Backend Health',
      description: 'Backend /api/health response.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://risk-queue',
      name: 'Deploy Risk Queue',
      description: 'Known deploy risks and guardrails.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://logistics/risk-queue',
      name: 'Logistics Risk Queue',
      description: 'LIVE shipment delays, document mismatch and pending SAP sync risks.',
      mimeType: 'application/json',
    },
    {
      uri: 'kbfe://logistics/tasks/pending',
      name: 'Pending Logistics Tasks',
      description: 'LIVE pending or overdue logistics tasks blocking DO closure.',
      mimeType: 'application/json',
    },
  ];
}

function listTools() {
  return [
    {
      name: 'check_env_readiness',
      description: 'Check required deployment env names without exposing secret values.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'inspect_db_schema',
      description: 'Inspect allowlisted normalized logistics tables and columns.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'inspect_db_counts',
      description: 'Count rows in allowlisted normalized logistics tables.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'check_runtime_health',
      description: 'Call the backend /api/health endpoint.',
      inputSchema: {
        type: 'object',
        properties: {
          apiBaseUrl: { type: 'string', description: 'Optional API base URL. Defaults to API_BASE_URL or VITE_API_URL.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'check_repo_readiness',
      description: 'Run pnpm typecheck and optionally pnpm build.',
      inputSchema: {
        type: 'object',
        properties: {
          includeBuild: { type: 'boolean', description: 'Also run pnpm build after typecheck.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'run_db_migration',
      description: 'Apply the allowlisted normalized logistics and GD1 migrations when confirm=true.',
      inputSchema: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true to execute the migration.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'deploy_frontend',
      description: 'Trigger FE deploy through FE_DEPLOY_WEBHOOK_URL when confirm=true.',
      inputSchema: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true to call the deploy webhook.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'deploy_backend',
      description: 'Trigger BE deploy through BE_DEPLOY_WEBHOOK_URL when confirm=true.',
      inputSchema: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean', description: 'Must be true to call the deploy webhook.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'list_pending_tasks',
      description: 'Query live pending logistics tasks blocking DO closure from PostgreSQL.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'get_logistics_risks',
      description: 'Query live actual/forecasted shipment, document mismatch and pending SAP sync risks from PostgreSQL.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ];
}

async function callTool(name: string, rawArgs: unknown): Promise<ToolResult> {
  const args = asRecord(rawArgs);

  try {
    if (name === 'check_env_readiness') return jsonText({ env: checkEnv() });
    if (name === 'inspect_db_schema') return jsonText(await inspectDbSchema());
    if (name === 'inspect_db_counts') return jsonText(await inspectDbCounts());
    if (name === 'check_runtime_health') return jsonText(await checkHealth(args.apiBaseUrl as string | undefined));
    if (name === 'check_repo_readiness') return jsonText(await checkRepoReadiness(Boolean(args.includeBuild)));
    if (name === 'run_db_migration') return jsonText(await runDbMigration(Boolean(args.confirm)));
    if (name === 'deploy_frontend') return jsonText(await triggerDeploy('frontend', Boolean(args.confirm)));
    if (name === 'deploy_backend') return jsonText(await triggerDeploy('backend', Boolean(args.confirm)));
    if (name === 'list_pending_tasks') return jsonText(await getPendingTasks());
    if (name === 'get_logistics_risks') return jsonText(await getLogisticsRisks());

    return errorText(`Unknown tool: ${name}`);
  } catch (error) {
    return errorText(error instanceof Error ? error.message : String(error));
  }
}

function send(id: JsonRpcRequest['id'], result: unknown) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function sendError(id: JsonRpcRequest['id'], code: number, message: string) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}

async function handleMessage(message: JsonRpcRequest) {
  const { id, method } = message;

  if (!method) {
    sendError(id, -32600, 'Missing JSON-RPC method.');
    return;
  }

  if (method === 'initialize') {
    send(id, {
      protocolVersion,
      capabilities: {
        resources: {},
        tools: {},
      },
      serverInfo: {
        name: 'kbfe-deploy-mcp',
        version: '0.1.0',
      },
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'resources/list') {
    send(id, { resources: listResources() });
    return;
  }

  if (method === 'resources/read') {
    const params = asRecord(message.params);
    const uri = String(params.uri ?? '');

    try {
      const data = await readResource(uri);
      send(id, {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    } catch (error) {
      sendError(id, -32602, error instanceof Error ? error.message : String(error));
    }
    return;
  }

  if (method === 'tools/list') {
    send(id, { tools: listTools() });
    return;
  }

  if (method === 'tools/call') {
    const params = asRecord(message.params);
    const name = String(params.name ?? '');
    const result = await callTool(name, params.arguments);
    send(id, result);
    return;
  }

  if (method === 'ping') {
    send(id, {});
    return;
  }

  sendError(id, -32601, `Unknown method: ${method}`);
}

let buffer = '';
let stdinClosed = false;
let shutdownStarted = false;
const pendingMessages = new Set<Promise<void>>();

function maybeShutdown() {
  if (!stdinClosed || pendingMessages.size > 0 || shutdownStarted) return;

  shutdownStarted = true;
  pool
    .end()
    .catch((error: unknown) => {
      console.error(error);
    })
    .finally(() => {
      process.exit(0);
    });
}

function scheduleDispatch(raw: string) {
  const task = dispatch(raw).finally(() => {
    pendingMessages.delete(task);
    maybeShutdown();
  });

  pendingMessages.add(task);
}

function parseMessages(chunk: Buffer) {
  buffer += chunk.toString('utf8');

  while (buffer.length > 0) {
    if (buffer.startsWith('Content-Length:')) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = buffer.slice(0, headerEnd);
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        buffer = '';
        return;
      }

      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (buffer.length < bodyEnd) return;

      const body = buffer.slice(bodyStart, bodyEnd);
      buffer = buffer.slice(bodyEnd);
      scheduleDispatch(body);
      continue;
    }

    const newline = buffer.indexOf('\n');
    if (newline === -1) return;

    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);

    if (line) scheduleDispatch(line);
  }
}

async function dispatch(raw: string) {
  try {
    await handleMessage(JSON.parse(raw) as JsonRpcRequest);
  } catch (error) {
    sendError(null, -32700, error instanceof Error ? error.message : String(error));
  }
}

process.stdin.on('data', parseMessages);
process.stdin.on('end', () => {
  stdinClosed = true;
  maybeShutdown();
});

console.error('kbfe-deploy-mcp listening on stdio');
