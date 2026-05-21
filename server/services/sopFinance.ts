import { randomUUID } from 'node:crypto';

import { pool } from '../db';
import { ApiError } from '../errors';
import type { DatabaseClient, TokenPayload } from '../types';
import { decorateFinanceNote } from './sopDecorators';
import { insertAudit, nextNumber } from './sopDb';
import { findDeliveryOrder } from './sopCore';
import type { ChargeType, Row } from './sopTypes';
import {
  normalizeAdvanceSettlementStatus,
  normalizeChargeType,
  normalizeCurrencyCode,
  normalizeTaskOwnerRole,
  optionalString,
  requiredPositiveNumber,
  requiredString,
  stringValue,
  toCamelObject,
} from './sopUtils';

export async function listCharges(orderNumber: string) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const result = await pool.query<Row>('SELECT * FROM finance_charge_lines WHERE delivery_order_id = $1 ORDER BY created_at DESC', [
    deliveryOrder.id,
  ]);
  return result.rows.map(toCamelObject);
}

export async function createCharge(orderNumber: string, body: Record<string, unknown>) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const chargeType = normalizeChargeType(body.chargeType);
  const result = await pool.query<Row>(
    `
      INSERT INTO finance_charge_lines (
        id, delivery_order_id, charge_type, charge_code, description, amount, currency, is_locked
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      `charge-${randomUUID()}`,
      deliveryOrder.id,
      chargeType,
      requiredString(body.chargeCode, 'chargeCode'),
      requiredString(body.description, 'description'),
      requiredPositiveNumber(body.amount, 'amount'),
      normalizeCurrencyCode(body.currency, 'currency'),
      chargeType === 'SELLING',
    ],
  );
  return toCamelObject(result.rows[0]);
}

export async function updateCharge(chargeId: string, body: Record<string, unknown>) {
  const current = await pool.query<Row>('SELECT * FROM finance_charge_lines WHERE id = $1', [chargeId]);
  if (current.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy charge line.');
  }
  if (
    stringValue(current.rows[0].charge_type) === 'SELLING' ||
    current.rows[0].is_locked === true ||
    optionalString(current.rows[0].invoiced_note_id)
  ) {
    throw new ApiError(409, 'Charge line đã khóa hoặc đã nằm trong note, không cho sửa/xóa.');
  }
  const result = await pool.query<Row>(
    `
      UPDATE finance_charge_lines
      SET charge_code = COALESCE($1, charge_code),
          description = COALESCE($2, description),
          amount = COALESCE($3, amount),
          currency = COALESCE($4, currency),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
    [
      optionalString(body.chargeCode),
      optionalString(body.description),
      body.amount === undefined ? null : requiredPositiveNumber(body.amount, 'amount'),
      body.currency === undefined ? null : normalizeCurrencyCode(body.currency, 'currency'),
      chargeId,
    ],
  );
  return toCamelObject(result.rows[0]);
}

export async function deleteCharge(chargeId: string) {
  const current = await pool.query<Row>('SELECT * FROM finance_charge_lines WHERE id = $1', [chargeId]);
  if (current.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy charge line.');
  }
  if (
    stringValue(current.rows[0].charge_type) === 'SELLING' ||
    current.rows[0].is_locked === true ||
    optionalString(current.rows[0].invoiced_note_id)
  ) {
    throw new ApiError(409, 'Charge line đã khóa hoặc đã nằm trong note, không cho sửa/xóa.');
  }
  const result = await pool.query<Row>('DELETE FROM finance_charge_lines WHERE id = $1 RETURNING *', [chargeId]);
  return toCamelObject(result.rows[0]);
}

export async function issueFinanceNote(orderNumber: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const chargeType = body.chargeType === undefined ? 'SELLING' : normalizeChargeType(body.chargeType);
  const noteType =
    optionalString(body.noteType) ??
    (chargeType === 'SELLING' ? 'FINAL_DEBIT_NOTE' : chargeType === 'BUYING' ? 'CREDIT_NOTE' : 'OBH_NOTE');
  const accountingCode = chargeType === 'SELLING' ? 'S' : chargeType === 'BUYING' ? 'B' : 'OBH';
  const result = await createFinanceNoteForDeliveryOrder(pool, deliveryOrder.id, noteType, accountingCode, auth, {
    chargeType,
    requireChargeLines: true,
  });
  return decorateFinanceNote(result);
}

export async function sendFinanceNoteToAccounting(noteId: string, auth?: TokenPayload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const current = await client.query<Row>('SELECT * FROM finance_notes WHERE id = $1', [noteId]);
    if (current.rowCount === 0) {
      throw new ApiError(404, 'Không tìm thấy finance note.');
    }
    const result = await client.query<Row>(
      `
        UPDATE finance_notes
        SET status = 'SENT_TO_ACC',
            sent_to_accounting_at = COALESCE(sent_to_accounting_at, NOW())
        WHERE id = $1
        RETURNING *
      `,
      [noteId],
    );
    await insertAudit(client, auth, 'FINANCE_NOTE_SENT_TO_ACC', 'finance_note', noteId, current.rows[0], result.rows[0]);
    await client.query('COMMIT');
    return decorateFinanceNote(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createAdvanceSettlement(orderNumber: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const settlementNumber = await nextNumber(
    pool,
    'advance_settlements',
    'settlement_number',
    `ADV-${new Date().getFullYear()}-`,
  );
  const result = await pool.query<Row>(
    `
      INSERT INTO advance_settlements (
        id, delivery_order_id, hbl_number, settlement_number, requested_by,
        assigned_role, amount, currency, purpose, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'REQUESTED', $10)
      RETURNING *
    `,
    [
      `adv-${randomUUID()}`,
      deliveryOrder.id,
      optionalString(body.hblNumber),
      settlementNumber,
      auth?.sub ?? null,
      normalizeTaskOwnerRole(body.assignedRole),
      requiredPositiveNumber(body.amount, 'amount'),
      normalizeCurrencyCode(body.currency, 'currency'),
      requiredString(body.purpose, 'purpose'),
      optionalString(body.notes) ?? '',
    ],
  );
  return toCamelObject(result.rows[0]);
}

export async function updateAdvanceSettlementStatus(
  settlementId: string,
  body: Record<string, unknown>,
  auth?: TokenPayload,
) {
  const status = normalizeAdvanceSettlementStatus(body.status);
  const result = await pool.query<Row>(
    `
      UPDATE advance_settlements
      SET status = $1,
          approved_by = CASE WHEN $1 IN ('APPROVED', 'REJECTED') THEN $2 ELSE approved_by END,
          settled_by = CASE WHEN $1 = 'SETTLED' THEN $2 ELSE settled_by END,
          approved_at = CASE WHEN $1 IN ('APPROVED', 'REJECTED') AND approved_at IS NULL THEN NOW() ELSE approved_at END,
          settled_at = CASE WHEN $1 = 'SETTLED' AND settled_at IS NULL THEN NOW() ELSE settled_at END,
          notes = COALESCE($3, notes),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [status, auth?.sub ?? null, optionalString(body.notes), settlementId],
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy tạm ứng.');
  }
  return toCamelObject(result.rows[0]);
}

export async function createFinanceNoteForDeliveryOrder(
  client: DatabaseClient,
  deliveryOrderId: string,
  noteType: string,
  accountingCode: string,
  auth?: TokenPayload,
  options: { chargeType?: ChargeType; requireChargeLines?: boolean; slaDueAt?: string | null } = {},
) {
  const chargeRows = await selectChargeRowsForFinanceNote(client, deliveryOrderId, noteType, options.chargeType);
  if (options.requireChargeLines && chargeRows.length === 0) {
    throw new ApiError(409, 'Không còn charge line phù hợp để phát hành note này.');
  }
  const chargeIds = chargeRows.map((row) => stringValue(row.id));
  const notePrefix =
    noteType === 'DEBIT_NOTE_OF_AF'
      ? 'DN-OF-AF'
      : noteType === 'FINAL_DEBIT_NOTE'
        ? 'FDN'
        : noteType === 'OBH_NOTE'
          ? 'OBH'
          : 'CN';
  const noteNumber = await nextNumber(client, 'finance_notes', 'note_number', `${notePrefix}-${new Date().getFullYear()}-`);
  const result = await client.query<Row>(
    `
      INSERT INTO finance_notes (
        id, delivery_order_id, note_number, note_type, accounting_code, status,
        charge_ids, sla_due_at, issued_at, sent_to_accounting_at
      )
      VALUES ($1, $2, $3, $4, $5, 'ISSUED', $6, $7, NOW(), NULL)
      RETURNING *
    `,
    [`note-${randomUUID()}`, deliveryOrderId, noteNumber, noteType, accountingCode, chargeIds, options.slaDueAt ?? null],
  );
  if (chargeIds.length > 0) {
    await client.query(
      `
        UPDATE finance_charge_lines
        SET invoiced_note_id = $1,
            invoiced_at = NOW(),
            updated_at = NOW()
        WHERE id = ANY($2::TEXT[])
      `,
      [result.rows[0].id, chargeIds],
    );
  }
  await insertAudit(client, auth, 'FINANCE_NOTE_ISSUED', 'delivery_order', deliveryOrderId, null, result.rows[0]);
  return result.rows[0];
}

export async function selectChargeRowsForFinanceNote(
  client: DatabaseClient,
  deliveryOrderId: string,
  noteType: string,
  chargeType?: ChargeType,
) {
  const targetChargeType = chargeType ?? (noteType === 'CREDIT_NOTE' ? 'BUYING' : noteType === 'OBH_NOTE' ? 'OBH' : 'SELLING');
  const result = await client.query<Row>(
    `
      SELECT *
      FROM finance_charge_lines
      WHERE delivery_order_id = $1
        AND charge_type = $2
        AND invoiced_note_id IS NULL
      ORDER BY created_at ASC
    `,
    [deliveryOrderId, targetChargeType],
  );

  if (noteType === 'DEBIT_NOTE_OF_AF') {
    return result.rows.filter(isOfAfCharge);
  }

  if (noteType === 'FINAL_DEBIT_NOTE') {
    return result.rows.filter((row) => !isOfAfCharge(row));
  }

  return result.rows;
}

function isOfAfCharge(row: Row) {
  const haystack = `${stringValue(row.charge_code)} ${stringValue(row.description)}`.toUpperCase();
  return /\b(OF|AF)\b/.test(haystack) || haystack.includes('OCEAN FREIGHT') || haystack.includes('AIR FREIGHT');
}
