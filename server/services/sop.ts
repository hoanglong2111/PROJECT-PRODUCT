import { randomUUID } from 'node:crypto';

import type { AppRole } from '../../src/auth/types';
import { pool } from '../db';
import { ApiError } from '../errors';
import type { DatabaseClient, TokenPayload } from '../types';

type Row = Record<string, unknown>;
type ShippingMode = 'AIR' | 'FCL' | 'LCL';
type MblType = 'COPY' | 'ORIGINAL' | 'SEAWAY_BILL' | 'SURRENDERED';
type QuotationAction =
  | 'SEND_PRELIMINARY'
  | 'SEND_OFFICIAL'
  | 'CUSTOMER_APPROVED'
  | 'CUSTOMER_REJECTED'
  | 'REVISION_REQUESTED';
type ChargeType = 'SELLING' | 'BUYING' | 'OBH';
type CustomsChannel = 'GREEN' | 'YELLOW' | 'RED';
type CustomsStatus = 'DRAFT' | 'SUBMITTED' | 'CLEARED' | 'NEEDS_DOCUMENTS' | 'INSPECTION' | 'VIOLATION_HANDLING';
type CustomsLaneStatus =
  | 'GREEN_CLEARANCE'
  | 'YELLOW_NEED_SUPPLEMENT'
  | 'RED_FIELD_INSPECTION'
  | 'RED_VIOLATION_HANDLING'
  | 'RELEASE_READY';
type AdvanceSettlementStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'SETTLED';
type SlaStatus = 'ON_TRACK' | 'OVERDUE' | 'DONE';

const QUOTATION_STATUSES = new Set([
  'DRAFT',
  'PRELIMINARY_SENT',
  'OFFICIAL_SENT',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
  'BOOKED',
]);
const SHIPPING_MODES = new Set<ShippingMode>(['AIR', 'FCL', 'LCL']);
const QUOTATION_ACTIONS = new Set<QuotationAction>([
  'SEND_PRELIMINARY',
  'SEND_OFFICIAL',
  'CUSTOMER_APPROVED',
  'CUSTOMER_REJECTED',
  'REVISION_REQUESTED',
]);
const CHARGE_TYPES = new Set<ChargeType>(['SELLING', 'BUYING', 'OBH']);
const MBL_TYPES = new Set<MblType>(['COPY', 'ORIGINAL', 'SEAWAY_BILL', 'SURRENDERED']);
const CUSTOMS_CHANNELS = new Set<CustomsChannel>(['GREEN', 'YELLOW', 'RED']);
const CUSTOMS_STATUSES = new Set<CustomsStatus>([
  'DRAFT',
  'SUBMITTED',
  'CLEARED',
  'NEEDS_DOCUMENTS',
  'INSPECTION',
  'VIOLATION_HANDLING',
]);
const CUSTOMS_LANE_STATUSES = new Set<CustomsLaneStatus>([
  'GREEN_CLEARANCE',
  'YELLOW_NEED_SUPPLEMENT',
  'RED_FIELD_INSPECTION',
  'RED_VIOLATION_HANDLING',
  'RELEASE_READY',
]);
const ADVANCE_SETTLEMENT_STATUSES = new Set<AdvanceSettlementStatus>([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'SETTLED',
]);
const DRIVE_REQUIRED_DOCUMENTS = ['Quotation', 'Final B/L', 'Customs Declaration', 'POD', 'OBH Note'];
const TASK_ROLE_BY_APP_ROLE: Partial<Record<AppRole, string>> = {
  CUSTOMS_OFFICER: 'Customs Officer',
  FINANCE_OFFICER: 'Finance Officer',
  PIC_MANAGER: 'PIC Manager',
  PORT_OFFICER: 'Port Officer',
  SALE_STAFF: 'Sale Staff',
  WAREHOUSE_STAFF: 'Warehouse Staff',
};

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

export async function getEfmsControl(orderNumber: string) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const [transport, containers, houseBills, reviews, customs, charges, notes, advances, dossiers] = await Promise.all([
    pool.query<Row>('SELECT * FROM efms_transport_records WHERE delivery_order_id = $1', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM efms_containers WHERE delivery_order_id = $1 ORDER BY container_number ASC', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM efms_house_bills WHERE delivery_order_id = $1 ORDER BY hbl_number ASC', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM efms_document_reviews WHERE delivery_order_id = $1 ORDER BY created_at DESC', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM customs_declarations WHERE delivery_order_id = $1', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM finance_charge_lines WHERE delivery_order_id = $1 ORDER BY created_at DESC', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM finance_notes WHERE delivery_order_id = $1 ORDER BY issued_at DESC NULLS LAST, note_number DESC', [
      deliveryOrder.id,
    ]),
    pool.query<Row>('SELECT * FROM advance_settlements WHERE delivery_order_id = $1 ORDER BY created_at DESC', [deliveryOrder.id]),
    pool.query<Row>('SELECT * FROM drive_dossiers WHERE delivery_order_id = $1 ORDER BY created_at DESC', [deliveryOrder.id]),
  ]);

  const customsRow = customs.rows[0] ?? null;
  const transportRow = transport.rows[0] ?? null;
  return {
    advanceSettlements: advances.rows.map(toCamelObject),
    charges: charges.rows.map(toCamelObject),
    containers: containers.rows.map(toCamelObject),
    customs: customsRow ? decorateCustoms(customsRow, transportRow) : null,
    documentReviews: reviews.rows.map(decorateDocumentReview),
    houseBills: houseBills.rows.map(toCamelObject),
    financeNotes: notes.rows.map(decorateFinanceNote),
    latestDriveDossier: dossiers.rows[0] ? toCamelObject(dossiers.rows[0]) : null,
    transport: transportRow ? toCamelObject(transportRow) : null,
  };
}

export async function updateShippingInstruction(orderNumber: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const mblType = body.mblType === undefined ? undefined : normalizeMblType(body.mblType);
  const actualDepartureAt =
    body.actualDepartureAt !== undefined ? optionalDateTime(body.actualDepartureAt, 'actualDepartureAt') : undefined;
  const actualArrivalAt =
    body.actualArrivalAt !== undefined ? optionalDateTime(body.actualArrivalAt, 'actualArrivalAt') : undefined;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const before = await client.query<Row>('SELECT * FROM efms_transport_records WHERE delivery_order_id = $1', [deliveryOrder.id]);
    const current = before.rows[0];
    if (!current) {
      throw new ApiError(404, 'Không tìm thấy bản ghi eFMS transport của DO.');
    }
    const grossWeight =
      body.grossWeight !== undefined
        ? requiredPositiveNumber(body.grossWeight, 'grossWeight')
        : requiredPositiveNumber(current.gross_weight, 'grossWeight');
    const cbm =
      body.cbm !== undefined ? requiredPositiveNumber(body.cbm, 'cbm') : requiredPositiveNumber(current.cbm, 'cbm');
    const result = await client.query<Row>(
      `
        UPDATE efms_transport_records
        SET booking_number = COALESCE($1, booking_number),
            mbl_number = COALESCE($2, mbl_number),
            mbl_type = COALESCE($3, mbl_type),
            manifest_number = COALESCE($4, manifest_number),
            shipping_line = COALESCE($5, shipping_line),
            vessel_code = COALESCE($6, vessel_code),
            gross_weight = $7,
            cbm = $8,
            actual_departure_at = COALESCE($9, actual_departure_at),
            actual_arrival_at = COALESCE($10, actual_arrival_at)
        WHERE delivery_order_id = $11
        RETURNING *
      `,
      [
        optionalString(body.bookingNumber),
        optionalString(body.mblNumber),
        mblType,
        optionalString(body.manifestNumber),
        optionalString(body.shippingLine),
        optionalString(body.vesselCode),
        grossWeight,
        cbm,
        actualDepartureAt,
        actualArrivalAt,
        deliveryOrder.id,
      ],
    );
    await insertAudit(client, auth, 'SI_MANIFEST_UPDATED', 'delivery_order', orderNumber, before.rows[0] ?? null, result.rows[0]);
    await client.query('COMMIT');
    return toCamelObject(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createHouseBill(orderNumber: string, body: Record<string, unknown>) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const hblNumber = requiredString(body.hblNumber, 'hblNumber');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query<Row>(
      `
        INSERT INTO efms_house_bills (
          id, delivery_order_id, hbl_number, shipper, consignee, place_of_receipt, place_of_delivery, assigned_to
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (delivery_order_id, hbl_number)
        DO UPDATE SET shipper = EXCLUDED.shipper,
                      consignee = EXCLUDED.consignee,
                      place_of_receipt = EXCLUDED.place_of_receipt,
                      place_of_delivery = EXCLUDED.place_of_delivery,
                      assigned_to = COALESCE(EXCLUDED.assigned_to, efms_house_bills.assigned_to),
                      updated_at = NOW()
        RETURNING *
      `,
      [
        `hbl-${randomUUID()}`,
        deliveryOrder.id,
        hblNumber,
        requiredString(body.shipper, 'shipper'),
        requiredString(body.consignee, 'consignee'),
        optionalString(body.placeOfReceipt),
        optionalString(body.placeOfDelivery),
        optionalString(body.assignedTo),
      ],
    );
    await ensureHouseBillTasks(client, deliveryOrder, hblNumber);
    await client.query('COMMIT');
    return toCamelObject(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createContainer(orderNumber: string, body: Record<string, unknown>) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const result = await pool.query<Row>(
    `
      INSERT INTO efms_containers (
        id, delivery_order_id, container_type, container_number, seal_number, vehicle_type, vehicle_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      `ctr-${randomUUID()}`,
      deliveryOrder.id,
      requiredString(body.containerType, 'containerType'),
      requiredString(body.containerNumber, 'containerNumber'),
      optionalString(body.sealNumber),
      optionalString(body.vehicleType),
      optionalString(body.vehicleNumber),
    ],
  );
  return decorateDocumentReview(result.rows[0]);
}

export async function createDocumentReview(orderNumber: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const draftBl = await requireAttachmentForDocument(deliveryOrder.order_number, body.draftBlAttachmentId, 'Draft B/L');
  const invoice = await requireAttachmentForDocument(deliveryOrder.order_number, body.commercialInvoiceAttachmentId, 'Commercial Invoice');
  const packingList = await requireAttachmentForDocument(deliveryOrder.order_number, body.packingListAttachmentId, 'Packing List');
  const result = await pool.query<Row>(
    `
      INSERT INTO efms_document_reviews (
        id, delivery_order_id, hbl_number, status, draft_bl_attachment_id,
        commercial_invoice_attachment_id, packing_list_attachment_id, cross_check_due_at,
        notes, created_by
      )
      VALUES ($1, $2, $3, 'READY_FOR_CHECK', $4, $5, $6, NOW() + INTERVAL '1 hour', $7, $8)
      RETURNING *
    `,
    [
      `doc-review-${randomUUID()}`,
      deliveryOrder.id,
      optionalString(body.hblNumber),
      draftBl.id,
      invoice.id,
      packingList.id,
      optionalString(body.notes) ?? '',
      auth?.sub ?? null,
    ],
  );
  return toCamelObject(result.rows[0]);
}

export async function confirmDocumentCrossCheck(reviewId: string, body: Record<string, unknown>) {
  const matched = Boolean(body.matched);
  const result = await pool.query<Row>(
    `
      UPDATE efms_document_reviews
      SET status = $1, cross_checked_at = NOW(), sla_status = 'DONE', notes = COALESCE($2, notes), updated_at = NOW()
      WHERE id = $3
        AND draft_bl_attachment_id IS NOT NULL
        AND commercial_invoice_attachment_id IS NOT NULL
        AND packing_list_attachment_id IS NOT NULL
      RETURNING *
    `,
    [matched ? 'DRAFT_BL_CONFIRMED' : 'MISMATCH', optionalString(body.notes), reviewId],
  );
  if (result.rowCount === 0) {
    throw new ApiError(409, 'Chưa đủ Draft B/L, Commercial Invoice và Packing List để cross-check.');
  }
  return decorateDocumentReview(result.rows[0]);
}

export async function confirmFinalBl(reviewId: string, body: Record<string, unknown>, auth?: TokenPayload) {
  const finalBlAttachmentId = requiredString(body.finalBlAttachmentId, 'finalBlAttachmentId');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const current = await client.query<Row>('SELECT * FROM efms_document_reviews WHERE id = $1', [reviewId]);
    if (current.rowCount === 0) {
      throw new ApiError(404, 'Không tìm thấy hồ sơ kiểm chứng từ.');
    }
    if (stringValue(current.rows[0].status) !== 'DRAFT_BL_CONFIRMED') {
      throw new ApiError(409, 'Chỉ được xác nhận Final B/L sau khi Draft B/L đã khớp.');
    }
    await client.query('SELECT id FROM logistics_attachments WHERE id = $1', [finalBlAttachmentId]);
    const result = await client.query<Row>(
      `
        UPDATE efms_document_reviews
        SET status = 'FINAL_BL_CONFIRMED',
            final_bl_attachment_id = $1,
            sla_status = 'DONE',
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [finalBlAttachmentId, reviewId],
    );
    const review = result.rows[0];
    if (review.hbl_number) {
      await client.query(
        `
          UPDATE efms_house_bills
          SET final_bl_confirmed_at = NOW(), updated_at = NOW()
          WHERE delivery_order_id = $1 AND hbl_number = $2
        `,
        [review.delivery_order_id, review.hbl_number],
      );
    }
    await createFinanceNoteForDeliveryOrder(client, stringValue(review.delivery_order_id), 'DEBIT_NOTE_OF_AF', 'S', auth, {
      chargeType: 'SELLING',
      slaDueAt: addHours(new Date(), 1).toISOString(),
    });
    await client.query('COMMIT');
    return decorateDocumentReview(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

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

export async function listSlaAlerts() {
  await applyLclAutoApproval(pool);
  const [quotations, reviews, finalBlReviews, notes] = await Promise.all([
    pool.query<Row>('SELECT * FROM logistics_quotations'),
    pool.query<Row>('SELECT * FROM efms_document_reviews'),
    pool.query<Row>(
      `
        SELECT review.*, delivery_orders.order_number
        FROM efms_document_reviews review
        JOIN delivery_orders ON delivery_orders.id = review.delivery_order_id
        WHERE review.status = 'FINAL_BL_CONFIRMED'
      `,
    ),
    pool.query<Row>("SELECT * FROM finance_notes WHERE note_type = 'DEBIT_NOTE_OF_AF'"),
  ]);
  const noteDeliveryIds = new Set(notes.rows.map((row) => stringValue(row.delivery_order_id)));
  const now = Date.now();

  return [
    ...quotations.rows
      .map(decorateQuotation)
      .filter((quotation) => quotation.slaStatus === 'OVERDUE')
      .map((quotation) => ({
        entityId: stringValue(quotation.id),
        entityType: 'quotation',
        message: `Quotation ${stringValue(quotation.quoteNumber)} quá hạn ${quotation.slaStage}.`,
        ownerRole: 'Sale Staff',
        slaDueAt: quotation.slaDueAt,
        slaStage: quotation.slaStage,
      })),
    ...reviews.rows
      .map(decorateDocumentReview)
      .filter((review) => review.slaStatus === 'OVERDUE')
      .map((review) => ({
        entityId: stringValue(review.id),
        entityType: 'document_review',
        message: `Document review ${stringValue(review.id)} quá hạn O.02.`,
        ownerRole: 'Port Officer',
        slaDueAt: stringValue(review.crossCheckDueAt),
        slaStage: 'O.02_DOCUMENT_CHECK',
      })),
    ...finalBlReviews.rows
      .filter((review) => !noteDeliveryIds.has(stringValue(review.delivery_order_id)))
      .filter((review) => now > addHours(new Date(stringValue(review.updated_at)), 1).getTime())
      .map((review) => ({
        entityId: stringValue(review.id),
        entityType: 'finance_note',
        message: `DO ${stringValue(review.order_number)} chưa phát hành Debit Note OF/AF trong 1 giờ sau Final B/L.`,
        ownerRole: 'Finance Officer',
        slaDueAt: addHours(new Date(stringValue(review.updated_at)), 1).toISOString(),
        slaStage: 'A.01_DEBIT_NOTE_OF_AF',
      })),
  ];
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

export async function syncDriveDossier(orderNumber: string, auth?: TokenPayload) {
  const deliveryOrder = await findDeliveryOrder(orderNumber, pool);
  const attachments = await pool.query<Row>(
    `
      SELECT document_type
      FROM logistics_attachments
      WHERE entity_type = 'delivery_order'
        AND entity_id = $1
    `,
    [orderNumber],
  );
  const available = new Set(attachments.rows.map((row) => stringValue(row.document_type)));
  const missingDocuments = DRIVE_REQUIRED_DOCUMENTS.filter((documentType) => !available.has(documentType));
  const hasDriveConfig = Boolean(process.env.KBI_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID);
  const status = missingDocuments.length > 0 ? 'BLOCKED' : hasDriveConfig ? 'READY' : 'PENDING_CONFIG';
  const dossierNumber = await nextNumber(pool, 'drive_dossiers', 'dossier_number', `DOS-${new Date().getFullYear()}-`);
  const result = await pool.query<Row>(
    `
      INSERT INTO drive_dossiers (
        id, delivery_order_id, dossier_number, status, required_documents,
        missing_documents, external_folder_url, error_message, requested_by, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, NULL)
      RETURNING *
    `,
    [
      `dossier-${randomUUID()}`,
      deliveryOrder.id,
      dossierNumber,
      status,
      DRIVE_REQUIRED_DOCUMENTS,
      missingDocuments,
      status === 'PENDING_CONFIG' ? 'Thiếu KBI_DRIVE_FOLDER_ID/GOOGLE_DRIVE_FOLDER_ID để đồng bộ Google Drive.' : null,
      auth?.sub ?? null,
    ],
  );
  return toCamelObject(result.rows[0]);
}

export function assertTaskUpdateAllowed(task: Row, auth?: TokenPayload) {
  if (!auth) {
    throw new ApiError(403, 'Thiếu thông tin phân quyền task.');
  }
  if (['ADMIN', 'PIC_MANAGER'].includes(auth.role)) {
    return;
  }

  const expectedTaskRole = TASK_ROLE_BY_APP_ROLE[auth.role];
  if (!expectedTaskRole || stringValue(task.role) !== expectedTaskRole) {
    throw new ApiError(403, 'Bạn chỉ được cập nhật task thuộc đúng vai trò được assign.');
  }
  const nestedAssignee = task.assignee as { user_id?: unknown } | undefined;
  const assigneeId = optionalString(task.assignee_id) ?? optionalString(nestedAssignee?.user_id);
  if (assigneeId && assigneeId !== auth.sub) {
    throw new ApiError(403, 'Task này đã assign cho nhân sự khác.');
  }
}

async function applyLclAutoApproval(client: DatabaseClient) {
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

async function findDeliveryOrder(orderNumber: string, client: DatabaseClient) {
  const result = await client.query<Row>('SELECT id, order_number FROM delivery_orders WHERE order_number = $1', [orderNumber]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy DO.');
  }
  return { id: stringValue(result.rows[0].id), order_number: stringValue(result.rows[0].order_number) };
}

async function requireAttachmentForDocument(orderNumber: string, attachmentId: unknown, documentType: string) {
  const result = await pool.query<Row>(
    `
      SELECT id, document_type
      FROM logistics_attachments
      WHERE id = $1
        AND entity_type = 'delivery_order'
        AND entity_id = $2
    `,
    [requiredString(attachmentId, `${documentType} attachmentId`), orderNumber],
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, `Không tìm thấy file ${documentType} của DO.`);
  }
  return { id: stringValue(result.rows[0].id), documentType: stringValue(result.rows[0].document_type) };
}

async function createFinanceNoteForDeliveryOrder(
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

async function selectChargeRowsForFinanceNote(
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

async function insertAudit(
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

async function nextNumber(client: DatabaseClient, table: string, column: string, prefix: string) {
  const result = await client.query<Row>(`SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE $1`, [`${prefix}%`]);
  const max = result.rows.reduce((highest, row) => {
    const code = stringValue(row.code);
    const suffix = Number(code.slice(prefix.length));
    return Number.isFinite(suffix) ? Math.max(highest, suffix) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

async function ensureHouseBillTasks(client: DatabaseClient, deliveryOrder: { id: string; order_number: string }, hblNumber: string) {
  const existing = await client.query<Row>(
    'SELECT id FROM logistics_tasks WHERE do_number = $1 AND hbl_number = $2 LIMIT 1',
    [deliveryOrder.order_number, hblNumber],
  );
  if ((existing.rowCount ?? 0) > 0) {
    return;
  }

  const deliveryOrderRow = await client.query<Row>('SELECT request_code, po_number, purchase_contract_number FROM delivery_orders WHERE id = $1', [
    deliveryOrder.id,
  ]);
  const row = deliveryOrderRow.rows[0] ?? {};
  const templates = [
    { name: `Cross-check documents for HBL ${hblNumber}`, role: 'Port Officer', dueOffset: 1 },
    { name: `Customs declaration for HBL ${hblNumber}`, role: 'Customs Officer', dueOffset: 2 },
    { name: `Make Advance Settlement for HBL ${hblNumber}`, role: 'Port Officer', dueOffset: 2 },
  ];
  const start = await nextTaskNumberForInsert(client);

  for (const [index, template] of templates.entries()) {
    const assigneeId = await findUserIdByTaskRole(client, template.role);
    await client.query(
      `
        INSERT INTO logistics_tasks (
          id, task_id, task_name, role, assignee_id, hbl_number, do_number, request_code,
          po_number, production_contract_number, priority, status, progress, due_date,
          completed_at, blocked_reason, notes, is_required_for_do_closure
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'MEDIUM', 'TODO', 0, $11, NULL, NULL, $12, TRUE)
      `,
      [
        `task-${randomUUID()}`,
        `TASK-${new Date().getFullYear()}-${String(start + index).padStart(6, '0')}`,
        template.name,
        template.role,
        assigneeId,
        hblNumber,
        deliveryOrder.order_number,
        stringValue(row.request_code),
        optionalString(row.po_number),
        stringValue(row.purchase_contract_number),
        addHours(new Date(), template.dueOffset * 24).toISOString().slice(0, 10),
        `Auto-created for HBL ${hblNumber}.`,
      ],
    );
  }
}

async function nextTaskNumberForInsert(client: DatabaseClient) {
  const result = await client.query<Row>('SELECT task_id AS code FROM logistics_tasks WHERE task_id LIKE $1', [
    `TASK-${new Date().getFullYear()}-%`,
  ]);
  const max = result.rows.reduce((highest, row) => {
    const parts = stringValue(row.code).split('-');
    const suffix = Number(parts[parts.length - 1]);
    return Number.isFinite(suffix) ? Math.max(highest, suffix) : highest;
  }, 0);
  return max + 1;
}

async function findUserIdByTaskRole(client: DatabaseClient, role: string) {
  const appRole = Object.entries(TASK_ROLE_BY_APP_ROLE).find(([, taskRole]) => taskRole === role)?.[0];
  if (!appRole) return null;
  const result = await client.query<Row>('SELECT id FROM app_users WHERE role = $1 ORDER BY full_name ASC LIMIT 1', [appRole]);
  return optionalString(result.rows[0]?.id);
}

function decorateQuotation(row: Row): Row & {
  isOverdue: boolean;
  slaDueAt: string | null;
  slaStage: string | null;
  slaStatus: SlaStatus;
} {
  const status = stringValue(row.status);
  const preliminaryDueAt = stringValue(row.preliminary_due_at);
  const officialDueAt = stringValue(row.official_due_at);
  const slaStage =
    ['DRAFT', 'PRELIMINARY_SENT', 'REVISION_REQUESTED'].includes(status)
      ? 'S.03_PRELIMINARY'
      : status === 'OFFICIAL_SENT'
        ? 'S.04_OFFICIAL'
        : null;
  const slaDueAt = slaStage === 'S.03_PRELIMINARY' ? preliminaryDueAt : slaStage === 'S.04_OFFICIAL' ? officialDueAt : null;
  const slaStatus = slaDueAt ? getSlaStatus(slaDueAt, Boolean(row.customer_response_at || status === 'APPROVED')) : 'DONE';
  return {
    ...toCamelObject(row),
    isOverdue: slaStatus === 'OVERDUE',
    slaDueAt,
    slaStage,
    slaStatus,
  };
}

function decorateDocumentReview(row: Row): Row & {
  isOverdue: boolean;
  slaStatus: SlaStatus;
} {
  const done = Boolean(row.cross_checked_at) || ['DRAFT_BL_CONFIRMED', 'FINAL_BL_CONFIRMED', 'MISMATCH'].includes(stringValue(row.status));
  const slaStatus = done ? 'DONE' : getSlaStatus(stringValue(row.cross_check_due_at), false);
  return {
    ...toCamelObject(row),
    isOverdue: slaStatus === 'OVERDUE',
    slaStatus,
  };
}

function decorateFinanceNote(row: Row): Row & {
  slaStatus: SlaStatus;
} {
  const done = Boolean(row.issued_at);
  const slaStatus = row.sla_due_at ? getSlaStatus(stringValue(row.sla_due_at), done) : 'DONE';
  return {
    ...toCamelObject(row),
    slaStatus,
  };
}

function decorateCustoms(row: Row, transport?: Row | null) {
  const laneStatus = optionalString(row.lane_status) ?? inferLaneStatus(optionalString(row.channel), stringValue(row.status));
  const decoratedRow = { ...row, lane_status: laneStatus };
  return {
    ...toCamelObject(decoratedRow),
    canDispatch: canDispatch(row, transport),
    nextAction: customsNextAction(laneStatus, stringValue(row.status)),
  };
}

function getSlaStatus(dueAt: string, done: boolean): SlaStatus {
  if (done) return 'DONE';
  return new Date(dueAt).getTime() < Date.now() ? 'OVERDUE' : 'ON_TRACK';
}

function canDispatch(row: Row, transport?: Row | null) {
  const releaseByMblType = ['SEAWAY_BILL', 'SURRENDERED'].includes(stringValue(transport?.mbl_type));
  return stringValue(row.status) === 'CLEARED' && (row.telex_released === true || releaseByMblType);
}

function normalizeShippingMode(value: unknown): ShippingMode {
  const normalized = requiredString(value, 'shippingMode').toUpperCase() as ShippingMode;
  if (!SHIPPING_MODES.has(normalized)) {
    throw new ApiError(400, 'shippingMode phải là AIR, FCL hoặc LCL.');
  }
  return normalized;
}

function normalizeMblType(value: unknown): MblType {
  const normalized = requiredString(value, 'mblType').toUpperCase().replace(/\s+/g, '_') as MblType;
  if (!MBL_TYPES.has(normalized)) {
    throw new ApiError(400, 'mblType phải là COPY, ORIGINAL, SEAWAY_BILL hoặc SURRENDERED.');
  }
  return normalized;
}

function normalizeQuotationAction(value: unknown): QuotationAction {
  const normalized = requiredString(value, 'action').toUpperCase() as QuotationAction;
  if (!QUOTATION_ACTIONS.has(normalized)) {
    throw new ApiError(400, 'action báo giá không hợp lệ.');
  }
  return normalized;
}

function normalizeChargeType(value: unknown): ChargeType {
  const normalized = requiredString(value, 'chargeType').toUpperCase() as ChargeType;
  if (!CHARGE_TYPES.has(normalized)) {
    throw new ApiError(400, 'chargeType phải là SELLING, BUYING hoặc OBH.');
  }
  return normalized;
}

function normalizeCustomsChannel(value: unknown): CustomsChannel {
  const normalized = requiredString(value, 'channel').toUpperCase() as CustomsChannel;
  if (!CUSTOMS_CHANNELS.has(normalized)) {
    throw new ApiError(400, 'channel hải quan phải là GREEN, YELLOW hoặc RED.');
  }
  return normalized;
}

function normalizeCustomsStatus(value: unknown): CustomsStatus {
  const normalized = requiredString(value, 'status').toUpperCase() as CustomsStatus;
  if (!CUSTOMS_STATUSES.has(normalized)) {
    throw new ApiError(400, 'status hải quan không hợp lệ.');
  }
  return normalized;
}

function normalizeCustomsLaneStatus(value: unknown): CustomsLaneStatus {
  const normalized = requiredString(value, 'laneStatus').toUpperCase() as CustomsLaneStatus;
  if (!CUSTOMS_LANE_STATUSES.has(normalized)) {
    throw new ApiError(400, 'laneStatus hải quan không hợp lệ.');
  }
  return normalized;
}

function inferLaneStatus(channel: unknown, status: unknown): CustomsLaneStatus | null {
  const normalizedChannel = optionalString(channel) as CustomsChannel | null;
  const normalizedStatus = optionalString(status) as CustomsStatus | null;
  if (normalizedStatus === 'CLEARED') return 'RELEASE_READY';
  if (normalizedChannel === 'GREEN') return 'GREEN_CLEARANCE';
  if (normalizedChannel === 'YELLOW') return 'YELLOW_NEED_SUPPLEMENT';
  if (normalizedChannel === 'RED' && normalizedStatus === 'VIOLATION_HANDLING') return 'RED_VIOLATION_HANDLING';
  if (normalizedChannel === 'RED') return 'RED_FIELD_INSPECTION';
  return null;
}

function customsNextAction(laneStatus: string | null, status: string) {
  if (status === 'CLEARED') return 'O.14_RECEIVE_DO_AND_DELIVER';
  if (laneStatus === 'GREEN_CLEARANCE') return 'O.10_NOTIFY_CUSTOMS_CLEARANCE';
  if (laneStatus === 'YELLOW_NEED_SUPPLEMENT') return 'O.11_SUPPLEMENT_DOCUMENTS';
  if (laneStatus === 'RED_FIELD_INSPECTION') return 'O.12_FIELD_INSPECTION';
  if (laneStatus === 'RED_VIOLATION_HANDLING') return 'O.13_HANDLE_INCIDENT';
  return 'O.08_PERFORM_CUSTOMS_DECLARATION';
}

function normalizeAdvanceSettlementStatus(value: unknown): AdvanceSettlementStatus {
  const normalized = requiredString(value, 'status').toUpperCase() as AdvanceSettlementStatus;
  if (!ADVANCE_SETTLEMENT_STATUSES.has(normalized)) {
    throw new ApiError(400, 'status tạm ứng không hợp lệ.');
  }
  return normalized;
}

function normalizeTaskOwnerRole(value: unknown) {
  const role = requiredString(value, 'assignedRole');
  if (!Object.values(TASK_ROLE_BY_APP_ROLE).includes(role)) {
    throw new ApiError(400, 'assignedRole không hợp lệ.');
  }
  return role;
}

function normalizeCurrencyCode(value: unknown, fieldName: string) {
  const code = requiredString(value, fieldName).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new ApiError(400, `${fieldName} phải là mã tiền tệ 3 ký tự.`);
  }
  return code;
}

function requiredString(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);
  if (!cleaned) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }
  return cleaned;
}

function optionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function requiredPositiveNumber(value: unknown, fieldName: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn 0.`);
  }
  return numeric;
}

function optionalDateTime(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);
  if (!cleaned) {
    return null;
  }
  const timestamp = new Date(cleaned).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new ApiError(400, `${fieldName} không hợp lệ.`);
  }
  return new Date(timestamp).toISOString();
}

function optionalNonNegativeNumber(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn hoặc bằng 0.`);
  }
  return numeric;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function toCamelObject(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [snakeToCamel(key), value])) as Row;
}

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());
}
