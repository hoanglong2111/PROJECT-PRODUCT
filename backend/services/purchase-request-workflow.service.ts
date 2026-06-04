import type { AppRole } from '../domain/auth';
import {
  approveApprovalStep,
  createApprovalConfig,
  getApprovalConfigs,
  getApprovalStepsForEntity,
  rejectApprovalStep,
  submitPrForApproval,
} from '../models/approval';
import { findPurchaseRequestId } from '../models/purchase-request-workflow';
import { ApiError } from '../utils/errors';

async function requirePurchaseRequestId(requestedOrderId: string) {
  const purchaseRequestId = await findPurchaseRequestId(requestedOrderId);
  if (!purchaseRequestId) {
    throw new ApiError(404, 'Purchase request not found');
  }

  return purchaseRequestId;
}

export async function submitPurchaseRequestForApproval(requestedOrderId: string, requesterId: string) {
  await submitPrForApproval(await requirePurchaseRequestId(requestedOrderId), requesterId);
}

export async function listPurchaseRequestApprovalSteps(requestedOrderId: string) {
  return getApprovalStepsForEntity(await requirePurchaseRequestId(requestedOrderId));
}

export async function approvePurchaseRequestStep(stepId: string, approverUserId: string, note: unknown, role?: AppRole) {
  await approveApprovalStep(stepId, approverUserId, typeof note === 'string' ? note : null, role);
}

export async function rejectPurchaseRequestStep(stepId: string, approverUserId: string, note: unknown, role?: AppRole) {
  await rejectApprovalStep(stepId, approverUserId, typeof note === 'string' ? note : null, role);
}

export function listApprovalConfigs() {
  return getApprovalConfigs();
}

export async function addApprovalConfig(body: Record<string, unknown>) {
  return createApprovalConfig({
    tenant_id: 'tenant-001',
    applies_to: body.appliesTo as never,
    department_id: typeof body.departmentId === 'string' ? body.departmentId : null,
    min_amount: body.minAmount as number,
    max_amount: (body.maxAmount as number) || null,
    currency_code: String(body.currencyCode || 'USD'),
    step_order: body.stepOrder as number,
    approver_role: body.approverRole as never,
    approver_user_id: typeof body.approverUserId === 'string' ? body.approverUserId : null,
    escalation_timeout_hours: (body.escalationTimeoutHours as number) || 24,
    is_active: body.isActive !== false,
  });
}
