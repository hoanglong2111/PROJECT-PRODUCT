import { beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../config/database';
import { ensureSchemaAndSeed } from '../models/schema';
import { processNextOutboxEvent } from '../services/gd1-outbox-worker.service';
import { generateEntityId } from '../domain/gd1Identity';
import { enqueueOutboxEvent } from '../models/reliability';

describe('GD1 Automation Engine (Transactional Outbox)', () => {
  beforeAll(async () => {
    // Ensure database is fully initialized and seeded
    await ensureSchemaAndSeed();
    // Truncate transactional tables to ensure test isolation
    await pool.query(
      'TRUNCATE TABLE outbox_events, po_stage_tasks, shipments, shipment_source_lines, purchase_orders, purchase_order_lines, domestic_transport_orders, dto_quotes CASCADE'
    );
  });

  it('should process PO stage task generation event', async () => {
    const poId = generateEntityId('PO');
    const poNumber = `PO-TEST-AUTO-${Date.now()}`;

    // 1. Insert a mock PO
    await pool.query(
      `INSERT INTO purchase_orders (id, tenant_id, po_number, supplier_code, supplier_name, total_amount, status, order_date, currency, sap_sync_status, warehouse_code)
       VALUES ($1, 'tenant-001', $2, 'SUPP001', 'Test Supplier', 1000.0, 'SENT', NOW(), 'USD', 'SYNCED', 'WH001')`,
      [poId, poNumber]
    );

    // 2. Enqueue purchase_order.status_changed event into outbox
    await enqueueOutboxEvent(pool, {
      tenantId: 'tenant-001',
      aggregateType: 'purchase_order',
      aggregateId: poId,
      eventType: 'purchase_order.status_changed',
      payload: { poId, fromStatus: 'DRAFT', toStatus: 'CONFIRMED', userId: 'usr-manager-001' },
    });

    // 3. Process the next outbox event
    const processed = await processNextOutboxEvent();
    expect(processed).toBe(true);

    // 4. Verify that the tasks for 'CONFIRMED' stage are generated in po_stage_tasks
    const tasksRes = await pool.query(
      `SELECT * FROM po_stage_tasks WHERE purchase_order_id = $1 AND po_stage = 'CONFIRMED'`,
      [poId]
    );
    expect(tasksRes.rows.length).toBeGreaterThan(0);
    expect(tasksRes.rows[0].task_name).toBe('Theo dõi tiến độ sản xuất của Supplier');
  });

  it('should process shipment milestone completed event to auto-close tasks and auto-create DTO', async () => {
    const poId = generateEntityId('PO');
    const poNumber = `PO-TEST-AUTO-${Date.now() + 1}`;
    const shipmentId = generateEntityId('SHP');
    const orderNumber = `DO-TEST-AUTO-${Date.now()}`;

    // 1. Insert PO and Shipment linked together
    await pool.query(
      `INSERT INTO purchase_orders (id, tenant_id, po_number, supplier_code, supplier_name, total_amount, status, order_date, currency, sap_sync_status, warehouse_code)
       VALUES ($1, 'tenant-001', $2, 'SUPP001', 'Test Supplier 2', 5000.0, 'CONFIRMED', NOW(), 'USD', 'SYNCED', 'WH001')`,
      [poId, poNumber]
    );

    await pool.query(
      `INSERT INTO shipments (id, order_number, po_number, purchase_contract_number, status, item_name, quantity, unit, sap_sync_status, warehouse_code, warehouse_deadline)
       VALUES ($1, $2, $3, 'CON-001', 'BOOKING_CONFIRMED', 'Item A', 10, 'PCS', 'SYNCED', 'WH001', NOW())`,
      [shipmentId, orderNumber, poNumber]
    );

    // 2. Generate tasks and manually associate a task with a milestone (CUSTOM_CLEARED)
    const taskId = `task-test-autoclose-${Date.now()}`;
    await pool.query(
      `INSERT INTO po_stage_tasks (id, tenant_id, purchase_order_id, po_stage, task_name, assignee_id, assigned_by, status, linked_shipment_milestone)
       VALUES ($1, 'tenant-001', $2, 'SHIPPED', 'Customs Clearance task', 'usr-customs-001', 'usr-manager-001', 'PENDING', 'CUSTOM_CLEARED')`,
      [taskId, poId]
    );

    // 3. Enqueue shipment.milestone_completed outbox event (CUSTOM_CLEARED)
    await enqueueOutboxEvent(pool, {
      tenantId: 'tenant-001',
      aggregateType: 'shipment',
      aggregateId: shipmentId,
      eventType: 'shipment.milestone_completed',
      payload: { shipmentId, milestoneCode: 'CUSTOM_CLEARED', actualDate: new Date().toISOString(), recordedBy: 'usr-customs-001' },
    });

    // 4. Process outbox event
    const processed = await processNextOutboxEvent();
    expect(processed).toBe(true);

    // 5. Verify task is auto-closed
    const taskCheck = await pool.query('SELECT status, completed_by FROM po_stage_tasks WHERE id = $1', [taskId]);
    expect(taskCheck.rows[0].status).toBe('COMPLETED');
    expect(taskCheck.rows[0].completed_by).toBe('usr-customs-001');

    // 6. Verify DTO is auto-created for this shipment
    const dtoCheck = await pool.query('SELECT * FROM domestic_transport_orders WHERE shipment_id = $1', [shipmentId]);
    expect(dtoCheck.rows.length).toBe(1);
    expect(dtoCheck.rows[0].status).toBe('DRAFT');
    expect(dtoCheck.rows[0].delivery_location).toBe('WH001');
  });
});
