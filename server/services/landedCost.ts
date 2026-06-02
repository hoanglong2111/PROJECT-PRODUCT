import { pool } from '../db';
import type { DatabaseClient } from '../types';
import type { Gd1ShipmentCost, Gd1CostType, Gd1AllocMethod } from '../../src/models/logistics';

async function withTransaction<T>(
  dbClient: DatabaseClient | undefined,
  work: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  if (dbClient) return work(dbClient);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addShipmentCost(
  cost: Omit<Gd1ShipmentCost, 'id'> & { id?: string },
  dbClient?: DatabaseClient
): Promise<string> {
  const id = cost.id || `cost-${cost.shipment_id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  await withTransaction(dbClient, async (client) => {
    await client.query(
      `
      INSERT INTO shipment_costs (id, tenant_id, shipment_id, cost_type, amount, currency_code, exchange_rate, alloc_method, invoice_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [id, cost.tenant_id, cost.shipment_id, cost.cost_type, cost.amount, cost.currency_code, cost.exchange_rate, cost.alloc_method, cost.invoice_ref]
    );

    await triggerRecalculationForShipment(cost.shipment_id, client);
  });
  return id;
}

export async function deleteShipmentCost(id: string, dbClient?: DatabaseClient): Promise<void> {
  await withTransaction(dbClient, async (client) => {
    const costRes = await client.query('SELECT shipment_id FROM shipment_costs WHERE id = $1', [id]);
    if (costRes.rows.length === 0) return;

    const shipmentId = costRes.rows[0].shipment_id as string;
    await client.query('DELETE FROM shipment_costs WHERE id = $1', [id]);

    await triggerRecalculationForShipment(shipmentId, client);
  });
}

export async function getShipmentCosts(shipmentId: string, dbClient?: DatabaseClient): Promise<Gd1ShipmentCost[]> {
  const client = dbClient || pool;
  const res = await client.query('SELECT * FROM shipment_costs WHERE shipment_id = $1 ORDER BY created_at ASC', [shipmentId]);
  return res.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    shipment_id: row.shipment_id,
    cost_type: row.cost_type as Gd1CostType,
    amount: Number(row.amount),
    currency_code: row.currency_code,
    exchange_rate: Number(row.exchange_rate),
    alloc_method: row.alloc_method as Gd1AllocMethod,
    invoice_ref: row.invoice_ref,
  }));
}

export async function triggerRecalculationForShipment(shipmentId: string, dbClient?: DatabaseClient): Promise<void> {
  const client = dbClient || pool;

  // 1. Fetch all PO lines and quantities shipped in this shipment
  const linesRes = await client.query(
    `
    SELECT
      dsl.id as dsl_id,
      COALESCE(dsl.purchase_order_line_id, dsl.po_line_id) as po_line_id,
      dsl.quantity as dsl_qty,
      COALESCE(pol.unit_price, 0) as unit_price
    FROM delivery_order_source_lines dsl
    JOIN purchase_order_lines pol ON pol.id = COALESCE(dsl.purchase_order_line_id, dsl.po_line_id)
    WHERE dsl.delivery_order_id = $1
    `,
    [shipmentId]
  );

  if (linesRes.rows.length === 0) return;

  // 2. Fetch all shipment costs
  const costs = await getShipmentCosts(shipmentId, client);

  // 3. Compute totals
  let totalValue = 0;
  let totalQty = 0;

  for (const row of linesRes.rows as any[]) {
    const qty = Number(row.dsl_qty);
    const price = Number(row.unit_price);
    totalValue += qty * price;
    totalQty += qty;
  }

  // 4. Reset allocated costs to 0 first for these PO lines from this shipment
  const poLineIds = (linesRes.rows as any[]).map((row) => row.po_line_id);

  // We will compute the allocation mapping: poLineId -> allocated amount from this shipment
  const allocationMap = new Map<string, number>();
  for (const poLineId of poLineIds) {
    allocationMap.set(poLineId, 0);
  }

  // 5. Calculate allocation
  for (const cost of costs) {
    const costInBaseCurrency = cost.amount * cost.exchange_rate;

    for (const row of linesRes.rows as any[]) {
      const poLineId = row.po_line_id;
      const qty = Number(row.dsl_qty);
      const price = Number(row.unit_price);

      let allocatedAmount = 0;
      if (cost.alloc_method === 'BY_VALUE' && totalValue > 0) {
        allocatedAmount = costInBaseCurrency * ((qty * price) / totalValue);
      } else {
        // BY_QTY or fallback
        if (totalQty > 0) {
          allocatedAmount = costInBaseCurrency * (qty / totalQty);
        }
      }

      allocationMap.set(poLineId, (allocationMap.get(poLineId) ?? 0) + allocatedAmount);
    }
  }

  // 6. Update the PO lines' landed_cost_alloc
  // Note: a PO Line can theoretically be shipped in multiple shipments.
  // To be safe, we recalculate the TOTAL landed_cost_alloc for these PO lines by summing allocations from ALL their shipments.
  for (const poLineId of poLineIds) {
    // Sum from all shipments
    const sumRes = await client.query(
      `
      SELECT
        dsl.delivery_order_id as shipment_id,
        dsl.quantity as dsl_qty
      FROM delivery_order_source_lines dsl
      WHERE COALESCE(dsl.purchase_order_line_id, dsl.po_line_id) = $1
      `,
      [poLineId]
    );

    let totalLandedCost = 0;

    for (const sRow of sumRes.rows as any[]) {
      const sId = sRow.shipment_id;
      const sQty = Number(sRow.dsl_qty);

      // Fetch all costs for this shipment
      const sCosts = await getShipmentCosts(sId, client);

      // Compute total qty and value of this shipment
      const sLinesRes = await client.query(
        `
        SELECT
          COALESCE(dsl.purchase_order_line_id, dsl.po_line_id) as po_line_id,
          dsl.quantity as dsl_qty,
          COALESCE(pol.unit_price, 0) as unit_price
        FROM delivery_order_source_lines dsl
        JOIN purchase_order_lines pol ON pol.id = COALESCE(dsl.purchase_order_line_id, dsl.po_line_id)
        WHERE dsl.delivery_order_id = $1
        `,
        [sId]
      );

      let sTotalValue = 0;
      let sTotalQty = 0;
      for (const line of sLinesRes.rows as any[]) {
        const q = Number(line.dsl_qty);
        const p = Number(line.unit_price);
        sTotalValue += q * p;
        sTotalQty += q;
      }

      // Fetch PO line unit price
      const priceRes = await client.query('SELECT unit_price FROM purchase_order_lines WHERE id = $1', [poLineId]);
      const polPrice = priceRes.rows.length > 0 ? Number(priceRes.rows[0].unit_price) : 0;

      for (const cost of sCosts) {
        const costInBaseCurrency = cost.amount * cost.exchange_rate;
        if (cost.alloc_method === 'BY_VALUE' && sTotalValue > 0) {
          totalLandedCost += costInBaseCurrency * ((sQty * polPrice) / sTotalValue);
        } else if (sTotalQty > 0) {
          totalLandedCost += costInBaseCurrency * (sQty / sTotalQty);
        }
      }
    }

    await client.query(
      'UPDATE purchase_order_lines SET landed_cost_alloc = $1 WHERE id = $2',
      [totalLandedCost, poLineId]
    );
  }
}
