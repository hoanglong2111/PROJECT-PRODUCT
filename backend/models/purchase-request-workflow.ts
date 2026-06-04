import { pool } from '../config/database';

export async function findPurchaseRequestId(requestedOrderId: string) {
  const result = await pool.query<{ id: string }>('SELECT id FROM purchase_requests WHERE requested_order_id = $1', [
    requestedOrderId,
  ]);

  return result.rows[0]?.id ?? null;
}
