import type { Priority, UserRef } from './common';
import type { Gd1MilestoneCode } from './shipment';

export type TaskStatus = 'TODO' | 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export type TaskRole =
  | 'BUYER'
  | 'LOGISTICS_PLANNER'
  | 'PIC_MANAGER'
  | 'PORT_OFFICER'
  | 'CUSTOMS_OFFICER'
  | 'WAREHOUSE_STAFF'
  | 'PIC Manager'
  | 'Sale Staff'
  | 'Port Officer'
  | 'Customs Officer'
  | 'Finance Officer'
  | 'Warehouse Staff';

export type LogisticsTaskTemplateRef = {
  task_template_id: string;
  group_code: string | null;
  group_name: string | null;
  milestone_code: string | null;
  department: string | null;
  sla_hours: number | null;
  sla_text: string | null;
  related_documents: string | null;
};

export type LogisticsTask = {
  task_id: string;
  do_number: string;
  hbl_number: string | null;
  request_code: string;
  po_number: string | null;
  production_contract_number: string;
  task_name: string;
  role: TaskRole;
  assignee: UserRef;
  progress: number;
  created_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string;
  notes: string;
  blocked_reason: string | null;
  task_template_id: string | null;
  template: LogisticsTaskTemplateRef | null;
};

// ============================================================================
// GD1 CANONICAL TYPEDEF LAYER
// ============================================================================

export type Gd1PoStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export type Gd1TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';

export interface Gd1PoStageTask {
  id: string;
  tenant_id: string | null;
  purchase_order_id: string;
  po_stage: Gd1PoStatus;
  task_name: string;
  task_template_id: string | null;
  template_milestone_code: string | null;
  template_department: string | null;
  assignee_id: string;
  assigned_by: string;
  status: Gd1TaskStatus;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  linked_shipment_milestone: Gd1MilestoneCode | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Shipment types for Shipments page
