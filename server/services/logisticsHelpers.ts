import { randomUUID } from 'node:crypto';

import { seedUsers as logisticsSeedUsers } from '../seeds/logisticsSeed';
import type {
  DeliveryOrder,
  DeliverySourceLine,
  LogisticsTask,
  Priority,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseRequest,
  PurchaseRequestLineItem,
  PurchaseRequestStatus,
  UserRef,
} from '../../src/models/logistics';
import { PRIORITIES, SHIPPING_METHODS, TASK_STATUSES } from '../constants';
import { pool } from '../db';
import { ApiError } from '../errors';
import type {
  AppUserRow,
  CreateDeliveryOrderBody,
  CreatePurchaseOrderBody,
  DatabaseClient,
} from '../types';

export async function readUserRef(userId: string): Promise<UserRef> {
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const user = result.rows[0];

  if (!user) {
    return logisticsSeedUsers.requester;
  }

  return {
    user_id: user.id,
    name: user.full_name,
    department: user.department,
  };
}


export function normalizePurchaseOrderSourceLines(
  body: CreatePurchaseOrderBody,
  purchaseRequests: PurchaseRequest[],
  purchaseOrders: PurchaseOrder[],
) {
  const rawLines =
    Array.isArray(body.sourceLines) && body.sourceLines.length > 0
      ? body.sourceLines
      : [{ prCode: body.sourcePrCode, prLineId: undefined, quantity: undefined }];

  return rawLines.map((line, index) => {
    const prCode = requiredString(line.prCode, `sourceLines[${index}].prCode`);
    const request = purchaseRequests.find((item) => item.requested_order_id === prCode);

    if (!request) {
      throw new ApiError(404, `Không tìm thấy PR nguồn ${prCode}.`);
    }

    if (!['APPROVED', 'CONVERTED_TO_PO'].includes(request.status)) {
      throw new ApiError(409, 'Chỉ PR trạng thái APPROVED hoặc CONVERTED_TO_PO còn số lượng mới được tạo PO.');
    }

    const sourceLine = request.line_items.find((item) => item.id === line.prLineId) ?? request.line_items[0];
    if (!sourceLine) {
      throw new ApiError(404, `Không tìm thấy line nguồn của PR ${prCode}.`);
    }

    const remaining = calculatePrLineRemaining(sourceLine, prCode, purchaseOrders);
    const quantity = line.quantity === undefined ? remaining : requiredPositiveNumber(line.quantity, `sourceLines[${index}].quantity`);

    if (quantity > remaining) {
      throw new ApiError(409, `Số lượng PO vượt số lượng còn lại của ${prCode}/${sourceLine.item_code}.`);
    }

    return {
      source_pr_code: prCode,
      source_pr_line_id: sourceLine.id,
      item_code: sourceLine.item_code,
      item_name: sourceLine.item_name,
      quantity,
      unit: sourceLine.unit,
      warehouse_deadline_date: sourceLine.warehouse_deadline_date,
      warehouse_code: sourceLine.warehouse_code,
    };
  });
}

export function normalizeDeliveryOrderSourceLines(
  body: CreateDeliveryOrderBody,
  purchaseRequests: PurchaseRequest[],
  purchaseOrders: PurchaseOrder[],
  deliveryOrders: DeliveryOrder[],
): DeliverySourceLine[] {
  const legacyPoNumber =
    optionalString(body.poNumber) ??
    purchaseRequests.find((request) => request.requested_order_id === optionalString(body.requestCode))?.linked_po_numbers[0];
  const rawLines =
    Array.isArray(body.sourceLines) && body.sourceLines.length > 0
      ? body.sourceLines
      : [{ poNumber: legacyPoNumber, poLineId: undefined, quantity: body.quantity }];

  return rawLines.map((line, index) => {
    const poNumber = requiredString(line.poNumber, `sourceLines[${index}].poNumber`);
    const order = purchaseOrders.find((item) => item.po_number === poNumber);

    if (!order) {
      throw new ApiError(404, `Không tìm thấy PO nguồn ${poNumber}.`);
    }

    const requestedPrCode = optionalString(body.requestCode);
    const sourceLine =
      order.line_items.find((item) => item.id === line.poLineId) ??
      order.line_items.find((item) => item.source_pr_code === requestedPrCode) ??
      order.line_items[0];

    if (!sourceLine) {
      throw new ApiError(404, `Không tìm thấy line nguồn của PO ${poNumber}.`);
    }

    const remaining = calculatePoLineRemaining(sourceLine, poNumber, deliveryOrders);
    const quantity = line.quantity === undefined ? remaining : requiredPositiveNumber(line.quantity, `sourceLines[${index}].quantity`);

    if (quantity > remaining) {
      throw new ApiError(409, `Số lượng DO vượt số lượng còn lại của ${poNumber}/${sourceLine.item_code}.`);
    }

    return {
      id: `do-source-${randomUUID()}`,
      po_number: poNumber,
      po_line_id: sourceLine.id,
      request_code: sourceLine.source_pr_code,
      pr_line_id: sourceLine.source_pr_line_id,
      item_code: sourceLine.item_code,
      item_name: sourceLine.item_name,
      quantity,
      unit: sourceLine.unit,
    };
  });
}

export function calculatePrLineRemaining(
  lineItem: PurchaseRequestLineItem,
  prCode: string,
  purchaseOrders: PurchaseOrder[],
) {
  const orderedQuantity = purchaseOrders.reduce((total, order) => {
    return (
      total +
      order.line_items
        .filter((line) => line.source_pr_code === prCode && line.source_pr_line_id === lineItem.id)
        .reduce((lineTotal, line) => lineTotal + line.quantity, 0)
    );
  }, 0);

  return Math.max(0, lineItem.quantity - orderedQuantity);
}

export function calculatePoLineRemaining(
  lineItem: PurchaseOrderLineItem,
  poNumber: string,
  deliveryOrders: DeliveryOrder[],
) {
  const deliveredQuantity = deliveryOrders.reduce((total, order) => {
    return (
      total +
      order.source_lines
        .filter((line) => line.po_number === poNumber && line.po_line_id === lineItem.id)
        .reduce((lineTotal, line) => lineTotal + line.quantity, 0)
    );
  }, 0);

  return Math.max(0, lineItem.quantity - deliveredQuantity);
}


export function buildDefaultDeliveryTasks({
  existingTasks,
  missingDocuments,
  orderNumber,
  poNumber,
  productionContractNumber,
  requestCode,
  warehouseDeadline,
}: {
  existingTasks: LogisticsTask[];
  missingDocuments: string[];
  orderNumber: string;
  poNumber: string;
  productionContractNumber: string;
  requestCode: string;
  warehouseDeadline: string;
}): LogisticsTask[] {
  const nextTaskStart = nextTaskNumber(existingTasks);
  const templates: Array<{
    assignee: UserRef;
    dueOffset: number;
    name: string;
    role: LogisticsTask['role'];
  }> = [
    { assignee: logisticsSeedUsers.customs, dueOffset: -5, name: 'Check customs document set', role: 'Customs Officer' },
    { assignee: logisticsSeedUsers.port, dueOffset: -7, name: 'Update carrier tracking and ETA', role: 'Port Officer' },
    { assignee: logisticsSeedUsers.finance, dueOffset: -3, name: 'Confirm import tax estimate', role: 'Finance Officer' },
    { assignee: logisticsSeedUsers.warehouse, dueOffset: -1, name: 'Plan warehouse entry slot', role: 'Warehouse Staff' },
  ];

  return templates.map((template, index) => {
    const blocked = index === 0 && missingDocuments.length > 0;

    return {
      task_id: `TASK-${new Date().getFullYear()}-${String(nextTaskStart + index).padStart(6, '0')}`,
      do_number: orderNumber,
      hbl_number: null,
      request_code: requestCode,
      po_number: poNumber,
      production_contract_number: productionContractNumber,
      task_name: template.name,
      role: template.role,
      assignee: template.assignee,
      progress: blocked ? 10 : 0,
      created_at: new Date().toISOString(),
      assigned_at: new Date().toISOString(),
      completed_at: null,
      status: blocked ? 'BLOCKED' : 'TODO',
      priority: blocked ? 'HIGH' : 'MEDIUM',
      due_date: addDays(warehouseDeadline, template.dueOffset),
      notes: `Auto-created when ${orderNumber} was created.`,
      is_required_for_do_closure: true,
      blocked_reason: blocked ? `Missing ${missingDocuments.join(', ')}` : null,
    };
  });
}

export function summarizeLogisticsTasks(tasks: LogisticsTask[]): DeliveryOrder['task_summary'] {
  return {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter((task) => task.status === 'COMPLETED').length,
    blocked_tasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    required_tasks_remaining: tasks.filter((task) => task.is_required_for_do_closure && task.status !== 'COMPLETED').length,
  };
}

export function withOperationalClosureState(
  deliveryOrder: DeliveryOrder,
  relatedTasks: LogisticsTask[],
  customsGatePassed = false,
) {
  const summary = summarizeLogisticsTasks(relatedTasks);
  const canClose =
    summary.required_tasks_remaining === 0 &&
    Boolean(deliveryOrder.warehouse_tracking.actual_entry_date) &&
    deliveryOrder.logistics_shipping.missing_documents.length === 0 &&
    customsGatePassed;

  let nextStatus = deliveryOrder.order_info.status;
  if (nextStatus !== 'CANCELLED') {
    if (canClose) {
      nextStatus = 'DELIVERED';
    } else if (nextStatus === 'DELIVERED') {
      nextStatus = 'WAREHOUSE_PENDING';
    }
  }

  return {
    ...deliveryOrder,
    order_info: {
      ...deliveryOrder.order_info,
      status: nextStatus,
    },
    task_summary: summary,
  };
}

export async function isDispatchGatePassed(deliveryOrderId: string, client: DatabaseClient) {
  const result = await client.query<{ mbl_type: string | null; status: string; telex_released: boolean }>(
    `
      SELECT customs.status, customs.telex_released, transport.mbl_type
      FROM customs_declarations customs
      LEFT JOIN efms_transport_records transport ON transport.delivery_order_id = customs.delivery_order_id
      WHERE customs.delivery_order_id = $1
    `,
    [deliveryOrderId],
  );
  const row = result.rows[0];
  return (
    row?.status === 'CLEARED' &&
    (row.telex_released === true || ['SEAWAY_BILL', 'SURRENDERED'].includes(String(row.mbl_type ?? '')))
  );
}

export function resolveOriginalWarehouseDeadline(
  deliveryOrder: DeliveryOrder,
  purchaseRequests: PurchaseRequest[],
  fallbackDeadline: string,
) {
  const sourceDeadlines = deliveryOrder.source_lines.flatMap((sourceLine) => {
    const request = purchaseRequests.find((item) => item.requested_order_id === sourceLine.request_code);
    const line = request?.line_items.find((item) => item.id === sourceLine.pr_line_id);
    return line?.warehouse_deadline_date ? [line.warehouse_deadline_date] : [];
  });

  return sourceDeadlines.sort()[0] ?? fallbackDeadline;
}

export function syncPurchaseOrderStatuses(purchaseOrders: PurchaseOrder[], deliveryOrders: DeliveryOrder[]) {
  const deliveryOrderByNumber = new Map(
    deliveryOrders.map((deliveryOrder) => [deliveryOrder.order_info.order_number, deliveryOrder]),
  );

  return purchaseOrders.map((purchaseOrder) => {
    if (purchaseOrder.linked_do_numbers.length === 0) {
      return purchaseOrder;
    }

    const linkedDeliveryOrders = purchaseOrder.linked_do_numbers
      .map((orderNumber) => deliveryOrderByNumber.get(orderNumber))
      .filter((deliveryOrder): deliveryOrder is DeliveryOrder => Boolean(deliveryOrder));

    if (linkedDeliveryOrders.length === 0) {
      return purchaseOrder;
    }

    const allDelivered = linkedDeliveryOrders.every((deliveryOrder) => deliveryOrder.order_info.status === 'DELIVERED');

    return {
      ...purchaseOrder,
      status: allDelivered ? ('CLOSED' as const) : ('PARTIALLY_DELIVERED' as const),
    };
  });
}

export function normalizeDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const documents = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  return Array.from(new Set(documents));
}

export function normalizePriority(value: unknown): Priority {
  if (typeof value === 'string' && PRIORITIES.includes(value as Priority)) {
    return value as Priority;
  }

  return 'MEDIUM';
}

export function normalizePurchaseRequestStatus(value: unknown): PurchaseRequestStatus {
  const allowedStatuses: PurchaseRequestStatus[] = ['NEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'];

  if (typeof value === 'string' && allowedStatuses.includes(value as PurchaseRequestStatus)) {
    return value as PurchaseRequestStatus;
  }

  throw new ApiError(400, 'status PR không hợp lệ.');
}

export function validatePurchaseRequestStatusTransition(current: PurchaseRequest, nextStatus: PurchaseRequestStatus) {
  if (current.status === nextStatus) {
    return;
  }

  if (current.status === 'CONVERTED_TO_PO' || current.linked_po_numbers.length > 0) {
    throw new ApiError(409, 'PR đã chuyển sang PO, không thể đổi trạng thái.');
  }

  if (current.status === 'CANCELLED') {
    throw new ApiError(409, 'PR đã hủy, không thể đổi trạng thái.');
  }

  if (current.status === 'REJECTED' && nextStatus !== 'PENDING_APPROVAL') {
    throw new ApiError(409, 'PR đã bị từ chối chỉ có thể đưa lại về chờ duyệt.');
  }

  const allowedTransitions: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
    APPROVED: ['PENDING_APPROVAL', 'CANCELLED'],
    CANCELLED: [],
    CONVERTED_TO_PO: [],
    NEW: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
    REJECTED: ['PENDING_APPROVAL'],
  };

  if (!allowedTransitions[current.status].includes(nextStatus)) {
    throw new ApiError(409, `Không thể đổi PR từ ${current.status} sang ${nextStatus}.`);
  }
}

export function normalizeShippingMethod(value: unknown): DeliveryOrder['logistics_shipping']['shipping_method'] {
  if (typeof value === 'string' && SHIPPING_METHODS.includes(value as DeliveryOrder['logistics_shipping']['shipping_method'])) {
    return value as DeliveryOrder['logistics_shipping']['shipping_method'];
  }

  return 'SEA';
}

export function normalizeTaskStatus(value: unknown): LogisticsTask['status'] {
  if (typeof value === 'string' && TASK_STATUSES.includes(value as LogisticsTask['status'])) {
    return value as LogisticsTask['status'];
  }

  throw new ApiError(400, 'status task không hợp lệ.');
}

export function normalizeProgress(value: unknown) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new ApiError(400, 'progress phải là số từ 0 đến 100.');
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

export function inferTaskStatus(progress: number, blockedReason: string | null): LogisticsTask['status'] {
  if (progress >= 100) {
    return 'COMPLETED';
  }
  if (blockedReason) {
    return 'BLOCKED';
  }
  if (progress > 0) {
    return 'IN_PROGRESS';
  }
  return 'TODO';
}

export function requiredString(value: unknown, fieldName: string) {
  const cleaned = optionalString(value);

  if (!cleaned) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }

  return cleaned;
}

export function normalizeBusinessCode(value: string) {
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function optionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}


export function optionalNonNegativeNumber(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new ApiError(400, `${fieldName} phải là số >= 0.`);
  }

  return numericValue;
}

export function requiredPositiveNumber(value: unknown, fieldName: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new ApiError(400, `${fieldName} phải lớn hơn 0.`);
  }

  return numberValue;
}

export function requiredDate(value: unknown, fieldName: string) {
  const date = optionalDate(value, fieldName);

  if (!date) {
    throw new ApiError(400, `${fieldName} là bắt buộc.`);
  }

  return date;
}

export function optionalDate(value: unknown, fieldName: string) {
  const date = optionalString(value);

  if (!date) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new ApiError(400, `${fieldName} phải có định dạng YYYY-MM-DD.`);
  }

  return date;
}

export function optionalDateTime(value: unknown, fieldName: string) {
  const dateTime = optionalString(value);
  if (!dateTime) {
    return null;
  }

  if (Number.isNaN(Date.parse(dateTime))) {
    throw new ApiError(400, `${fieldName} phải là định dạng datetime hợp lệ.`);
  }

  return new Date(dateTime).toISOString();
}

export function appendUnique<T>(items: T[], item: T) {
  return items.includes(item) ? items : [...items, item];
}

export function nextTaskNumber(tasks: LogisticsTask[]) {
  const numbers = tasks
    .map((task) => Number(task.task_id.match(/^TASK-\d{4}-(\d+)$/)?.[1] ?? 0))
    .filter((value) => Number.isFinite(value));

  return Math.max(0, ...numbers) + 1;
}

export function nextBusinessCode({
  existingValues,
  fallbackStart,
  prefix,
}: {
  existingValues: string[];
  fallbackStart: number;
  prefix: string;
}) {
  const numbers = existingValues
    .map((value) => (value.startsWith(prefix) ? Number(value.slice(prefix.length)) : 0))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(fallbackStart - 1, ...numbers) + 1;

  return `${prefix}${String(next).padStart(6, '0')}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calculateDelayDays(basisDate: string | null, deadline: string) {
  if (!basisDate) {
    return 0;
  }

  const basis = Date.parse(`${basisDate}T00:00:00.000Z`);
  const target = Date.parse(`${deadline}T00:00:00.000Z`);

  if (Number.isNaN(basis) || Number.isNaN(target)) {
    return 0;
  }

  return Math.max(0, Math.round((basis - target) / 86_400_000));
}
