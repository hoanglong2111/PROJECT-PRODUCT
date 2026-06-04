import type { DeliveryOrder, LogisticsTask, PurchaseOrder } from '../domain/logistics';
import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { TokenPayload, UpdateTaskBody } from '../domain/types';
import {
  inferTaskStatus,
  normalizeProgress,
  normalizeTaskStatus,
  optionalDateTime,
  optionalString,
  requiredDate,
  syncPurchaseOrderStatuses,
  withOperationalClosureState,
} from './logisticsHelpers';
import { readSnapshot, writeSnapshot } from './logisticsSnapshots';
import { classifyPurchaseOrders, normalizeDeliveryOrder, normalizePurchaseOrder } from './logisticsTransforms';
import { assertTaskUpdateAllowed } from './sop';

export async function updateTask(taskId: string, body: UpdateTaskBody, auth?: TokenPayload) {
  if (!taskId) {
    throw new ApiError(400, 'taskId là bắt buộc.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [tasks, deliveryOrdersRaw, purchaseOrdersRaw, customsResult] = await Promise.all([
      readSnapshot<LogisticsTask[]>('tasks', client),
      readSnapshot<DeliveryOrder[]>('delivery_orders', client),
      readSnapshot<PurchaseOrder[]>('purchase_orders', client),
      client.query<{ delivery_order_id: string; status: string; telex_released: boolean }>(
        'SELECT delivery_order_id, status, telex_released FROM customs_declarations',
      ),
    ]);
    const deliveryOrders = deliveryOrdersRaw.map(normalizeDeliveryOrder);
    const purchaseOrders = purchaseOrdersRaw.map(normalizePurchaseOrder);

    const taskIndex = tasks.findIndex((task) => task.task_id === taskId);
    if (taskIndex === -1) {
      throw new ApiError(404, 'Không tìm thấy task cần cập nhật.');
    }

    const current = tasks[taskIndex];
    assertTaskUpdateAllowed(current as unknown as Record<string, unknown>, auth);

    if (current.status === 'COMPLETED') {
      throw new ApiError(409, 'Task đã hoàn tất và bị khóa chỉnh sửa.');
    }

    const nextProgress = body.progress !== undefined ? normalizeProgress(body.progress) : current.progress;
    const blockedReason =
      body.blockedReason !== undefined ? optionalString(body.blockedReason) : current.blocked_reason;
    const requestedStatus = body.status !== undefined ? normalizeTaskStatus(body.status) : null;
    const nextStatus = requestedStatus ?? inferTaskStatus(nextProgress, blockedReason);
    const normalizedStatus = nextStatus === 'COMPLETED' ? 'COMPLETED' : nextStatus;
    const completedAtInput =
      body.completedAt !== undefined ? optionalDateTime(body.completedAt, 'completedAt') : current.completed_at;

    if (normalizedStatus === 'BLOCKED' && !blockedReason) {
      throw new ApiError(400, 'blockedReason là bắt buộc khi task ở trạng thái BLOCKED.');
    }

    const updatedTask: LogisticsTask = {
      ...current,
      progress: normalizedStatus === 'COMPLETED' ? 100 : nextProgress,
      status: normalizedStatus,
      due_date: body.dueDate !== undefined ? requiredDate(body.dueDate, 'dueDate') : current.due_date,
      notes: body.notes !== undefined ? optionalString(body.notes) ?? '' : current.notes,
      blocked_reason: normalizedStatus === 'BLOCKED' ? blockedReason : null,
      completed_at: normalizedStatus === 'COMPLETED' ? completedAtInput ?? new Date().toISOString() : null,
    };

    const updatedTasks = tasks.map((task) => (task.task_id === taskId ? updatedTask : task));
    const updatedDeliveryOrders = deliveryOrders.map((order) => {
      if (order.order_info.order_number !== updatedTask.do_number) {
        return order;
      }

      const relatedTasks = updatedTasks.filter((task) => task.do_number === updatedTask.do_number);
      const customsGatePassed = customsResult.rows.some(
        (row) => row.delivery_order_id === order.id && row.status === 'CLEARED' && row.telex_released === true,
      );
      return withOperationalClosureState(order, relatedTasks, customsGatePassed);
    });
    const updatedPurchaseOrders = classifyPurchaseOrders(
      syncPurchaseOrderStatuses(purchaseOrders, updatedDeliveryOrders),
      updatedDeliveryOrders,
    );

    await Promise.all([
      writeSnapshot('tasks', updatedTasks, client),
      writeSnapshot('delivery_orders', updatedDeliveryOrders, client),
      writeSnapshot('purchase_orders', updatedPurchaseOrders, client),
    ]);
    await client.query('COMMIT');

    return updatedTask;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
