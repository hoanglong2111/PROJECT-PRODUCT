import { pool } from '../config/database';
import { generateEntityId } from '../domain/gd1Identity';
import { StateMachine } from '../domain/stateMachine';
import { ApiError } from '../utils/errors';
import { PO_STATUS } from '../domain/gd1Constants';
import { enqueueOutboxEvent } from '../models/reliability';

// State Machine core for PO
export const poStateMachine = new StateMachine({
  initialState: PO_STATUS.DRAFT,
  transitions: [
    { from: PO_STATUS.DRAFT, to: PO_STATUS.ISSUED },
    { from: PO_STATUS.ISSUED, to: PO_STATUS.CONFIRMED },
    { from: PO_STATUS.CONFIRMED, to: PO_STATUS.IN_PRODUCTION },
    { from: PO_STATUS.IN_PRODUCTION, to: PO_STATUS.SHIPPED },
    { from: PO_STATUS.SHIPPED, to: PO_STATUS.DELIVERED },
    { from: PO_STATUS.DELIVERED, to: PO_STATUS.CLOSED },
    { from: [PO_STATUS.DRAFT, PO_STATUS.ISSUED], to: PO_STATUS.CANCELLED },
  ]
});

export class Gd1PurchaseOrderService {
  async listPOs() {
    const res = await pool.query(`
      SELECT po.*, 
             COALESCE(json_agg(pol.*) FILTER (WHERE pol.id IS NOT NULL), '[]') as line_items
      FROM purchase_orders po
      LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      GROUP BY po.id
      ORDER BY po.created_at DESC
    `);
    return res.rows;
  }

  async createPO(data: any, userId: string) {
    const poId = generateEntityId('PO');
    const poNo = data.poNumber || poId;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const supplierCode = data.supplierCode || 'SUPP-TEMP';
      const supplierName = data.supplierName || 'Temporary Supplier';
      const status = PO_STATUS.DRAFT;
      const currency = data.currency || 'USD';
      const totalAmount = data.totalAmount || 0;
      const warehouseCode = data.warehouseCode || 'WH001';

      await client.query(
        `INSERT INTO purchase_orders (
          id, po_number, supplier_code, supplier_name, status, order_date, currency, total_amount, sap_sync_status, warehouse_code, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10)`,
        [
          poId,
          poNo,
          supplierCode,
          supplierName,
          status,
          currency,
          totalAmount,
          'PENDING',
          warehouseCode,
          data.tenantId || 'tenant-001'
        ]
      );

      // Insert PO lines if provided
      if (Array.isArray(data.sourceLines) && data.sourceLines.length > 0) {
        for (let i = 0; i < data.sourceLines.length; i++) {
          const line = data.sourceLines[i];
          const lineId = generateEntityId('POL');
          await client.query(
            `INSERT INTO purchase_order_lines (
              id, purchase_order_id, item_code, item_name, quantity, unit, warehouse_deadline_date, warehouse_code, tenant_id, lot_number, item_id
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW() + interval '7 days', $7, $8, $9, $10)`,
            [
              lineId,
              poId,
              line.itemCode || 'GENERIC',
              line.itemName || 'Item Description',
              line.quantity || 1,
              line.unit || 'PCS',
              warehouseCode,
              data.tenantId || 'tenant-001',
              line.lotNumber || null,
              line.itemId || null,
            ]
          );
        }
      }

      await client.query('COMMIT');
      return this.getPO(poId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPO(poId: string): Promise<any> {
    const poResult = await pool.query('SELECT * FROM purchase_orders WHERE id = $1 OR po_number = $1', [poId]);
    if (poResult.rows.length === 0) {
      throw new ApiError(404, 'Không tìm thấy Purchase Order.');
    }

    const linesResult = await pool.query('SELECT * FROM purchase_order_lines WHERE purchase_order_id = $1 ORDER BY id ASC', [poResult.rows[0].id]);
    return {
      ...poResult.rows[0],
      line_items: linesResult.rows,
    };
  }

  async updatePO(poId: string, data: any) {
    const current = await this.getPO(poId);
    if (current.status !== PO_STATUS.DRAFT) {
      throw new ApiError(400, 'Chỉ có thể cập nhật PO ở trạng thái DRAFT.');
    }

    const supplierName = data.supplierName !== undefined ? data.supplierName : current.supplier_name;
    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : current.total_amount;

    await pool.query(
      `UPDATE purchase_orders
       SET supplier_name = $1, total_amount = $2, updated_at = NOW()
       WHERE id = $3`,
      [supplierName, totalAmount, current.id]
    );

    return this.getPO(current.id);
  }

  async transitionPO(poId: string, toStatus: string, userId: string) {
    const po = await this.getPO(poId);
    const fromStatus = po.status;

    await poStateMachine.transition(fromStatus, toStatus as any, { poId, userId });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update status
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [toStatus, po.id]
      );

      // Record transition history
      await client.query(
        `INSERT INTO entity_status_history (id, entity_type, entity_id, from_status, to_status, actor_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [generateEntityId('ESH'), 'PURCHASE_ORDER', po.id, fromStatus, toStatus, userId]
      );

      // Enqueue outbox event for stage automation
      await enqueueOutboxEvent(client, {
        tenantId: po.tenant_id || 'tenant-001',
        aggregateType: 'purchase_order',
        aggregateId: po.id,
        eventType: 'purchase_order.status_changed',
        payload: { poId: po.id, fromStatus, toStatus, userId },
      });

      await client.query('COMMIT');
      return { ...po, status: toStatus };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const gd1PurchaseOrderService = new Gd1PurchaseOrderService();
