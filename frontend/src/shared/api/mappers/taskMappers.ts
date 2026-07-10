import { Gd1PoStageTask, Gd1TaskStatus, LogisticsTask, LogisticsTaskTemplateRef, Priority, TaskRole, TaskStatus } from '@shared/model/logistics';
import { dateOnly, toNumber } from './mapperShared';

export type TaskScreenItem = {
  id: string;
  task_no: string;
  task_name: string;
  ref_type: 'PURCHASE_ORDER' | string;
  ref_id: string;
  ref_no: string;
  stage: TaskScreenStage;
  role: TaskRole;
  assignee: {
    id?: string;
    user_id?: string;
    name: string;
    department: string | null;
  };
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  completed_at: string | null;
  progress: number;
  blocked_reason: string | null;
  note?: string | null;
  description?: string | null;
  task_template_id?: string | null;
  milestone_code?: string | null;
  department?: string | null;
  sla_hours?: number | null;
  sla_text?: string | null;
  related_documents?: string | null;
  template_group_code?: string | null;
  template_group_name?: string | null;
  create_at?: string;
  update_at?: string;
};

export type TaskScreenStage =
  | 'SUPPLIER_CONFIRMATION'
  | 'LOT_PLANNING'
  | 'INTERNAL_DO'
  | 'QUOTATION'
  | 'SHIPMENT'
  | 'CUSTOMS'
  | 'CARRIER_DO'
  | 'DTO';

export function mapTaskScreenToTemplateRef(task: TaskScreenItem): LogisticsTaskTemplateRef | null {
  if (!task.task_template_id) return null;

  return {
    task_template_id: task.task_template_id,
    group_code: task.template_group_code ?? null,
    group_name: task.template_group_name ?? null,
    milestone_code: task.milestone_code ?? null,
    department: task.department ?? null,
    sla_hours: task.sla_hours ?? null,
    sla_text: task.sla_text ?? null,
    related_documents: task.related_documents ?? null,
  };
}

export function mapTaskScreenToLogisticsTask(task: TaskScreenItem): LogisticsTask {
  const assigneeId = task.assignee.id ?? task.assignee.user_id ?? '';

  return {
    assigned_at: task.create_at ?? null,
    assignee: {
      department: task.assignee.department ?? '',
      name: task.assignee.name,
      user_id: assigneeId,
    },
    blocked_reason: task.blocked_reason ?? null,
    completed_at: task.completed_at,
    created_at: task.create_at ?? '',
    do_number: task.ref_no,
    due_date: dateOnly(task.due_at) || '',
    hbl_number: null,
    notes: task.note ?? task.description ?? '',
    po_number: task.ref_type === 'PURCHASE_ORDER' ? task.ref_no : null,
    priority: task.priority,
    production_contract_number: task.ref_id,
    progress: toNumber(task.progress),
    request_code: task.ref_no,
    role: task.role,
    status: task.status,
    task_id: task.id,
    task_name: task.task_name,
    task_template_id: task.task_template_id ?? null,
    template: mapTaskScreenToTemplateRef(task),
  };
}

export function taskScreenStatusToGd1(status: TaskStatus): Gd1TaskStatus {
  if (status === 'COMPLETED') return 'DONE';
  if (status === 'TODO') return 'PENDING';
  if (status === 'WAITING') return 'PENDING';
  return status as Gd1TaskStatus;
}

export function gd1StatusToTaskScreen(status: string): TaskStatus {
  if (status === 'DONE') return 'COMPLETED';
  if (status === 'PENDING') return 'PENDING';
  return status as TaskStatus;
}

export function mapTaskScreenToPoStageTask(task: TaskScreenItem): Gd1PoStageTask {
  const assigneeId = task.assignee.id ?? task.assignee.user_id ?? '';

  return {
    assigned_by: 'mock-api',
    assignee_id: assigneeId,
    completed_at: task.completed_at,
    completed_by: task.completed_at ? assigneeId : null,
    created_at: task.create_at ?? '',
    due_date: dateOnly(task.due_at) || null,
    id: task.id,
    linked_shipment_milestone: null,
    note: task.note ?? null,
    po_stage: task.stage as Gd1PoStageTask['po_stage'],
    purchase_order_id: task.ref_id,
    started_at: task.status === 'IN_PROGRESS' ? task.update_at ?? task.create_at ?? null : null,
    status: taskScreenStatusToGd1(task.status),
    task_name: task.task_name,
    task_template_id: task.task_template_id ?? null,
    template_milestone_code: task.milestone_code ?? null,
    template_department: task.department ?? null,
    tenant_id: null,
    updated_at: task.update_at ?? '',
  };
}
