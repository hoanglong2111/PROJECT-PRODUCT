import { pool } from '../config/database';
import { generateTasksForPoStage } from '../models/poStageTasks';
import { gd1DtoService } from './gd1-dtos.service';

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function startOutboxWorker(intervalMs = 1500) {
  if (workerInterval) return;

  console.log(`Starting GD1 Outbox Worker with interval ${intervalMs}ms...`);
  workerInterval = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      let hasMore = true;
      while (hasMore) {
        hasMore = await processNextOutboxEvent();
      }
    } catch (err) {
      console.error('Error in outbox worker loop:', err);
    } finally {
      isProcessing = false;
    }
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('Stopped GD1 Outbox Worker.');
  }
}

export async function processNextOutboxEvent(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Select and lock the next pending outbox event
    const res = await client.query(
      `SELECT * FROM outbox_events
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (res.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }

    const event = res.rows[0] as any;

    // Mark as publishing
    await client.query(
      `UPDATE outbox_events SET status = 'PUBLISHING', updated_at = NOW() WHERE id = $1`,
      [event.id]
    );

    await client.query('COMMIT');

    // Process the event out of transaction to avoid long lock times
    try {
      await dispatchOutboxEvent(event);

      // Mark as processed
      await pool.query(
        `UPDATE outbox_events
         SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [event.id]
      );
    } catch (err: any) {
      console.error(`Error processing outbox event ${event.id}:`, err);
      const retryCount = (event.retry_count || 0) + 1;
      const newStatus = retryCount >= 3 ? 'DEAD_LETTER' : 'PENDING';

      await pool.query(
        `UPDATE outbox_events
         SET status = $1, retry_count = $2, last_error = $3, updated_at = NOW()
         WHERE id = $4`,
        [newStatus, retryCount, err.message || String(err), event.id]
      );
    }

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Outbox transaction error:', error);
    return false;
  } finally {
    client.release();
  }
}

async function dispatchOutboxEvent(event: any): Promise<void> {
  const { event_type, payload } = event;
  console.log(`[Outbox Dispatcher] Processing event ${event_type} (${event.id})`);

  switch (event_type) {
    case 'purchase_order.status_changed': {
      const { poId, toStatus } = payload;
      console.log(`[Outbox Handler] PO status changed to ${toStatus} for PO ${poId}. Generating stage tasks...`);
      await generateTasksForPoStage(poId, toStatus);
      break;
    }

    case 'shipment.milestone_completed': {
      const { shipmentId, milestoneCode, actualDate, recordedBy } = payload;
      console.log(`[Outbox Handler] Milestone ${milestoneCode} completed for Shipment ${shipmentId}.`);

      // 1. Auto-Close Task
      const closeRes = await pool.query(
        `UPDATE po_stage_tasks
         SET status = 'COMPLETED', completed_at = NOW(), completed_by = $1, note = 'Auto-closed by shipment milestone completion'
         WHERE purchase_order_id = (
           SELECT id FROM purchase_orders WHERE po_number = (
             SELECT po_number FROM shipments WHERE id = $2
           )
         )
         AND linked_shipment_milestone = $3
         AND status <> 'COMPLETED'
         RETURNING id, task_name`,
        [recordedBy || 'SYSTEM', shipmentId, milestoneCode]
      );

      if (closeRes.rows.length > 0) {
        for (const task of closeRes.rows) {
          console.log(`[Outbox Handler] Auto-closed PO task "${task.task_name}" (${task.id})`);
        }
      }

      // 2. Auto-Create DTO
      if (milestoneCode === 'CUSTOM_CLEARED') {
        const shipRes = await pool.query('SELECT * FROM shipments WHERE id = $1', [shipmentId]);
        if (shipRes.rows.length > 0) {
          const shipment = shipRes.rows[0];
          const dtoRes = await pool.query('SELECT 1 FROM domestic_transport_orders WHERE shipment_id = $1', [shipmentId]);
          if (dtoRes.rows.length === 0) {
            console.log(`[Outbox Handler] Milestone CUSTOM_CLEARED completed. Auto-creating DTO for Shipment ${shipmentId}...`);
            await gd1DtoService.createDTO({
              shipmentId: shipment.id,
              pickupLocation: 'Port/Port of Discharge',
              deliveryLocation: shipment.warehouse_code || 'WH001',
              vehicleType: 'CONTAINER_TRUCK',
              plannedPickupTime: new Date().toISOString(),
              plannedDeliveryTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            }, 'SYSTEM');
          }
        }
      }

      // 3. RACI Notification Hook
      console.log(`[RACI Notification] Milestone ${milestoneCode} for Shipment ${shipmentId} completed at ${actualDate}. Alerting roles: PIC_MANAGER (Accountable), PORT_OFFICER (Responsible).`);
      break;
    }

    default:
      console.log(`[Outbox Dispatcher] No handler registered for event type: ${event_type}`);
  }
}
