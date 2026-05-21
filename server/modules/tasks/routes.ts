import { Router } from 'express';

import { authenticateRequest, authorizeRole } from '../../auth';
import { readAllRoles, roleGroups } from '../../constants';
import type { AuthenticatedRequest, UpdateTaskBody } from '../../types';
import { listTasks, updateTask } from './service';

export function createTasksRouter() {
  const router = Router();

  router.get('/tasks', authenticateRequest, authorizeRole(readAllRoles), async (_request, response) => {
    response.json({ data: await listTasks(), errors: [] });
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
