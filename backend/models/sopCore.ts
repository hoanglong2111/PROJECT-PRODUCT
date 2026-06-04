import { randomUUID } from 'node:crypto';

import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { DatabaseClient, TokenPayload } from '../domain/types';
import { TASK_ROLE_BY_APP_ROLE, type Row } from './sopTypes';
import { addHours, optionalString, requiredString, stringValue } from './sopUtils';

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

export async function findDeliveryOrder(orderNumber: string, client: DatabaseClient) {
  const result = await client.query<Row>('SELECT id, order_number FROM delivery_orders WHERE order_number = $1', [orderNumber]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Không tìm thấy DO.');
  }
  return { id: stringValue(result.rows[0].id), order_number: stringValue(result.rows[0].order_number) };
}

export async function requireAttachmentForDocument(orderNumber: string, attachmentId: unknown, documentType: string) {
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
export async function ensureHouseBillTasks(client: DatabaseClient, deliveryOrder: { id: string; order_number: string }, hblNumber: string) {
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
