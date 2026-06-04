import type { Response } from 'express';

import type { AuthenticatedRequest, UpdateTaskBody } from '../domain/types';
import { changePoStageTask, listPoStageTasks } from '../services/po-stage-task.service';
import { listTasks, updateTask } from '../services/tasks.service';

export async function getTasks(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listTasks(), errors: [] });
}

export async function getPoStageTasks(_request: AuthenticatedRequest, response: Response) {
  response.json({ data: await listPoStageTasks(), errors: [] });
}

export async function patchPoStageTask(request: AuthenticatedRequest, response: Response) {
  await changePoStageTask({
    taskId: String(request.params.taskId ?? ''),
    status: String(request.body.status ?? ''),
    note: request.body.note,
    userEmail: request.auth?.email || 'SYSTEM',
  });
  response.json({ data: { success: true }, errors: [] });
}

export async function patchTask(request: AuthenticatedRequest, response: Response) {
  response.json({
    data: await updateTask(
      decodeURIComponent(String(request.params.taskId ?? '')),
      request.body as UpdateTaskBody,
      request.auth,
    ),
    errors: [],
  });
}
