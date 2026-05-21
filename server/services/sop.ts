import { randomUUID } from 'node:crypto';

import { pool } from '../db';
import { ApiError } from '../errors';
import type { DatabaseClient, TokenPayload } from '../types';
import { decorateCustoms, decorateDocumentReview, decorateFinanceNote, decorateQuotation } from './sopDecorators';
import { DRIVE_REQUIRED_DOCUMENTS, TASK_ROLE_BY_APP_ROLE, type ChargeType, type Row } from './sopTypes';
import { insertAudit, nextNumber } from './sopDb';
import { applyLclAutoApproval } from './sopQuotations';
import {
  addHours,
  normalizeAdvanceSettlementStatus,
  normalizeChargeType,
  normalizeCurrencyCode,
  normalizeCustomsChannel,
  normalizeCustomsLaneStatus,
  normalizeCustomsStatus,
  normalizeMblType,
  normalizeTaskOwnerRole,
  optionalDateTime,
  optionalString,
  requiredPositiveNumber,
  requiredString,
  stringValue,
  toCamelObject,
  inferLaneStatus,
} from './sopUtils';
export { applyLclAutoApproval, confirmQuotationBooking, createQuotation, listQuotations, updateQuotationAction } from './sopQuotations';




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

