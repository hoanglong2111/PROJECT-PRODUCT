import { pool } from '../db';
import type { DatabaseClient } from '../types';
import type { Gd1PoStageTask, Gd1PoTaskTemplate, Gd1PoStatus, Gd1AssigneeRole, Gd1TaskStatus } from '../../src/models/logistics';

export async function createTemplate(
  template: Omit<Gd1PoTaskTemplate, 'id'>,
  dbClient?: DatabaseClient
): Promise<string> {
  const client = dbClient || pool;
  const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  await client.query(
    `
    INSERT INTO po_task_templates (id, tenant_id, po_type, po_stage, task_name, default_assignee_role, sla_hours, linked_milestone, is_active, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [id, template.tenant_id, template.po_type, template.po_stage, template.task_name, template.default_assignee_role, template.sla_hours, template.linked_milestone, template.is_active, template.sort_order]
  );
  return id;
}

export async function getTemplates(dbClient?: DatabaseClient): Promise<Gd1PoTaskTemplate[]> {
  const client = dbClient || pool;
  const res = await client.query('SELECT * FROM po_task_templates ORDER BY po_type ASC, po_stage ASC, sort_order ASC');
  return res.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    po_type: row.po_type as any,
    po_stage: row.po_stage as Gd1PoStatus,
    task_name: row.task_name,
    default_assignee_role: row.default_assignee_role as Gd1AssigneeRole,
    sla_hours: Number(row.sla_hours),
    linked_milestone: row.linked_milestone as any,
    is_active: row.is_active,
    sort_order: Number(row.sort_order),
  }));
}

export async function generateTasksForPoStage(
  purchaseOrderId: string,
  stage: Gd1PoStatus,
  dbClient?: DatabaseClient
): Promise<void> {
  const client = dbClient || pool;

  // 1. Get the PO type and tenant
  const poRes = await client.query('SELECT po_type, tenant_id, created_by FROM purchase_orders WHERE id = $1', [purchaseOrderId]);
  if (poRes.rows.length === 0) return;

  const poType = poRes.rows[0].po_type || 'SEA';
  const tenantId = poRes.rows[0].tenant_id;
  const creatorId = poRes.rows[0].created_by || 'SYSTEM';

  // 2. Fetch active templates for this PO type and stage
  const templatesRes = await client.query(
    `
    SELECT * FROM po_task_templates
    WHERE (po_type = $1 OR po_type = 'ALL')
      AND po_stage = $2
      AND is_active = true
    ORDER BY sort_order ASC
    `,
    [poType, stage]
  );

  // 3. Find default assignees based on role
  // Let's query app_users to find appropriate PICs
  const usersRes = await client.query('SELECT id, role, position, department FROM app_users');
  const roleUserMap = new Map<string, string>();
  for (const user of usersRes.rows as any[]) {
    roleUserMap.set(user.role, user.id);
  }

  // Fallback map from template roles to app_users roles
  const templateRoleToAppRoleMap: Record<Gd1AssigneeRole, string> = {
    BUYER: 'PIC_MANAGER',
    LOGISTICS: 'PORT_OFFICER',
    FINANCE: 'FINANCE_OFFICER',
    CUSTOMS_BROKER: 'CUSTOMS_OFFICER',
  };

  // 4. Generate the tasks
  for (const template of templatesRes.rows) {
    const defaultAppRole = templateRoleToAppRoleMap[template.default_assignee_role as Gd1AssigneeRole];
    // Find PIC or fallback to creator
    const assigneeId = roleUserMap.get(defaultAppRole) || creatorId;
    const taskId = `task-po-${purchaseOrderId}-${template.id}`;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + Number(template.sla_hours));

    await client.query(
      `
      INSERT INTO po_stage_tasks (id, tenant_id, purchase_order_id, po_stage, task_name, task_template_id, assignee_id, assigned_by, status, due_date, started_at, completed_at, completed_by, linked_shipment_milestone, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, NULL, NULL, NULL, $10, NULL)
      ON CONFLICT (id) DO NOTHING
      `,
      [taskId, tenantId, purchaseOrderId, stage, template.task_name, template.id, assigneeId, creatorId, dueDate, template.linked_milestone]
    );
  }
}

export async function getPoStageTasks(
  purchaseOrderId: string,
  dbClient?: DatabaseClient
): Promise<Gd1PoStageTask[]> {
  const client = dbClient || pool;
  const res = await client.query('SELECT * FROM po_stage_tasks WHERE purchase_order_id = $1 ORDER BY created_at ASC', [purchaseOrderId]);
  return res.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    purchase_order_id: row.purchase_order_id,
    po_stage: row.po_stage as Gd1PoStatus,
    task_name: row.task_name,
    task_template_id: row.task_template_id,
    assignee_id: row.assignee_id,
    assigned_by: row.assigned_by,
    status: row.status as Gd1TaskStatus,
    due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
    started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
    completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    completed_by: row.completed_by,
    linked_shipment_milestone: row.linked_shipment_milestone as any,
    note: row.note,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  }));
}

export async function seedStandardTemplates(dbClient?: DatabaseClient): Promise<void> {
  const client = dbClient || pool;

  const countRes = await client.query('SELECT COUNT(*) FROM po_task_templates');
  if (Number(countRes.rows[0].count) > 0) return;

  const standardTemplates: Array<Omit<Gd1PoTaskTemplate, 'id'>> = [
    // SENT stage tasks
    {
      tenant_id: 'tenant-001',
      po_type: 'ALL',
      po_stage: 'SENT',
      task_name: 'Gửi PO cho Nhà cung cấp và nhận phản hồi',
      default_assignee_role: 'BUYER',
      sla_hours: 24,
      linked_milestone: null,
      is_active: true,
      sort_order: 1,
    },
    {
      tenant_id: 'tenant-001',
      po_type: 'ALL',
      po_stage: 'SENT',
      task_name: 'Xác nhận thông tin thanh toán đặt cọc',
      default_assignee_role: 'FINANCE',
      sla_hours: 48,
      linked_milestone: null,
      is_active: true,
      sort_order: 2,
    },
    // CONFIRMED stage tasks
    {
      tenant_id: 'tenant-001',
      po_type: 'ALL',
      po_stage: 'CONFIRMED',
      task_name: 'Theo dõi tiến độ sản xuất của Supplier',
      default_assignee_role: 'BUYER',
      sla_hours: 72,
      linked_milestone: 'CARGO_READY',
      is_active: true,
      sort_order: 1,
    },
    // SHIPPED stage tasks
    {
      tenant_id: 'tenant-001',
      po_type: 'SEA',
      po_stage: 'SHIPPED',
      task_name: 'Nhận Draft B/L và cross check chứng từ',
      default_assignee_role: 'LOGISTICS',
      sla_hours: 48,
      linked_milestone: 'BL_ISSUED',
      is_active: true,
      sort_order: 1,
    },
    {
      tenant_id: 'tenant-001',
      po_type: 'SEA',
      po_stage: 'SHIPPED',
      task_name: 'Truyền tờ khai hải quan nháp',
      default_assignee_role: 'CUSTOMS_BROKER',
      sla_hours: 96,
      linked_milestone: 'CUSTOM_DRAFT_SUBMITTED',
      is_active: true,
      sort_order: 2,
    },
    {
      tenant_id: 'tenant-001',
      po_type: 'SEA',
      po_stage: 'SHIPPED',
      task_name: 'Thông quan tờ khai hải quan',
      default_assignee_role: 'CUSTOMS_BROKER',
      sla_hours: 120,
      linked_milestone: 'CUSTOM_CLEARED',
      is_active: true,
      sort_order: 3,
    },
    {
      tenant_id: 'tenant-001',
      po_type: 'SEA',
      po_stage: 'SHIPPED',
      task_name: 'Nhận lệnh giao hàng EDO và giao kho',
      default_assignee_role: 'LOGISTICS',
      sla_hours: 144,
      linked_milestone: 'EDO_DELIVERY',
      is_active: true,
      sort_order: 4,
    },
  ];

  for (const t of standardTemplates) {
    await createTemplate(t, client);
  }
}
