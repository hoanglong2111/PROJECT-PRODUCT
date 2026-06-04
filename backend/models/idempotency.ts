import { randomUUID } from 'node:crypto';

import { pool } from '../config/database';

export type IdempotencyRecord = {
  request_hash: string;
  response_body: unknown;
  response_status: number | null;
  status: string;
};

export async function claimIdempotencyKey(input: {
  key: string;
  method: string;
  path: string;
  requestHash: string;
  tenantId: string;
}) {
  const result = await pool.query(
    `
      INSERT INTO idempotency_keys (
        id, tenant_id, idempotency_key, request_method, request_path,
        request_hash, status, locked_until
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS', NOW() + INTERVAL '5 minutes')
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    `,
    [`idem-${randomUUID()}`, input.tenantId, input.key, input.method, input.path, input.requestHash],
  );

  return result.rowCount !== 0;
}

export async function findIdempotencyRecord(tenantId: string, key: string) {
  const result = await pool.query<IdempotencyRecord>(
    `
      SELECT request_hash, status, response_status, response_body
      FROM idempotency_keys
      WHERE tenant_id = $1 AND idempotency_key = $2
    `,
    [tenantId, key],
  );

  return result.rows[0] ?? null;
}

export async function completeIdempotencyKey(tenantId: string, key: string, statusCode: number, body: unknown) {
  await pool.query(
    `
      UPDATE idempotency_keys
      SET status = 'COMPLETED', response_status = $1, response_body = $2, updated_at = NOW()
      WHERE tenant_id = $3 AND idempotency_key = $4
    `,
    [statusCode, body, tenantId, key],
  );
}

export async function failIdempotencyKey(tenantId: string, key: string) {
  await pool.query(
    `
      UPDATE idempotency_keys
      SET status = 'FAILED', updated_at = NOW()
      WHERE tenant_id = $1 AND idempotency_key = $2
    `,
    [tenantId, key],
  );
}
