import { pool } from '../config/database';
import { ApiError } from '../utils/errors';
import type { DatabaseClient } from '../domain/types';
import type { Gd1ApprovalMatrixConfig, Gd1PrStatus, Gd1ApproverRole } from '../domain/logistics';
import { enqueueOutboxEvent, insertAuditLog, recordStateTransition } from './reliability';

type ApprovalActorRole = 'ADMIN' | string;

type PrApprovalRow = {
  id: string;
  tenant_id: string | null;
  total_amount: string | number | null;
  currency_code: string | null;
  department_id: string | null;
  status: string;
};

type ApprovalConfigRow = {
  step_order: number;
  approver_role: string;
  approver_user_id: string | null;
};

type ApprovalStepRow = {
  id: string;
  tenant_id: string | null;
  entity_id: string;
  step_order: number | string;
  approver_role: string;
  approver_id: string | null;
  status: string;
};

async function withTransaction<T>(
  dbClient: DatabaseClient | undefined,
  work: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  if (dbClient) return work(dbClient);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createApprovalConfig(
  config: Omit<Gd1ApprovalMatrixConfig, 'id'>,
  dbClient?: DatabaseClient
): Promise<string> {
  const client = dbClient || pool;
  const id = `matrix-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  await client.query(
    `
    INSERT INTO approval_matrix_configs (id, tenant_id, applies_to, department_id, min_amount, max_amount, currency_code, step_order, approver_role, approver_user_id, escalation_timeout_hours, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [id, config.tenant_id, config.applies_to, config.department_id, config.min_amount, config.max_amount, config.currency_code, config.step_order, config.approver_role, config.approver_user_id, config.escalation_timeout_hours, config.is_active]
  );
  return id;
}

export async function getApprovalConfigs(dbClient?: DatabaseClient): Promise<Gd1ApprovalMatrixConfig[]> {
  const client = dbClient || pool;
  const res = await client.query('SELECT * FROM approval_matrix_configs ORDER BY applies_to ASC, min_amount ASC, step_order ASC');
  return res.rows.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    applies_to: row.applies_to as any,
    department_id: row.department_id,
    min_amount: Number(row.min_amount),
    max_amount: row.max_amount ? Number(row.max_amount) : null,
    currency_code: row.currency_code,
    step_order: Number(row.step_order),
    approver_role: row.approver_role as Gd1ApproverRole,
    approver_user_id: row.approver_user_id,
    escalation_timeout_hours: Number(row.escalation_timeout_hours),
    is_active: row.is_active,
  }));
}

export async function getApprovalStepsForEntity(
  entityId: string,
  dbClient?: DatabaseClient
): Promise<any[]> {
  const client = dbClient || pool;
  const res = await client.query(
    'SELECT * FROM approval_steps WHERE entity_id = $1 ORDER BY step_order ASC',
    [entityId]
  );
  return res.rows;
}

export async function submitPrForApproval(
  prId: string,
  requesterId: string,
  dbClient?: DatabaseClient
): Promise<void> {
  await withTransaction(dbClient, async (client) => {

  // 1. Fetch the PR total amount, currency, department, and tenant
  const prRes = await client.query<PrApprovalRow>(
    `
    SELECT id, tenant_id, total_amount, currency_code, department_id, status
    FROM purchase_requests WHERE id = $1
    FOR UPDATE
    `,
    [prId]
  );
  if (prRes.rows.length === 0) throw new ApiError(404, `PR not found: ${prId}`);

  const pr = prRes.rows[0];
  const allowedSubmitStatuses = new Set(['DRAFT', 'REJECTED', 'NEW', 'PENDING_APPROVAL']);
  if (!allowedSubmitStatuses.has(String(pr.status))) {
    throw new ApiError(409, `Cannot submit PR from status ${pr.status}.`);
  }
  const departmentId = pr.department_id;
  const totalAmount = Number(pr.total_amount);
  const currencyCode = pr.currency_code || 'USD';
  const tenantId = pr.tenant_id;

  // 2. Clear old steps first (in case of resubmission)
  await client.query('DELETE FROM approval_steps WHERE entity_id = $1', [prId]);

  // 3. Resolve approval matrix configurations
  // Try department-specific first, fallback to general (null department)
  let matrixRes = await client.query<ApprovalConfigRow>(
    `
    SELECT * FROM approval_matrix_configs
    WHERE applies_to IN ('PR', 'BOTH')
      AND is_active = true
      AND department_id = $1
      AND currency_code = $3
      AND min_amount <= $2
      AND (max_amount IS NULL OR max_amount > $2)
    ORDER BY step_order ASC
    `,
    [departmentId, totalAmount, currencyCode]
  );

  if (matrixRes.rows.length === 0) {
    // General fallback
    matrixRes = await client.query<ApprovalConfigRow>(
      `
      SELECT * FROM approval_matrix_configs
      WHERE applies_to IN ('PR', 'BOTH')
        AND is_active = true
        AND department_id IS NULL
        AND currency_code = $2
        AND min_amount <= $1
        AND (max_amount IS NULL OR max_amount > $1)
      ORDER BY step_order ASC
      `,
      [totalAmount, currencyCode]
    );
  }

  // 4. Create the steps
  if (matrixRes.rows.length === 0) {
    // Auto-approve!
    await client.query(
      `
      UPDATE purchase_requests
      SET status = 'APPROVED', approved_at = NOW(), submitted_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [prId]
    );
    await recordStateTransition(client, {
      tenantId,
      entityType: 'purchase_request',
      entityId: prId,
      fromStatus: pr.status,
      toStatus: 'APPROVED',
      actorId: requesterId,
      reason: 'No active approval matrix matched this PR.',
    });
    await insertAuditLog(client, {
      tenantId,
      actorId: requesterId,
      action: 'purchase_request.auto_approved',
      entityType: 'purchase_request',
      entityId: prId,
      before: { status: pr.status },
      after: { status: 'APPROVED' },
    });
    return;
  }

  // Create approval step records
  for (let i = 0; i < matrixRes.rows.length; i++) {
    const config = matrixRes.rows[i];
    const stepId = `step-${prId}-${config.step_order}`;
    const initialStatus = i === 0 ? 'PENDING' : 'WAITING';

    await client.query(
      `
      INSERT INTO approval_steps (id, tenant_id, entity_type, entity_id, step_order, approver_role, approver_id, status, note, decision_at)
      VALUES ($1, $2, 'purchase_request', $3, $4, $5, $6, $7, NULL, NULL)
      `,
      [stepId, tenantId, prId, config.step_order, config.approver_role, config.approver_user_id, initialStatus]
    );
  }

  // Set PR to SUBMITTED
  await client.query(
    `
    UPDATE purchase_requests
    SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
    WHERE id = $1
    `,
    [prId]
  );
  await recordStateTransition(client, {
    tenantId,
    entityType: 'purchase_request',
    entityId: prId,
    fromStatus: pr.status,
    toStatus: 'SUBMITTED',
    actorId: requesterId,
  });
  await insertAuditLog(client, {
    tenantId,
    actorId: requesterId,
    action: 'purchase_request.submitted',
    entityType: 'purchase_request',
    entityId: prId,
    before: { status: pr.status },
    after: { status: 'SUBMITTED', approvalSteps: matrixRes.rows.length },
  });
  });
}

export async function approveApprovalStep(
  stepId: string,
  approverUserId: string,
  note: string | null = null,
  actorRole?: ApprovalActorRole,
  dbClient?: DatabaseClient
): Promise<void> {
  await withTransaction(dbClient, async (client) => {

  // 1. Fetch step details
  const stepRes = await client.query<ApprovalStepRow>('SELECT * FROM approval_steps WHERE id = $1 FOR UPDATE', [stepId]);
  if (stepRes.rows.length === 0) throw new ApiError(404, `Step not found: ${stepId}`);

  const step = stepRes.rows[0];
  if (step.status !== 'PENDING') {
    throw new ApiError(409, `Approval step ${stepId} is ${step.status}, not PENDING.`);
  }
  if (step.approver_id && step.approver_id !== approverUserId && actorRole !== 'ADMIN') {
    throw new ApiError(403, 'Only the assigned approver can approve this step.');
  }
  const entityId = step.entity_id;
  const currentStepOrder = Number(step.step_order);

  const entityRes = await client.query<{ status: string }>('SELECT status FROM purchase_requests WHERE id = $1 FOR UPDATE', [entityId]);
  if (entityRes.rows.length === 0) {
    throw new ApiError(404, `Purchase request not found for approval step ${stepId}.`);
  }
  if (!['SUBMITTED', 'PARTIALLY_APPROVED', 'PENDING_APPROVAL'].includes(String(entityRes.rows[0].status))) {
    throw new ApiError(409, `Cannot approve PR from status ${entityRes.rows[0].status}.`);
  }

  // 2. Mark the step as APPROVED
  const approveRes = await client.query(
    `
    UPDATE approval_steps
    SET status = 'APPROVED', approver_id = $1, note = $2, decision_at = NOW(), updated_at = NOW()
    WHERE id = $3 AND status = 'PENDING'
    `,
    [approverUserId, note, stepId]
  );
  if (approveRes.rowCount !== 1) {
    throw new ApiError(409, 'Approval step was changed by another request. Please reload.');
  }

  // 3. Find next step
  const nextRes = await client.query<ApprovalStepRow>(
    "SELECT * FROM approval_steps WHERE entity_id = $1 AND step_order > $2 AND status = 'WAITING' ORDER BY step_order ASC LIMIT 1",
    [entityId, currentStepOrder]
  );

  if (nextRes.rows.length > 0) {
    const nextStep = nextRes.rows[0];
    // Activate next step
    await client.query(
      "UPDATE approval_steps SET status = 'PENDING', updated_at = NOW() WHERE id = $1",
      [nextStep.id]
    );

    // Update PR to PARTIALLY_APPROVED
    await client.query(
      "UPDATE purchase_requests SET status = 'PARTIALLY_APPROVED', updated_at = NOW() WHERE id = $1",
      [entityId]
    );
    await recordStateTransition(client, {
      tenantId: step.tenant_id,
      entityType: 'purchase_request',
      entityId,
      fromStatus: entityRes.rows[0].status,
      toStatus: 'PARTIALLY_APPROVED',
      actorId: approverUserId,
      metadata: { approvedStepId: stepId, nextStepId: nextStep.id },
    });
  } else {
    // All steps approved!
    await client.query(
      `
      UPDATE purchase_requests
      SET status = 'APPROVED', approved_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [entityId]
    );
    await recordStateTransition(client, {
      tenantId: step.tenant_id,
      entityType: 'purchase_request',
      entityId,
      fromStatus: entityRes.rows[0].status,
      toStatus: 'APPROVED',
      actorId: approverUserId,
      metadata: { approvedStepId: stepId },
    });
    await enqueueOutboxEvent(client, {
      tenantId: step.tenant_id ?? 'tenant-001',
      aggregateType: 'purchase_request',
      aggregateId: entityId,
      eventType: 'purchase_request.approved',
      destination: 'internal',
      payload: { purchaseRequestId: entityId, approvedBy: approverUserId },
    });
  }
  await insertAuditLog(client, {
    tenantId: step.tenant_id,
    actorId: approverUserId,
    action: 'approval_step.approved',
    entityType: 'approval_step',
    entityId: stepId,
    before: { status: step.status },
    after: { status: 'APPROVED', note },
  });
  });
}

export async function rejectApprovalStep(
  stepId: string,
  approverUserId: string,
  note: string | null = null,
  actorRole?: ApprovalActorRole,
  dbClient?: DatabaseClient
): Promise<void> {
  await withTransaction(dbClient, async (client) => {
  if (!note?.trim()) {
    throw new ApiError(400, 'A rejection note is required.');
  }

  // 1. Fetch step details
  const stepRes = await client.query<ApprovalStepRow>('SELECT * FROM approval_steps WHERE id = $1 FOR UPDATE', [stepId]);
  if (stepRes.rows.length === 0) throw new ApiError(404, `Step not found: ${stepId}`);

  const step = stepRes.rows[0];
  if (step.status !== 'PENDING') {
    throw new ApiError(409, `Approval step ${stepId} is ${step.status}, not PENDING.`);
  }
  if (step.approver_id && step.approver_id !== approverUserId && actorRole !== 'ADMIN') {
    throw new ApiError(403, 'Only the assigned approver can reject this step.');
  }
  const entityId = step.entity_id;
  const entityRes = await client.query<{ status: string }>('SELECT status FROM purchase_requests WHERE id = $1 FOR UPDATE', [entityId]);

  // 2. Mark current step as REJECTED
  await client.query(
    `
    UPDATE approval_steps
    SET status = 'REJECTED', approver_id = $1, note = $2, decision_at = NOW(), updated_at = NOW()
    WHERE id = $3 AND status = 'PENDING'
    `,
    [approverUserId, note, stepId]
  );

  // 3. Cancel all subsequent steps
  await client.query(
    `
    UPDATE approval_steps
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE entity_id = $1 AND step_order > $2 AND status IN ('WAITING', 'PENDING')
    `,
    [entityId, step.step_order]
  );

  // 4. Set PR status to REJECTED
  await client.query(
    "UPDATE purchase_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
    [entityId]
  );
  await recordStateTransition(client, {
    tenantId: step.tenant_id,
    entityType: 'purchase_request',
    entityId,
    fromStatus: entityRes.rows[0]?.status ?? null,
    toStatus: 'REJECTED',
    actorId: approverUserId,
    reason: note,
    metadata: { rejectedStepId: stepId },
  });
  await insertAuditLog(client, {
    tenantId: step.tenant_id,
    actorId: approverUserId,
    action: 'approval_step.rejected',
    entityType: 'approval_step',
    entityId: stepId,
    before: { status: step.status },
    after: { status: 'REJECTED', note },
  });
  });
}

export async function seedStandardApprovalMatrix(dbClient?: DatabaseClient): Promise<void> {
  const client = dbClient || pool;

  const countRes = await client.query('SELECT COUNT(*) FROM approval_matrix_configs');
  if (Number(countRes.rows[0].count) > 0) return;

  const configs: Array<Omit<Gd1ApprovalMatrixConfig, 'id'>> = [
    // Under 5,000 USD: Only needs Department Manager approval
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null, // applies to all depts
      min_amount: 0,
      max_amount: 5000,
      currency_code: 'USD',
      step_order: 1,
      approver_role: 'DEPARTMENT_MANAGER',
      approver_user_id: 'usr-manager-001', // Tran Thi Binh
      escalation_timeout_hours: 24,
      is_active: true,
    },
    // Over 5,000 USD up to 50,000 USD: Needs Dept Manager then Division Director
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null,
      min_amount: 5000,
      max_amount: 50000,
      currency_code: 'USD',
      step_order: 1,
      approver_role: 'DEPARTMENT_MANAGER',
      approver_user_id: 'usr-manager-001',
      escalation_timeout_hours: 24,
      is_active: true,
    },
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null,
      min_amount: 5000,
      max_amount: 50000,
      currency_code: 'USD',
      step_order: 2,
      approver_role: 'DIVISION_DIRECTOR',
      approver_user_id: 'usr-admin-001', // System Administrator (acting)
      escalation_timeout_hours: 48,
      is_active: true,
    },
    // Over 50,000 USD: Needs Dept Manager, Division Director, then CEO/CFO
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null,
      min_amount: 50000,
      max_amount: null,
      currency_code: 'USD',
      step_order: 1,
      approver_role: 'DEPARTMENT_MANAGER',
      approver_user_id: 'usr-manager-001',
      escalation_timeout_hours: 24,
      is_active: true,
    },
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null,
      min_amount: 50000,
      max_amount: null,
      currency_code: 'USD',
      step_order: 2,
      approver_role: 'DIVISION_DIRECTOR',
      approver_user_id: 'usr-admin-001',
      escalation_timeout_hours: 48,
      is_active: true,
    },
    {
      tenant_id: 'tenant-001',
      applies_to: 'PR',
      department_id: null,
      min_amount: 50000,
      max_amount: null,
      currency_code: 'USD',
      step_order: 3,
      approver_role: 'CFO',
      approver_user_id: 'usr-finance-001', // Do Thi Ngoc
      escalation_timeout_hours: 48,
      is_active: true,
    },
  ];

  for (const c of configs) {
    await createApprovalConfig(c, client);
  }
}
