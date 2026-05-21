import type { LogisticsTask } from '../../../src/models/logistics';
import { updateTask } from '../../services/logistics';
import { readSnapshot } from '../../services/logisticsSnapshots';

export async function listTasks() {
  return readSnapshot<LogisticsTask[]>('tasks');
}

export { updateTask };
