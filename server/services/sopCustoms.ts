import { randomUUID } from 'node:crypto';

import { pool } from '../db';
import type { TokenPayload } from '../types';
import { decorateCustoms } from './sopDecorators';
import { findDeliveryOrder } from './sopCore';
import type { Row } from './sopTypes';
import {
  inferLaneStatus,
  normalizeCustomsChannel,
  normalizeCustomsLaneStatus,
  normalizeCustomsStatus,
  optionalString,
} from './sopUtils';

export async function getCustoms(orderNumber: string) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const [result, transport] = await Promise.all([
    pool.query<Row>('SELECT * FROM customs_declarations WHERE delivery_order_id = $1', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM efms_transport_records WHERE delivery_order_id = $1', [deliveryOrder.id]),
  ]);
  const row = result.rows[0] ?? null;
  return row ? decorateCustoms(row, transport.rows[0] ?? null) : null;
}

export async function updateCustoms(orderNumber: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const channel = body.channel === undefined ? null : normalizeCustomsChannel(body.channel);
  const status = body.status === undefined ? null : normalizeCustomsStatus(body.status);
  const laneStatus =
    body.laneStatus === undefined
      ? inferLaneStatus(channel, status)
      : normalizeCustomsLaneStatus(body.laneStatus);
  const telexReleased = body.telexReleased === undefined ? null : Boolean(body.telexReleased);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query<Row>(
      `
        INSERT INTO customs_declarations (
          id, delivery_order_id, declaration_number, channel, status, lane_status, telex_released,
          telex_released_at, submitted_at, cleared_at, notes, updated_by
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, 'DRAFT'), $6, COALESCE($7, FALSE),
                CASE WHEN $7 = TRUE THEN NOW() ELSE NULL END,
                CASE WHEN $5 IN ('SUBMITTED', 'CLEARED') THEN NOW() ELSE NULL END,
                CASE WHEN $5 = 'CLEARED' THEN NOW() ELSE NULL END,
                COALESCE($8, ''), $9)
        ON CONFLICT (delivery_order_id)
        DO UPDATE SET declaration_number = COALESCE(EXCLUDED.declaration_number, customs_declarations.declaration_number),
                      channel = COALESCE(EXCLUDED.channel, customs_declarations.channel),
                      status = COALESCE($5, customs_declarations.status),
                      lane_status = COALESCE($6, customs_declarations.lane_status),
                      telex_released = COALESCE($7, customs_declarations.telex_released),
                      telex_released_at = CASE
                        WHEN $7 = TRUE AND customs_declarations.telex_released_at IS NULL THEN NOW()
                        ELSE customs_declarations.telex_released_at
                      END,
                      submitted_at = CASE
                        WHEN $5 IN ('SUBMITTED', 'CLEARED') AND customs_declarations.submitted_at IS NULL THEN NOW()
                        ELSE customs_declarations.submitted_at
                      END,
                      cleared_at = CASE
                        WHEN $5 = 'CLEARED' AND customs_declarations.cleared_at IS NULL THEN NOW()
                        ELSE customs_declarations.cleared_at
                      END,
                      notes = COALESCE(EXCLUDED.notes, customs_declarations.notes),
                      updated_by = EXCLUDED.updated_by,
                      updated_at = NOW()
        RETURNING *
      `,
      [
        `cus-${randomUUID()}`,
        deliveryOrder.id,
        optionalString(body.declarationNumber),
        channel,
        status,
        laneStatus,
        telexReleased,
        optionalString(body.notes),
        auth?.sub ?? null,
      ],
    );
    const transport = await client.query<Row>('SELECT * FROM efms_transport_records WHERE delivery_order_id = $1', [
      deliveryOrder.id,
    ]);
    await client.query('COMMIT');
    return decorateCustoms(result.rows[0], transport.rows[0] ?? null);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
