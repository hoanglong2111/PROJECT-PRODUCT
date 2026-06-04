import { randomUUID } from 'node:crypto';

import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { TokenPayload } from '../domain/types';
import { decorateDocumentReview } from './sopDecorators';
import { ensureHouseBillTasks, findDeliveryOrder, requireAttachmentForDocument } from './sopCore';
import { insertAudit } from './sopDb';
import { createFinanceNoteForDeliveryOrder } from './sopFinance';
import type { Row } from './sopTypes';
import {
  addHours,
  normalizeMblType,
  optionalDateTime,
  optionalString,
  requiredPositiveNumber,
  requiredString,
  stringValue,
  toCamelObject,
} from './sopUtils';

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
