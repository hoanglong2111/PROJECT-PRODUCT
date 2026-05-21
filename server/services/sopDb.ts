import { randomUUID } from 'node:crypto';

import type { DatabaseClient, TokenPayload } from '../types';
import type { Row } from './sopTypes';
import { stringValue } from './sopUtils';

export async function insertAudit(
  client: DatabaseClient,
  auth: TokenPayload | undefined,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await client.query(
    `
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, before_payload, after_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [`audit-${randomUUID()}`, auth?.sub ?? null, action, entityType, entityId, before ?? null, after ?? null],
  );
}

export async function nextNumber(client: DatabaseClient, table: string, column: string, prefix: string) {
  const result = await client.query<Row>(`SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE $1`, [`${prefix}%`]);
  const max = result.rows.reduce((highest, row) => {
    const code = stringValue(row.code);
    const suffix = Number(code.slice(prefix.length));
    return Number.isFinite(suffix) ? Math.max(highest, suffix) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}
