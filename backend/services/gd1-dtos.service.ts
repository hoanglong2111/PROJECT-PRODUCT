import { pool } from '../config/database';
import { generateEntityId } from '../domain/gd1Identity';
import { ApiError } from '../utils/errors';

export class Gd1DtoService {
  async listDTOs() {
    const res = await pool.query('SELECT * FROM domestic_transport_orders ORDER BY created_at DESC');
    return res.rows;
  }

  async createDTO(data: any, userId?: string) {
    const dtoId = generateEntityId('DTO');
    const dtoNo = data.dtoNo || dtoId;
    const tenantId = data.tenantId || 'tenant-001';

    await pool.query(
      `INSERT INTO domestic_transport_orders (
        id, tenant_id, dto_no, shipment_id, pickup_location, delivery_location, vehicle_type, status, planned_pickup_time, planned_delivery_time, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        dtoId,
        tenantId,
        dtoNo,
        data.shipmentId || null,
        data.pickupLocation || null,
        data.deliveryLocation || null,
        data.vehicleType || null,
        'DRAFT',
        data.plannedPickupTime ? new Date(data.plannedPickupTime) : null,
        data.plannedDeliveryTime ? new Date(data.plannedDeliveryTime) : null,
        userId || 'SYSTEM',
      ]
    );

    return this.getDTO(dtoId);
  }

  async getDTO(dtoId: string): Promise<any> {
    const dtoRes = await pool.query('SELECT * FROM domestic_transport_orders WHERE id = $1 OR dto_no = $1', [dtoId]);
    if (dtoRes.rows.length === 0) {
      throw new ApiError(404, 'Không tìm thấy Domestic Transport Order.');
    }

    const dto = dtoRes.rows[0];
    const quotesRes = await pool.query('SELECT * FROM dto_quotes WHERE dto_id = $1 ORDER BY amount ASC', [dto.id]);

    return {
      ...dto,
      quotes: quotesRes.rows,
    };
  }

  async submitQuote(dtoId: string, transporterId: string, amount: number, note?: string) {
    const dto = await this.getDTO(dtoId);
    const quoteId = generateEntityId('DTQ');

    await pool.query(
      `INSERT INTO dto_quotes (id, tenant_id, dto_id, transporter_id, amount, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [quoteId, dto.tenant_id, dto.id, transporterId, amount, note || null]
    );

    return this.getDTO(dto.id);
  }

  async selectQuote(dtoId: string, quoteId: string) {
    const dto = await this.getDTO(dtoId);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Unselect all quotes for this DTO
      await client.query('UPDATE dto_quotes SET is_selected = false WHERE dto_id = $1', [dto.id]);

      // Select the chosen quote
      const selectRes = await client.query(
        'UPDATE dto_quotes SET is_selected = true WHERE id = $1 AND dto_id = $2 RETURNING *',
        [quoteId, dto.id]
      );
      if (selectRes.rows.length === 0) {
        throw new ApiError(404, 'Không tìm thấy Quote.');
      }

      const quote = selectRes.rows[0];

      // Update DTO with quote details
      await client.query(
        `UPDATE domestic_transport_orders
         SET status = 'CONFIRMED', transporter_id = $1, cost_estimate = $2, currency_code = $3, updated_at = NOW()
         WHERE id = $4`,
        [quote.transporter_id, quote.amount, quote.currency_code, dto.id]
      );

      await client.query('COMMIT');
      return this.getDTO(dto.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const gd1DtoService = new Gd1DtoService();
