import { pool } from '../config/database';
import type { DatabaseClient } from '../domain/types';

export async function findPurchaseOrderForUpdate(client: DatabaseClient, poNumber: string) {
  const result = await client.query<{ id: string; status: string | null }>(
    'SELECT id, status FROM purchase_orders WHERE po_number = $1 FOR UPDATE',
    [poNumber],
  );

  return result.rows[0] ?? null;
}

export async function findPurchaseOrderId(poNumber: string, client: DatabaseClient = pool) {
  const result = await client.query<{ id: string }>('SELECT id FROM purchase_orders WHERE po_number = $1', [poNumber]);
  return result.rows[0]?.id ?? null;
}

export async function findBlockedStageTask(client: DatabaseClient, purchaseOrderId: string, stage: string) {
  const result = await client.query<{ id: string; task_name: string }>(
    `
      SELECT id, task_name
      FROM po_stage_tasks
      WHERE purchase_order_id = $1
        AND po_stage = $2
        AND status = 'BLOCKED'
      LIMIT 1
    `,
    [purchaseOrderId, stage],
  );

  return result.rows[0] ?? null;
}

export async function updatePurchaseOrderStage(client: DatabaseClient, purchaseOrderId: string, stage: string) {
  await client.query('UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2', [stage, purchaseOrderId]);
}
