import { pool } from '../config/database';
import { generateEntityId } from '../domain/gd1Identity';
import { ApiError } from '../utils/errors';
import {
  createMilestonesForShipment,
  getMilestonesForShipment,
  updateMilestoneActualDate,
} from '../models/milestones';
import { Gd1MilestoneCode } from '../domain/logistics';
import { insertAuditLog } from '../models/reliability';

export class Gd1ShipmentService {
  async listShipments() {
    const res = await pool.query('SELECT * FROM shipments ORDER BY created_at DESC');
    return res.rows;
  }

  async createShipment(data: any, userId?: string) {
    const shipmentId = generateEntityId('SHP');
    const orderNumber = data.orderNumber || shipmentId;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const status = 'BOOKING_PENDING';
      const tenantId = data.tenantId || 'tenant-001';

      await client.query(
        `INSERT INTO shipments (
          id, order_number, status, item_name, quantity, unit,
          purchase_contract_number, warehouse_code, warehouse_deadline, tenant_id,
          mode, carrier, vessel_flight, bl_awb_no
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + interval '14 days', $9, $10, $11, $12, $13)`,
        [
          shipmentId,
          orderNumber,
          status,
          data.itemName || 'Shipment Cargo',
          data.quantity || 1,
          data.unit || 'PCS',
          data.purchaseContractNumber || 'PC-TEMP',
          data.warehouseCode || 'WH001',
          tenantId,
          data.mode || 'SEA',
          data.carrier || null,
          data.vesselFlight || null,
          data.blAwbNo || null,
        ]
      );

      // Create standard milestones
      await createMilestonesForShipment(shipmentId, tenantId, client);

      // Record audit log
      await insertAuditLog(client, {
        tenantId,
        actorId: userId || 'SYSTEM',
        action: 'shipment.created',
        entityType: 'shipment',
        entityId: shipmentId,
        after: { shipmentId, orderNumber, status },
      });

      await client.query('COMMIT');
      return this.getShipment(shipmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getShipment(shipmentId: string): Promise<any> {
    const shipmentRes = await pool.query('SELECT * FROM shipments WHERE id = $1 OR order_number = $1', [shipmentId]);
    if (shipmentRes.rows.length === 0) {
      throw new ApiError(404, 'Không tìm thấy Shipment.');
    }

    const shipment = shipmentRes.rows[0] as any;
    const milestones = await getMilestonesForShipment(shipment.id);

    return {
      ...shipment,
      milestones,
    };
  }

  async updateShipment(shipmentId: string, data: any, userId?: string) {
    const shipment = await this.getShipment(shipmentId);

    const carrier = data.carrier !== undefined ? data.carrier : shipment.carrier;
    const vesselFlight = data.vesselFlight !== undefined ? data.vesselFlight : shipment.vessel_flight;
    const blAwbNo = data.blAwbNo !== undefined ? data.blAwbNo : shipment.bl_awb_no;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE shipments
         SET carrier = $1, vessel_flight = $2, bl_awb_no = $3, updated_at = NOW()
         WHERE id = $4`,
        [carrier, vesselFlight, blAwbNo, shipment.id]
      );

      await insertAuditLog(client, {
        tenantId: shipment.tenant_id,
        actorId: userId || 'SYSTEM',
        action: 'shipment.updated',
        entityType: 'shipment',
        entityId: shipment.id,
        before: shipment,
        after: { carrier, vesselFlight, blAwbNo },
      });

      await client.query('COMMIT');
      return this.getShipment(shipment.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMilestone(shipmentId: string, milestoneCode: string, actualDate: string, note?: string, userId?: string) {
    const shipment = await this.getShipment(shipmentId);
    await updateMilestoneActualDate(
      shipment.id,
      milestoneCode as Gd1MilestoneCode,
      actualDate,
      userId || 'SYSTEM',
      'MANUAL',
      note || null
    );
    return this.getShipment(shipment.id);
  }
}

export const gd1ShipmentService = new Gd1ShipmentService();
