import type { LogisticsTask } from '../domain/logistics';
import { updateTask } from '../models/logisticsTasks';
import { readSnapshot } from '../models/logisticsSnapshots';

export async function listTasks() {
  return readSnapshot<LogisticsTask[]>('tasks');
}

export { updateTask };
