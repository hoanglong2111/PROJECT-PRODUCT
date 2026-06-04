import { pool } from '../config/database';

export async function findShipmentByOrderNumber(orderNumber: string) {
  const result = await pool.query<{ id: string; tenant_id: string | null }>(
    'SELECT id, tenant_id FROM delivery_orders WHERE order_number = $1',
    [orderNumber],
  );

  return result.rows[0] ?? null;
}
