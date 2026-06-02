import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type {
  AuthenticatedRequest,
  CreatePurchaseRequestBody,
  UpdatePurchaseRequestBody,
  UpdatePurchaseRequestStatusBody,
} from '../../types';
import { createPurchaseRequest, listPurchaseRequests, updatePurchaseRequest, updatePurchaseRequestStatus } from './service';
import { ApiError } from '../../errors';
import {
  submitPrForApproval,
  getApprovalStepsForEntity,
  approveApprovalStep,
  rejectApprovalStep,
  getApprovalConfigs,
  createApprovalConfig,
} from '../../services/approval';
import { pool } from '../../db';
import { runIdempotentMutation } from '../../services/reliability';

function sendRouteError(response: any, error: any) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  response.status(statusCode).json({ data: null, errors: [{ message: error.message }] });
}

export function createPurchaseRequestsRouter() {
  const router = Router();

  router.get('/purchase-requests', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listPurchaseRequests(), errors: [] });
  });

  router.post('/purchase-requests', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), async (request: AuthenticatedRequest, response) => {
    await runIdempotentMutation(request, response, async () => {
      const purchaseRequest = await createPurchaseRequest(request.body as CreatePurchaseRequestBody, request.auth);
      return { statusCode: 201, body: { data: purchaseRequest, errors: [] } };
    });
  });

  router.patch('/purchase-requests/:requestedOrderId', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), async (request, response) => {
    const purchaseRequest = await updatePurchaseRequest(
      decodeURIComponent(String(request.params.requestedOrderId ?? '')),
      request.body as UpdatePurchaseRequestBody,
    );
    response.json({ data: purchaseRequest, errors: [] });
  });

  router.patch('/purchase-requests/:requestedOrderId/status', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER']), async (request: AuthenticatedRequest, response) => {
    const purchaseRequest = await updatePurchaseRequestStatus(
      decodeURIComponent(String(request.params.requestedOrderId ?? '')),
      request.body as UpdatePurchaseRequestStatusBody,
      request.auth,
    );
    response.json({ data: purchaseRequest, errors: [] });
  });

  // --- GD1 Approval Matrix & Chain Endpoints ---
  router.post('/purchase-requests/:requestedOrderId/submit', authenticateRequest, authorizeRole(roleGroups.purchaseRequests), async (request: any, response: any) => {
    try {
      const requestedOrderId = decodeURIComponent(String(request.params.requestedOrderId ?? ''));
      const prRes = await pool.query('SELECT id FROM purchase_requests WHERE requested_order_id = $1', [requestedOrderId]);
      if (prRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'Purchase request not found' }] });
        return;
      }
      const prId = prRes.rows[0].id as string;
      const requesterId = request.auth?.sub || 'SYSTEM';

      await submitPrForApproval(prId, requesterId);
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.get('/purchase-requests/:requestedOrderId/approval-steps', authenticateRequest, authorizeRole(readAllRoles), async (request: any, response: any) => {
    try {
      const requestedOrderId = decodeURIComponent(String(request.params.requestedOrderId ?? ''));
      const prRes = await pool.query('SELECT id FROM purchase_requests WHERE requested_order_id = $1', [requestedOrderId]);
      if (prRes.rows.length === 0) {
        response.status(404).json({ data: null, errors: [{ message: 'Purchase request not found' }] });
        return;
      }
      const prId = prRes.rows[0].id as string;
      const steps = await getApprovalStepsForEntity(prId);
      response.json({ data: steps, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.post('/purchase-requests/steps/:stepId/approve', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: any, response: any) => {
    try {
      const stepId = String(request.params.stepId ?? '');
      const approverUserId = request.auth?.sub || 'SYSTEM';
      const { note } = request.body;

      await approveApprovalStep(stepId, approverUserId, note, request.auth?.role);
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.post('/purchase-requests/steps/:stepId/reject', authenticateRequest, authorizeRole(['ADMIN', 'PIC_MANAGER', 'FINANCE_OFFICER']), async (request: any, response: any) => {
    try {
      const stepId = String(request.params.stepId ?? '');
      const approverUserId = request.auth?.sub || 'SYSTEM';
      const { note } = request.body;

      await rejectApprovalStep(stepId, approverUserId, note, request.auth?.role);
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.get('/purchase-requests/approval-configs', authenticateRequest, authorizeRole(readAllRoles), async (request: any, response: any) => {
    try {
      const configs = await getApprovalConfigs();
      response.json({ data: configs, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.post('/purchase-requests/approval-configs', authenticateRequest, authorizeRole(['ADMIN']), async (request: any, response: any) => {
    try {
      await runIdempotentMutation(request, response, async () => {
        const configId = await createApprovalConfig({
          tenant_id: 'tenant-001',
          applies_to: request.body.appliesTo,
          department_id: request.body.departmentId || null,
          min_amount: request.body.minAmount,
          max_amount: request.body.maxAmount || null,
          currency_code: request.body.currencyCode || 'USD',
          step_order: request.body.stepOrder,
          approver_role: request.body.approverRole,
          approver_user_id: request.body.approverUserId || null,
          escalation_timeout_hours: request.body.escalationTimeoutHours || 24,
          is_active: request.body.isActive !== false,
        });
        return { statusCode: 201, body: { data: { id: configId }, errors: [] } };
      });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  return router;
}
