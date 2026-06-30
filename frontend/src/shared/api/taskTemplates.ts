import { apiClient } from './axiosConfig';

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  pagination: PaginationMeta;
};

type ApiMessageResponse<T> = {
  data: T;
  message?: string;
};

export type ListParams = {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  is_active?: boolean;
};

export const MILESTONE_CODES = {
  PRE_SHIPMENT: 'Pre-shipment',
  MS1_BOOKING_CONFIRMED: 'MS1 - Booking confirmed',
  MS2_CARGO_READY: 'MS2 - Cargo ready',
  MS3_LOADED: 'MS3 - Loaded',
  MS4_IN_TRANSIT: 'MS4 - In transit',
  MS5_ARRIVED_PORT: 'MS5 - Arrived port',
  MS6_CUSTOMS_SUBMITTED: 'MS6 - Customs submitted',
  MS7_CUSTOMS_CLEARED: 'MS7 - Customs cleared',
  MS8_DELIVERED_GATE: 'MS8 - Delivered gate',
} as const;

export const DEPARTMENTS = {
  FDS_SALES: 'FDS Sales',
  KBI_PURCHASING: 'KBI Purchasing',
  FDS_OPS: 'FDS Ops',
  FDS_OPS_CUSTOMS: 'FDS Ops Customs',
  FDS_ACCOUNTING: 'FDS Accounting',
  KBI_WAREHOUSE: 'KBI Warehouse',
} as const;

export type MilestoneCode = keyof typeof MILESTONE_CODES;

export type DepartmentCode = keyof typeof DEPARTMENTS;

export type TaskTemplate = {
  id: string;
  group_code: string;
  group_name: string;
  task_name: string;
  task_description: string;
  milestone_code: MilestoneCode | string | null;
  sla_hours: number | null;
  sla_text: string | null;
  department: DepartmentCode | string;
  assignee_code: string | null;
  related_documents: string;
  note: string | null;
  sort_order: number;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type TaskTemplatePayload = {
  group_code?: string;
  group_name?: string;
  task_name?: string;
  task_description?: string;
  milestone_code?: MilestoneCode | string | null;
  sla_hours?: number | null;
  sla_text?: string | null;
  department?: DepartmentCode | string;
  assignee_code?: string | null;
  related_documents?: string;
  note?: string | null;
  sort_order?: number;
};

export type TaskTemplateListParams = ListParams & {
  milestone_code?: MilestoneCode | string;
  department?: DepartmentCode | string;
};

function unwrapData<T>(response: { data: { data: T } }) {
  return response.data.data;
}

export function normalizeTaskTemplate(template: TaskTemplate): TaskTemplate {
  return {
    ...template,
    milestone_code: template.milestone_code ?? null,
    sla_hours: template.sla_hours ?? null,
    sla_text: template.sla_text ?? null,
    assignee_code: template.assignee_code ?? null,
    note: template.note ?? null,
    sort_order: Number(template.sort_order ?? 0),
  };
}

function normalizePaginatedResponse<T>(
  response: PaginatedResponse<T>,
  mapper: (record: T) => T,
): PaginatedResponse<T> {
  return {
    ...response,
    data: response.data.map(mapper),
  };
}

export async function fetchTaskTemplates(params: TaskTemplateListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<TaskTemplate>>('/task-templates', { params });
  return normalizePaginatedResponse(response.data, normalizeTaskTemplate);
}

export async function fetchTaskTemplate(id: string) {
  const response = await apiClient.get<{ data: TaskTemplate }>(`/task-templates/${id}`);
  return normalizeTaskTemplate(unwrapData(response));
}

export async function createTaskTemplate(
  payload: Required<Pick<TaskTemplatePayload, 'group_name' | 'task_name' | 'task_description'>> &
    TaskTemplatePayload,
) {
  const response = await apiClient.post<ApiMessageResponse<TaskTemplate>>('/task-templates', payload);
  return normalizeTaskTemplate(unwrapData(response));
}

export async function updateTaskTemplate(id: string, payload: TaskTemplatePayload) {
  const response = await apiClient.patch<ApiMessageResponse<TaskTemplate>>(`/task-templates/${id}`, payload);
  return normalizeTaskTemplate(unwrapData(response));
}

export async function deleteTaskTemplate(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<TaskTemplate>>(`/task-templates/${id}`);
  return normalizeTaskTemplate(unwrapData(response));
}
