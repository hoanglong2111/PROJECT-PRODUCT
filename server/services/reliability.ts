import { randomUUID, createHash } from 'node:crypto';
import type { Request, Response } from 'express';

import { ApiError } from '../errors';
import type { DatabaseClient, TokenPayload } from '../types';
import { pool } from '../db';

type JsonObject = Record<string, unknown>;

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === 'object') {
    return Object.keys(value as JsonObject)
      .sort()
      .reduce<JsonObject>((acc, key) => {
        acc[key] = sortJson((value as JsonObject)[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function hashRequest(request: Request): string {
  return createHash('sha256')
    .update(request.method)
    .update(':')
    .update(request.originalUrl)
    .update(':')
    .update(stableJson(request.body))
    .digest('hex');
}

export function tenantIdFromAuth(_auth?: TokenPayload): string {
  return 'tenant-001';
}

export async function insertAuditLog(
  client: DatabaseClient,
  input: {
    tenantId?: string | null;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    idempotencyKey?: string | null;
    requestId?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO audit_logs (
        id, tenant_id, actor_id, action, entity_type, entity_id,
        before_payload, after_payload, idempotency_key, request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      `audit-${randomUUID()}`,
      input.tenantId ?? null,
      input.actorId ?? null,
      input.action,
      input.entityType,
      input.entityId,
      input.before ?? null,
      input.after ?? null,
      input.idempotencyKey ?? null,
      input.requestId ?? null,
    ],
  );
}

export async function recordStateTransition(
  client: DatabaseClient,
  input: {
    tenantId?: string | null;
    entityType: string;
    entityId: string;
    fromStatus?: string | null;
    toStatus: string;
    reason?: string | null;
    actorId?: string | null;
    metadata?: unknown;
  },
) {
  await client.query(
    `
      INSERT INTO state_transition_logs (
        id, tenant_id, entity_type, entity_id, from_status, to_status,
        reason, actor_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      `state-${randomUUID()}`,
      input.tenantId ?? null,
      input.entityType,
      input.entityId,
      input.fromStatus ?? null,
      input.toStatus,
      input.reason ?? null,
      input.actorId ?? null,
      input.metadata ?? {},
    ],
  );
}

export async function enqueueOutboxEvent(
  client: DatabaseClient,
  input: {
    tenantId?: string | null;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    destination?: string;
    payload: unknown;
    headers?: unknown;
    idempotencyKey?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO outbox_events (
        id, tenant_id, aggregate_type, aggregate_id, event_type,
        destination, payload, headers, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      `outbox-${randomUUID()}`,
      input.tenantId ?? 'tenant-001',
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      input.destination ?? 'internal',
      input.payload,
      input.headers ?? {},
      input.idempotencyKey ?? null,
    ],
  );
}

export async function runIdempotentMutation<T>(
  request: Request & { auth?: TokenPayload },
  response: Response,
  handler: () => Promise<{ statusCode?: number; body: { data: T; errors?: unknown[]; meta?: Record<string, unknown> } }>,
) {
  const key = String(request.header('Idempotency-Key') ?? '').trim();
  if (!key) {
    throw new ApiError(400, 'Idempotency-Key header is required for create requests.');
  }

  const tenantId = tenantIdFromAuth(request.auth);
  const requestHash = hashRequest(request);
  const id = `idem-${randomUUID()}`;
  const insertRes = await pool.query(
    `
      INSERT INTO idempotency_keys (
        id, tenant_id, idempotency_key, request_method, request_path,
        request_hash, status, locked_until
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS', NOW() + INTERVAL '5 minutes')
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    `,
    [id, tenantId, key, request.method, request.originalUrl, requestHash],
  );

  if (insertRes.rowCount === 0) {
    const existing = await pool.query<{
      request_hash: string;
      status: string;
      response_status: number | null;
      response_body: unknown;
    }>(
      `
        SELECT request_hash, status, response_status, response_body
        FROM idempotency_keys
        WHERE tenant_id = $1 AND idempotency_key = $2
      `,
      [tenantId, key],
    );
    const row = existing.rows[0];
    if (!row) {
      throw new ApiError(409, 'Idempotency key conflict. Please retry.');
    }
    if (row.request_hash !== requestHash) {
      throw new ApiError(409, 'Idempotency-Key was reused with a different request payload.');
    }
    if (row.status === 'COMPLETED' && row.response_status && row.response_body) {
      response.status(row.response_status).json(row.response_body);
      return;
    }
    throw new ApiError(409, 'A request with this Idempotency-Key is already in progress.');
  }

  try {
    const result = await handler();
    const statusCode = result.statusCode ?? 200;
    await pool.query(
      `
        UPDATE idempotency_keys
        SET status = 'COMPLETED', response_status = $1, response_body = $2, updated_at = NOW()
        WHERE tenant_id = $3 AND idempotency_key = $4
      `,
      [statusCode, result.body, tenantId, key],
    );
    response.status(statusCode).json(result.body);
  } catch (error) {
    await pool.query(
      `
        UPDATE idempotency_keys
        SET status = 'FAILED', updated_at = NOW()
        WHERE tenant_id = $1 AND idempotency_key = $2
      `,
      [tenantId, key],
    );
    throw error;
  }
}
