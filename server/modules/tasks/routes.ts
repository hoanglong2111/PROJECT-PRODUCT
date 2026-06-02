import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type { AuthenticatedRequest, UpdateTaskBody } from '../../types';
import { ApiError } from '../../errors';
import { listTasks, updateTask } from './service';
import { pool } from '../../db';

const poTaskStatuses = new Set(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED']);

function sendRouteError(response: any, error: any) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  response.status(statusCode).json({ data: null, errors: [{ message: error.message }] });
}

export function createTasksRouter() {
  const router = Router();

  router.get('/tasks', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listTasks(), errors: [] });
  });

  // --- GD1 PO-stage tasks endpoints ---
  router.get('/tasks/po', authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
    try {
      const res = await pool.query('SELECT * FROM po_stage_tasks ORDER BY due_date ASC');
      response.json({ data: res.rows, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.patch('/tasks/po/:taskId', authenticateRequest, authorizeRole(roleGroups.tasks), async (request: AuthenticatedRequest, response) => {
    try {
      const taskId = String(request.params.taskId ?? '');
      const { status, note } = request.body;
      const userEmail = request.auth?.email || 'SYSTEM';
      if (!poTaskStatuses.has(status)) {
        throw new ApiError(400, `Invalid PO-stage task status: ${status}`);
      }
      if (status === 'BLOCKED' && !String(note ?? '').trim()) {
        throw new ApiError(400, 'BLOCKED PO-stage tasks require a blocker note.');
      }
      if (status === 'CANCELLED' && !String(note ?? '').trim()) {
        throw new ApiError(400, 'CANCELLED PO-stage tasks require a note.');
      }

      let query = `
        UPDATE po_stage_tasks
        SET status = $1, note = COALESCE($2, note), updated_at = NOW()
      `;
      const params: any[] = [status, note, taskId];

      if (status === 'DONE') {
        query += `, completed_at = NOW(), completed_by = $4`;
        params.push(userEmail);
      } else if (status === 'IN_PROGRESS') {
        query += `, started_at = NOW()`;
      }

      query += ` WHERE id = $3`;

      const result = await pool.query(query, params);
      if (result.rowCount === 0) {
        throw new ApiError(404, 'PO-stage task not found.');
      }
      response.json({ data: { success: true }, errors: [] });
    } catch (err: any) {
      sendRouteError(response, err);
    }
  });

  router.patch('/tasks/:taskId', authenticateRequest, authorizeRole(roleGroups.tasks), async (request, response) => {
    const task = await updateTask(
      decodeURIComponent(String(request.params.taskId ?? '')),
      request.body as UpdateTaskBody,
      (request as AuthenticatedRequest).auth,
    );
    response.json({ data: task, errors: [] });
  });

  return router;
}
