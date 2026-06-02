import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type { AuthenticatedRequest, CreatePurchaseOrderBody } from '../../types';
import { ApiError } from '../../errors';
import { createPurchaseOrder, listPurchaseOrders, syncPurchaseOrderWithSap } from './service';
import { generateTasksForPoStage, getPoStageTasks } from '../../services/poStageTasks';
import { pool } from '../../db';
import { enqueueOutboxEvent, insertAuditLog, recordStateTransition, runIdempotentMutation } from '../../services/reliability';

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

function sendRouteError(response: any, error: any) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  response.status(statusCode).json({ data: null, errors: [{ message: error.message }] });
}

export function createPurchaseOrdersRouter() {
  const router = Router();

  router.get('/purchase-orders', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listPurchaseOrders(), errors: [] });
  });

  router.post('/purchase-orders', authenticateRequest, authorizeRole(roleGroups.purchaseOrders), async (request: AuthenticatedRequest, response) => {
    await runIdempotentMutation(request, response, async () => {
      const purchaseOrder = await createPurchaseOrder(request.body as CreatePurchaseOrderBody);
      return { statusCode: 201, body: { data: purchaseOrder, errors: [] } };
    });
  });

  router.post('/purchase-orders/:poNumber/sap-sync', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), async (request: AuthenticatedRequest, response) => {
    const purchaseOrder = await syncPurchaseOrderWithSap(decodeURIComponent(String(request.params.poNumber ?? '')), request.auth);
    response.json({ data: purchaseOrder, errors: [] });
  });

  // --- GD1 PO stage transitions & PO-stage tasks ---
  router.patch('/purchase-orders/:poNumber/stage', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), async (request: any, response: any) => {
    try {
      const poNumber = decodeURIComponent(String(request.params.poNumber ?? ''));
      const { stage } = request.body; // e.g. 'SENT', 'CONFIRMED'
      if (!gd1PoStages.has(stage)) {
        throw new ApiError(400, `Invalid PO stage: ${stage}`);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const poRes = await client.query('SELECT id, status FROM purchase_orders WHERE po_number = $1 FOR UPDATE', [poNumber]);
        if (poRes.rows.length === 0) {
          throw new ApiError(404, 'PO not found');
        }
        const poId = poRes.rows[0].id as string;
        const currentStatus = String(poRes.rows[0].status || 'DRAFT');
        const allowedNext = allowedStageTransitions[currentStatus] ?? [];
        if (!allowedNext.includes(stage)) {
          throw new ApiError(409, `Cannot move PO from ${currentStatus} to ${stage}.`);
        }

        const blockerRes = await client.query(
          `
          SELECT id, task_name
          FROM po_stage_tasks
          WHERE purchase_order_id = $1
            AND po_stage = $2
            AND status = 'BLOCKED'
          LIMIT 1
          `,
          [poId, currentStatus]
        );
        if (blockerRes.rows.length > 0) {
          throw new ApiError(409, `Current PO stage is blocked by task: ${blockerRes.rows[0].task_name}`);
        }

        await client.query('UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2', [stage, poId]);
        await recordStateTransition(client, {
          tenantId: 'tenant-001',
          entityType: 'purchase_order',
          entityId: poId,
          fromStatus: currentStatus,
          toStatus: stage,
          actorId: request.auth?.sub ?? null,
        });
        await insertAuditLog(client, {
          tenantId: 'tenant-001',
          actorId: request.auth?.sub ?? null,
          action: 'purchase_order.stage_changed',
          entityType: 'purchase_order',
          entityId: poId,
          before: { status: currentStatus },
          after: { status: stage },
        });
        if (stage === 'CONFIRMED') {
          await enqueueOutboxEvent(client, {
            tenantId: 'tenant-001',
            aggregateType: 'purchase_order',
            aggregateId: poId,
            eventType: 'purchase_order.confirmed',
            destination: 'ERP',
            payload: { purchaseOrderId: poId, poNumber, status: stage },
          });
        }

        if (taskGeneratingStages.has(stage)) {
          await generateTasksForPoStage(poId, stage, client);
        }

        await client.query('COMMIT');
        response.json({ data: { success: true }, errors: [] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.get('/purchase-orders/:poNumber/tasks', authenticateRequest, authorizeRole(readAllRoles), async (request: any, response: any) => {
    try {
      const poNumber = decodeURIComponent(String(request.params.poNumber ?? ''));
      const poRes = await pool.query('SELECT id FROM purchase_orders WHERE po_number = $1', [poNumber]);
      if (poRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'PO not found' }] });
        return;
      }
      const poId = poRes.rows[0].id as string;
      const tasks = await getPoStageTasks(poId);
      response.json({ data: tasks, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  return router;
}
