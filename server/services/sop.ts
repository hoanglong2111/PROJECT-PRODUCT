import { randomUUID } from 'node:crypto';

import { pool } from '../db';
import type { TokenPayload } from '../types';
import { decorateCustoms, decorateDocumentReview, decorateFinanceNote, decorateQuotation } from './sopDecorators';
import { DRIVE_REQUIRED_DOCUMENTS, type Row } from './sopTypes';
import { nextNumber } from './sopDb';
import { applyLclAutoApproval } from './sopQuotations';
import { findDeliveryOrder } from './sopCore';
import {
  addHours,
  optionalString,
  stringValue,
  toCamelObject,
} from './sopUtils';
export { applyLclAutoApproval, confirmQuotationBooking, createQuotation, listQuotations, updateQuotationAction } from './sopQuotations';
export { assertTaskUpdateAllowed } from './sopCore';




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

export { confirmDocumentCrossCheck, confirmFinalBl, createContainer, createDocumentReview, createHouseBill, updateShippingInstruction } from './sopEfmsDocuments';


export { createCharge, updateCharge, deleteCharge, issueFinanceNote, listCharges, sendFinanceNoteToAccounting, createAdvanceSettlement, updateAdvanceSettlementStatus } from './sopFinance';


export { getCustoms, updateCustoms } from './sopCustoms';


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

