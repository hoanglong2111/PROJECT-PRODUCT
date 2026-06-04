import { Router } from 'express';

import { getPoStageTasks, getTasks, patchPoStageTask, patchTask } from '../controllers/tasks.controller';
import { readAllRoles, roleGroups } from '../domain/constants';
import { authenticateRequest } from '../middlewares/authenticate';
import { authorizeRole } from '../middlewares/authorize';

export function createTasksRouter() {
  const router = Router();
  router.get('/tasks', authenticateRequest, authorizeRole(readAllRoles), getTasks);
  router.get('/tasks/po', authenticateRequest, authorizeRole(readAllRoles), getPoStageTasks);
  router.patch('/tasks/po/:taskId', authenticateRequest, authorizeRole(roleGroups.tasks), patchPoStageTask);
  router.patch('/tasks/:taskId', authenticateRequest, authorizeRole(roleGroups.tasks), patchTask);
  return router;
}
