import { randomUUID } from 'node:crypto';

import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { DatabaseClient, TokenPayload } from '../domain/types';
import { decorateFinanceNote, decorateQuotation } from './sopDecorators';
import { insertAudit, nextNumber } from './sopDb';
import type { QuotationAction, Row } from './sopTypes';
import {
  addHours,
  normalizeCurrencyCode,
  normalizeQuotationAction,
  normalizeShippingMode,
  optionalNonNegativeNumber,
  requiredString,
  stringValue,
  toCamelObject,
} from './sopUtils';

export async function listQuotations() {
  await applyLclAutoApproval(pool);
  const result = await pool.query<Row>('SELECT * FROM logistics_quotations ORDER BY created_at DESC');
  return result.rows.map(decorateQuotation);
}

export async function createQuotation(body: {
  currency?: string;
  quoteAmount?: number | null;
  requestCode?: string;
  shippingMode?: string;
}, auth?: TokenPayload) {
  const requestCode = requiredString(body.requestCode, 'requestCode');
  const shippingMode = normalizeShippingMode(body.shippingMode);
  const quoteAmount = optionalNonNegativeNumber(body.quoteAmount, 'quoteAmount');
  const currency = body.currency === undefined ? null : normalizeCurrencyCode(body.currency, 'currency');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const request = await client.query<Row>('SELECT requested_order_id FROM purchase_requests WHERE requested_order_id = $1', [requestCode]);
    if (request.rowCount === 0) {
      throw new ApiError(404, 'Không tìm thấy PR để tạo báo giá.');
    }

    const quoteNumber = await nextNumber(client, 'logistics_quotations', 'quote_number', `QT-${new Date().getFullYear()}-`);
    const now = new Date();
    const preliminaryDue = addHours(now, 1);
    const officialDue = addHours(now, 8);
    const result = await client.query<Row>(
      `
        INSERT INTO logistics_quotations (
          id, quote_number, request_code, shipping_mode, status, preliminary_due_at,
          official_due_at, quote_amount, currency, created_by
        )
        VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        `quote-${randomUUID()}`,
        quoteNumber,
        requestCode,
        shippingMode,
        preliminaryDue.toISOString(),
        officialDue.toISOString(),
        quoteAmount,
        currency,
        auth?.sub ?? null,
      ],
    );
    await client.query('COMMIT');
    return decorateFinanceNote(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateQuotationAction(quotationId: string, body: { action?: string }, auth?: TokenPayload) {
  const action = normalizeQuotationAction(body.action);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await applyLclAutoApproval(client);
    const quotation = await getQuotation(quotationId, client);
    const now = new Date();
    const patch = quotationPatchForAction(action, quotation, now);
    const result = await client.query<Row>(
      `
        UPDATE logistics_quotations
        SET status = $1,
            preliminary_sent_at = COALESCE($2, preliminary_sent_at),
            official_sent_at = COALESCE($3, official_sent_at),
            auto_approve_at = $4,
            customer_response_at = COALESCE($5, customer_response_at),
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        patch.status,
        patch.preliminarySentAt,
        patch.officialSentAt,
        patch.autoApproveAt,
        patch.customerResponseAt,
        quotationId,
      ],
    );
    await insertAudit(client, auth, action, 'quotation', quotationId, quotation, result.rows[0]);
    await client.query('COMMIT');
    return toCamelObject(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmQuotationBooking(
  quotationId: string,
  body: { bookingNumber?: string },
  auth?: TokenPayload,
) {
  const bookingNumber = requiredString(body.bookingNumber, 'bookingNumber');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await applyLclAutoApproval(client);
    const quotation = await getQuotation(quotationId, client);
    if (!['APPROVED', 'BOOKED'].includes(stringValue(quotation.status))) {
      throw new ApiError(409, 'Chỉ báo giá đã được chấp thuận mới được lấy Booking.');
    }
    const result = await client.query<Row>(
      `
        UPDATE logistics_quotations
        SET booking_number = $1, booking_confirmed_at = NOW(), status = 'BOOKED', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [bookingNumber, quotationId],
    );
    await insertAudit(client, auth, 'BOOKING_CONFIRMED', 'quotation', quotationId, quotation, result.rows[0]);
    await client.query('COMMIT');
    return toCamelObject(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function applyLclAutoApproval(client: DatabaseClient) {
  await client.query(
    `
      UPDATE logistics_quotations
      SET status = 'APPROVED',
          customer_response_at = COALESCE(customer_response_at, auto_approve_at),
          updated_at = NOW()
      WHERE shipping_mode = 'LCL'
        AND status = 'OFFICIAL_SENT'
        AND auto_approve_at IS NOT NULL
        AND auto_approve_at <= NOW()
    `,
  );
}

async function getQuotation(id: string, client: DatabaseClient) {
  const result = await client.query<Row>('SELECT * FROM logistics_quotations WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy báo giá.');
  }
  return result.rows[0];
}

function quotationPatchForAction(action: QuotationAction, quotation: Row, now: Date) {
  const status = stringValue(quotation.status);
  if (status === 'BOOKED') {
    throw new ApiError(409, 'Báo giá đã lấy Booking, không thể đổi trạng thái.');
  }

  if (action === 'SEND_PRELIMINARY') {
    return { status: 'PRELIMINARY_SENT', preliminarySentAt: now.toISOString(), officialSentAt: null, autoApproveAt: quotation.auto_approve_at, customerResponseAt: null };
  }

  if (action === 'SEND_OFFICIAL') {
    if (!['PRELIMINARY_SENT', 'DRAFT', 'REVISION_REQUESTED'].includes(status)) {
      throw new ApiError(409, 'Chỉ gửi báo giá chính thức sau nháp/sơ bộ/yêu cầu chỉnh.');
    }
    const isLcl = stringValue(quotation.shipping_mode) === 'LCL';
    return {
      status: 'OFFICIAL_SENT',
      preliminarySentAt: null,
      officialSentAt: now.toISOString(),
      autoApproveAt: isLcl ? addHours(now, 2).toISOString() : null,
      customerResponseAt: null,
    };
  }

  if (action === 'CUSTOMER_APPROVED') {
    return { status: 'APPROVED', preliminarySentAt: null, officialSentAt: null, autoApproveAt: quotation.auto_approve_at, customerResponseAt: now.toISOString() };
  }

  if (action === 'CUSTOMER_REJECTED') {
    return { status: 'REJECTED', preliminarySentAt: null, officialSentAt: null, autoApproveAt: quotation.auto_approve_at, customerResponseAt: now.toISOString() };
  }

  return { status: 'REVISION_REQUESTED', preliminarySentAt: null, officialSentAt: null, autoApproveAt: null, customerResponseAt: now.toISOString() };
}