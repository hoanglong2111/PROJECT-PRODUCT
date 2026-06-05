import { pool } from '../config/database';
import { generateEntityId } from '../domain/gd1Identity';

export async function seedGd1TaskTemplates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create some sample task templates for PO stages
    const templates = [
      { po_type: 'STANDARD', po_stage: 'ISSUED', task_name: 'Verify Supplier Confirmation', default_assignee_role: 'PIC_MANAGER', sla_hours: 48, sort_order: 1 },
      { po_type: 'STANDARD', po_stage: 'CONFIRMED', task_name: 'Arrange Shipping Booking', default_assignee_role: 'PORT_OFFICER', sla_hours: 72, sort_order: 1 },
      { po_type: 'STANDARD', po_stage: 'SHIPPED', task_name: 'Prepare Customs Documents', default_assignee_role: 'CUSTOMS_OFFICER', sla_hours: 24, sort_order: 1, linked_milestone: 'M4' },
      { po_type: 'STANDARD', po_stage: 'DELIVERED', task_name: 'Process Landed Cost Allocation', default_assignee_role: 'FINANCE_OFFICER', sla_hours: 120, sort_order: 1 },
    ];

    for (const t of templates) {
      await client.query(
        `INSERT INTO po_task_templates (id, tenant_id, po_type, po_stage, task_name, default_assignee_role, sla_hours, linked_milestone, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [generateEntityId('TPL'), 'tenant-001', t.po_type, t.po_stage, t.task_name, t.default_assignee_role, t.sla_hours, t.linked_milestone || null, t.sort_order]
      );
    }

    await client.query('COMMIT');
    console.log('GD1 Task Templates seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding GD1 Task Templates', error);
    throw error;
  } finally {
    client.release();
  }
}
