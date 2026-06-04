import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { DatabaseClient } from '../domain/types';
import type { Gd1ShipmentMilestone, Gd1MilestoneCode } from '../domain/logistics';
import { enqueueOutboxEvent, insertAuditLog, recordStateTransition } from './reliability';

export const milestoneCodes: Gd1MilestoneCode[] = [
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICK_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'ATD',
  'CUSTOM_DRAFT_SUBMITTED',
  'AN_ATA',
  'CUSTOM_CLEARED',
  'EDO_DELIVERY',
];

const milestoneToStatusMap: Record<Gd1MilestoneCode, string> = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  CARGO_READY: 'CARGO_READY',
  PICK_UP: 'PICKED_UP',
  BL_ISSUED: 'BL_ISSUED',
  GATE_IN_POL: 'GATE_IN_POL',
  ATD: 'IN_TRANSIT',
  CUSTOM_DRAFT_SUBMITTED: 'CUSTOMS_DRAFT',
  AN_ATA: 'ARRIVED',
  CUSTOM_CLEARED: 'CUSTOMS_CLEARED',
  EDO_DELIVERY: 'DELIVERED',
};

export function isGd1MilestoneCode(value: string): value is Gd1MilestoneCode {
  return (milestoneCodes as string[]).includes(value);
}

export async function createMilestonesForShipment(
  shipmentId: string,
  tenantId: string | null = null,
  dbClient?: DatabaseClient
): Promise<void> {
  const client = dbClient || pool;

  for (let i = 0; i < milestoneCodes.length; i++) {
    const code = milestoneCodes[i];
    const seq = i + 1;
    const id = `milestone-${shipmentId}-${seq}`;

    await client.query(
      `
      INSERT INTO shipment_milestones (id, tenant_id, shipment_id, sequence_no, milestone_code, planned_date, actual_date, recorded_by, source, note)
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, 'MANUAL', NULL)
      ON CONFLICT (shipment_id, sequence_no) DO NOTHING
      `,
      [id, tenantId, shipmentId, seq, code]
    );
  }
}

export async function ensureMilestonesForShipment(
  shipmentId: string,
  tenantId: string | null = null,
  dbClient?: DatabaseClient
): Promise<void> {
  const client = dbClient || pool;
  const countRes = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM shipment_milestones WHERE shipment_id = $1',
    [shipmentId]
  );

  if (Number(countRes.rows[0]?.count ?? 0) < milestoneCodes.length) {
    await createMilestonesForShipment(shipmentId, tenantId, client);
  }
}

export async function getMilestonesForShipment(
  shipmentId: string,
  dbClient?: DatabaseClient
): Promise<Gd1ShipmentMilestone[]> {
  const client = dbClient || pool;
  const res = await client.query(
    'SELECT * FROM shipment_milestones WHERE shipment_id = $1 ORDER BY sequence_no ASC',
    [shipmentId]
  );
  return res.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    shipment_id: row.shipment_id,
    sequence_no: Number(row.sequence_no),
    milestone_code: row.milestone_code as Gd1MilestoneCode,
    planned_date: row.planned_date ? new Date(row.planned_date).toISOString().split('T')[0] : null,
    actual_date: row.actual_date ? new Date(row.actual_date).toISOString().split('T')[0] : null,
    recorded_by: row.recorded_by,
    source: row.source as any,
    note: row.note,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  }));
}

export async function updateMilestoneActualDate(
  shipmentId: string,
  milestoneCode: Gd1MilestoneCode,
  actualDate: string | null,
  recordedBy: string | null,
  source: string = 'MANUAL',
  note: string | null = null,
  dbClient?: DatabaseClient
): Promise<void> {
  const client = dbClient || pool;
  if (!isGd1MilestoneCode(milestoneCode)) {
    throw new ApiError(400, `Invalid shipment milestone code: ${milestoneCode}`);
  }

  // 1. Update the milestone
  const updateRes = await client.query(
    `
    UPDATE shipment_milestones
    SET actual_date = $1, recorded_by = $2, source = $3, note = $4, updated_at = NOW()
    WHERE shipment_id = $5 AND milestone_code = $6
    `,
    [actualDate ? new Date(actualDate) : null, recordedBy, source, note, shipmentId, milestoneCode]
  );
  if (updateRes.rowCount === 0) {
    throw new ApiError(404, `Milestone ${milestoneCode} not found for shipment ${shipmentId}`);
  }

  // 2. Derive new status
  const shipmentRes = await client.query<{ status: string; tenant_id: string | null }>(
    'SELECT status, tenant_id FROM delivery_orders WHERE id = $1',
    [shipmentId]
  );
  const previousStatus = shipmentRes.rows[0]?.status ?? null;
  const tenantId = shipmentRes.rows[0]?.tenant_id ?? 'tenant-001';
  const allMilestones = await client.query(
    'SELECT milestone_code, actual_date FROM shipment_milestones WHERE shipment_id = $1 ORDER BY sequence_no ASC',
    [shipmentId]
  );

  let derivedStatus = 'BOOKING_PENDING';
  for (const milestone of allMilestones.rows as any[]) {
    if (milestone.actual_date) {
      const code = milestone.milestone_code as Gd1MilestoneCode;
      if (milestoneToStatusMap[code]) {
        derivedStatus = milestoneToStatusMap[code];
      }
    }
  }

  // Update the delivery order (shipment) status
  await client.query(
    'UPDATE delivery_orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [derivedStatus, shipmentId]
  );

  await insertAuditLog(client, {
    tenantId,
    actorId: recordedBy,
    action: 'shipment.milestone.updated',
    entityType: 'shipment_milestone',
    entityId: `${shipmentId}:${milestoneCode}`,
    after: { shipmentId, milestoneCode, actualDate, source, note, derivedStatus },
  });

  if (previousStatus !== derivedStatus) {
    await recordStateTransition(client, {
      tenantId,
      entityType: 'shipment',
      entityId: shipmentId,
      fromStatus: previousStatus,
      toStatus: derivedStatus,
      actorId: recordedBy,
      metadata: { milestoneCode },
    });
  }

  if (milestoneCode === 'EDO_DELIVERY' && actualDate) {
    await enqueueOutboxEvent(client, {
      tenantId,
      aggregateType: 'shipment',
      aggregateId: shipmentId,
      eventType: 'shipment.arrived_at_warehouse',
      destination: 'GD2_WMS',
      payload: { shipmentId, milestoneCode, actualDate, recordedBy },
    });
  }

  // 3. Auto-close linked tasks if actual_date is added
  if (actualDate) {
    // Legacy tasks: auto-complete any tasks associated with this DO and milestone
    await client.query(
      `
      UPDATE logistics_tasks
      SET status = 'COMPLETED', progress = 100, completed_at = NOW(), updated_at = NOW()
      WHERE do_number = (SELECT order_number FROM delivery_orders WHERE id = $1)
        AND (LOWER(task_name) LIKE $2 OR LOWER(notes) LIKE $2)
        AND status <> 'COMPLETED'
      `,
      [shipmentId, `%${milestoneCode.toLowerCase().replace(/_/g, ' ')}%`]
    );

    // GD1 po_stage_tasks
    await client.query(
      `
      UPDATE po_stage_tasks
      SET status = 'DONE', completed_at = NOW(), completed_by = $1, updated_at = NOW()
      WHERE linked_shipment_milestone = $2
        AND purchase_order_id IN (
          SELECT DISTINCT pol.purchase_order_id
          FROM delivery_order_source_lines dsl
          JOIN purchase_order_lines pol
            ON pol.id = COALESCE(dsl.purchase_order_line_id, dsl.po_line_id)
          WHERE dsl.delivery_order_id = $3
        )
        AND status IN ('PENDING', 'IN_PROGRESS')
      `,
      [recordedBy || 'SYSTEM', milestoneCode, shipmentId]
    );
  }
}
