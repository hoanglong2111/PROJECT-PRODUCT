import { useDisclosure } from '@mantine/hooks';
import { useEffect, useState } from 'react';

import type { LogisticsTask } from '@shared/api/logistics';
import { useEntityParam } from '@shared/hooks/useEntityParam';

/**
 * Drawer state for the tasks screen: the detail drawer (synced to the `task`
 * URL param) and the create/edit form drawer, including the "return to the
 * detail drawer after editing" flow.
 */
export function useTaskDrawers(tasks: LogisticsTask[]) {
  const { close: closeTaskParam, open: openTaskParam, value: focusedTask } = useEntityParam('task');
  const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
  const [taskFormOpened, taskFormHandlers] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<LogisticsTask | null>(null);
  const [returnToTask, setReturnToTask] = useState<LogisticsTask | null>(null);
  const [closeRequestToken, setCloseRequestToken] = useState(0);

  useEffect(() => {
    if (!focusedTask) {
      setSelectedTask(null);
      return;
    }

    if (tasks.length === 0) {
      return;
    }

    const matchedTask = tasks.find((task) => task.task_id === focusedTask);

    if (matchedTask) {
      setSelectedTask(matchedTask);
    }
  }, [focusedTask, tasks]);

  const requestTaskFormClose = () => setCloseRequestToken((n) => n + 1);

  const openCreateTask = () => {
    setEditingTask(null);
    setReturnToTask(null);
    taskFormHandlers.open();
  };

  const openEditTask = (task: LogisticsTask) => {
    setReturnToTask(selectedTask);
    setSelectedTask(null);
    closeTaskParam();
    setEditingTask(task);
    taskFormHandlers.open();
  };

  const closeTaskForm = () => {
    taskFormHandlers.close();
    setEditingTask(null);
    if (returnToTask) {
      setSelectedTask(returnToTask);
      openTaskParam(returnToTask.task_id);
      setReturnToTask(null);
    }
  };

  const openTask = (task: LogisticsTask) => {
    setSelectedTask(task);
    openTaskParam(task.task_id);
  };

  const closeTaskDetail = () => {
    setSelectedTask(null);
    setEditingTask(null);
    setReturnToTask(null);
    taskFormHandlers.close();
    closeTaskParam();
  };

  const onTaskSaved = (saved: LogisticsTask) => {
    taskFormHandlers.close();
    setEditingTask(null);
    setReturnToTask(null);
    setSelectedTask(saved);
    openTaskParam(saved.task_id);
  };

  return {
    closeRequestToken,
    closeTaskDetail,
    closeTaskForm,
    editingTask,
    focusedTask,
    onTaskSaved,
    openCreateTask,
    openEditTask,
    openTask,
    requestTaskFormClose,
    selectedTask,
    setSelectedTask,
    taskFormOpened,
  };
}
