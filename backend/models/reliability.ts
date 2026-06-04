import { randomUUID } from 'node:crypto';

import type { DatabaseClient } from '../domain/types';

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
