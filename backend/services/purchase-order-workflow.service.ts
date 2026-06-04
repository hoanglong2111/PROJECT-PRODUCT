import { withTransaction } from '../config/transaction';
import type { Gd1PoStatus } from '../domain/logistics';
import type { TokenPayload } from '../domain/types';
import {
  findBlockedStageTask,
  findPurchaseOrderForUpdate,
  findPurchaseOrderId,
  updatePurchaseOrderStage,
} from '../models/purchase-order-workflow';
import { generateTasksForPoStage, getPoStageTasks } from '../models/poStageTasks';
import { enqueueOutboxEvent, insertAuditLog, recordStateTransition } from '../models/reliability';
import { ApiError } from '../utils/errors';

const gd1PoStages = new Set(['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED', 'CLOSED', 'CANCELLED']);
const taskGeneratingStages = new Set(['SENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED']);
const allowedStageTransitions: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SAP_PENDING: ['SENT', 'CANCELLED'],
  SAP_SYNCED: ['SENT', 'CONFIRMED', 'CANCELLED'],
  SENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'READY_TO_SHIP', 'CANCELLED'],
  IN_PRODUCTION: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED: ['RECEIVED'],
  PARTIALLY_DELIVERED: ['SHIPPED', 'RECEIVED', 'CLOSED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export async function changePurchaseOrderStage(poNumber: string, stage: string, auth?: TokenPayload) {
  if (!gd1PoStages.has(stage)) {
    throw new ApiError(400, `Invalid PO stage: ${stage}`);
  }

  await withTransaction(async (client) => {
    const purchaseOrder = await findPurchaseOrderForUpdate(client, poNumber);
    if (!purchaseOrder) {
      throw new ApiError(404, 'PO not found');
    }

    const currentStatus = purchaseOrder.status || 'DRAFT';
    if (!(allowedStageTransitions[currentStatus] ?? []).includes(stage)) {
      throw new ApiError(409, `Cannot move PO from ${currentStatus} to ${stage}.`);
    }

    const blocker = await findBlockedStageTask(client, purchaseOrder.id, currentStatus);
    if (blocker) {
      throw new ApiError(409, `Current PO stage is blocked by task: ${blocker.task_name}`);
    }

    await updatePurchaseOrderStage(client, purchaseOrder.id, stage);
    await recordStateTransition(client, {
      tenantId: 'tenant-001',
      entityType: 'purchase_order',
      entityId: purchaseOrder.id,
      fromStatus: currentStatus,
      toStatus: stage,
      actorId: auth?.sub ?? null,
    });
    await insertAuditLog(client, {
      tenantId: 'tenant-001',
      actorId: auth?.sub ?? null,
      action: 'purchase_order.stage_changed',
      entityType: 'purchase_order',
      entityId: purchaseOrder.id,
      before: { status: currentStatus },
      after: { status: stage },
    });

    if (stage === 'CONFIRMED') {
      await enqueueOutboxEvent(client, {
        tenantId: 'tenant-001',
        aggregateType: 'purchase_order',
        aggregateId: purchaseOrder.id,
        eventType: 'purchase_order.confirmed',
        destination: 'ERP',
        payload: { purchaseOrderId: purchaseOrder.id, poNumber, status: stage },
      });
    }

    if (taskGeneratingStages.has(stage)) {
      await generateTasksForPoStage(purchaseOrder.id, stage as Gd1PoStatus, client);
    }
  });
}

export async function listPurchaseOrderTasks(poNumber: string) {
  const purchaseOrderId = await findPurchaseOrderId(poNumber);
  if (!purchaseOrderId) {
    throw new ApiError(404, 'PO not found');
  }

  return getPoStageTasks(purchaseOrderId);
}
