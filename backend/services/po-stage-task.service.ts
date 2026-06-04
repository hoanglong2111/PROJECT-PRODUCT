import { listPoStageTasks, updatePoStageTask } from '../models/po-stage-task-workflow';
import { ApiError } from '../utils/errors';

const poTaskStatuses = new Set(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED']);

export { listPoStageTasks };

export async function changePoStageTask(input: {
  note: unknown;
  status: string;
  taskId: string;
  userEmail: string;
}) {
  if (!poTaskStatuses.has(input.status)) {
    throw new ApiError(400, `Invalid PO-stage task status: ${input.status}`);
  }
  if (input.status === 'BLOCKED' && !String(input.note ?? '').trim()) {
    throw new ApiError(400, 'BLOCKED PO-stage tasks require a blocker note.');
  }
  if (input.status === 'CANCELLED' && !String(input.note ?? '').trim()) {
    throw new ApiError(400, 'CANCELLED PO-stage tasks require a note.');
  }

  if (!(await updatePoStageTask(input))) {
    throw new ApiError(404, 'PO-stage task not found.');
  }
}
