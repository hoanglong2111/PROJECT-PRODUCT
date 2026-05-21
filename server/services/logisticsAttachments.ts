import { randomUUID } from 'node:crypto';

import type { DeliveryOrder, LogisticsTask, PurchaseOrder } from '../../src/models/logistics';
import { REQUIRED_DOCUMENTS } from '../constants';
import { pool } from '../db';
import { ApiError } from '../errors';
import type { LogisticsAttachment, TokenPayload } from '../types';
import {
  appendUnique,
  isDispatchGatePassed,
  optionalString,
  requiredString,
  syncPurchaseOrderStatuses,
  withOperationalClosureState,
} from './logisticsHelpers';
import { readSnapshot, writeSnapshot } from './logisticsSnapshots';
import { classifyPurchaseOrders, normalizeDeliveryOrder, normalizePurchaseOrder } from './logisticsTransforms';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function listDeliveryOrderAttachments(orderNumber: string) {
  const result = await pool.query<{
    document_type: string;
    entity_id: string;
    entity_type: string;
    file_name: string;
    hbl_number: string | null;
    id: string;
    mime_type: string | null;
    size_bytes: string | null;
    storage_url: string;
    uploaded_at: string;
    uploaded_by: string | null;
  }>(
    `
      SELECT id, entity_type, entity_id, document_type, file_name, storage_url,
             uploaded_by, uploaded_at, mime_type, size_bytes, hbl_number
      FROM logistics_attachments
      WHERE entity_type = 'delivery_order'
        AND entity_id = $1
      ORDER BY uploaded_at DESC
    `,
    [orderNumber],
  );

  return result.rows.map((row) => ({
    documentType: row.document_type,
    entityId: row.entity_id,
    entityType: row.entity_type,
    fileName: row.file_name,
    hblNumber: row.hbl_number,
    id: row.id,
    mimeType: row.mime_type ?? 'application/octet-stream',
    size: Number(row.size_bytes ?? 0),
    storageUrl: row.storage_url,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
  })) satisfies LogisticsAttachment[];
}

export async function attachDeliveryOrderDocument({
  auth,
  documentType,
  file,
  hblNumber,
  orderNumber,
}: {
  auth?: TokenPayload;
  documentType: string;
  file: { buffer: Buffer; fileName: string; mimeType: string };
  hblNumber?: string | null;
  orderNumber: string;
}) {
  const normalizedDocumentType = requiredString(documentType, 'documentType');

  if (!file.buffer.length) {
    throw new ApiError(400, 'File chứng từ không được rỗng.');
  }

  if (file.buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new ApiError(413, 'File chứng từ vượt quá 5MB.');
  }

  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimeType)) {
    throw new ApiError(400, 'Chỉ hỗ trợ PDF hoặc hình ảnh PNG/JPG/WebP/GIF.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [deliveryOrdersRaw, tasks, purchaseOrdersRaw] = await Promise.all([
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<LogisticsTask[]>('tasks', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
    ]);
    const deliveryOrders = deliveryOrdersRaw.map(normalizeDeliveryOrder);
    const purchaseOrders = purchaseOrdersRaw.map(normalizePurchaseOrder);
    const current = deliveryOrders.find((order) => order.order_info.order_number === orderNumber);

    if (!current) {
      throw new ApiError(404, 'Không tìm thấy DO để đính kèm chứng từ.');
    }

    if (current.order_info.status === 'DELIVERED') {
      throw new ApiError(409, 'DO đã hoàn tất và bị khóa chứng từ.');
    }
    const customsGatePassed = await isDispatchGatePassed(current.id, client);

    const storageUrl = `data:${file.mimeType};base64,${file.buffer.toString('base64')}`;
    const attachmentId = `att-${randomUUID()}`;
    const normalizedHblNumber = optionalString(hblNumber);

    await client.query(
      `
        INSERT INTO logistics_attachments (
          id, entity_type, entity_id, document_type, hbl_number, file_name, storage_url,
          uploaded_by, mime_type, size_bytes
        )
        VALUES ($1, 'delivery_order', $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        attachmentId,
        orderNumber,
        normalizedDocumentType,
        normalizedHblNumber,
        file.fileName,
        storageUrl,
        auth?.sub ?? null,
        file.mimeType,
        file.buffer.length,
      ],
    );

    const documentsList = appendUnique(current.logistics_shipping.documents_list, normalizedDocumentType);
    const missingDocuments = REQUIRED_DOCUMENTS.filter((documentName) => !documentsList.includes(documentName));
    const updatedBase: DeliveryOrder = {
      ...current,
      order_info: {
        ...current.order_info,
        xnk_notes:
          missingDocuments.length > 0
            ? `Missing ${missingDocuments.join(', ')} for customs readiness.`
            : 'Document set is ready for customs.',
      },
      logistics_shipping: {
        ...current.logistics_shipping,
        documents_list: documentsList,
        missing_documents: missingDocuments,
      },
    };
    const orderTasks = tasks.filter((task) => task.do_number === orderNumber);
    const updatedOrder = withOperationalClosureState(updatedBase, orderTasks, customsGatePassed);
    const updatedDeliveryOrders = deliveryOrders.map((order) =>
      order.order_info.order_number === orderNumber ? updatedOrder : order,
    );
    const updatedPurchaseOrders = classifyPurchaseOrders(
      syncPurchaseOrderStatuses(purchaseOrders, updatedDeliveryOrders),
      updatedDeliveryOrders,
    );

    await Promise.all([
      writeSnapshot('delivery_orders', updatedDeliveryOrders, client),
      writeSnapshot('purchase_orders', updatedPurchaseOrders, client),
    ]);
    await client.query('COMMIT');

    const [attachment] = await listDeliveryOrderAttachments(orderNumber);

    return {
      attachment,
      deliveryOrder: updatedOrder,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
