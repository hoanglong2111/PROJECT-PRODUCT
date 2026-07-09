import { ActionIcon, Badge, Button, Drawer, Group, SimpleGrid, Stack, Tabs } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAlertTriangle, IconArrowLeft, IconChecklist, IconClock, IconGitBranch, IconPlus, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchLogisticsTasks, type LogisticsTask } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { FlowContextBanner } from '@shared/components/FlowContextBanner';
import { useListPagination } from '@shared/components/ListPagination';
import { Metric } from '@shared/components/Metric';
import { ModalTitle } from '@shared/components/ModalTitle';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { PageHeader } from '@shared/components/PageHeader';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import { Gd1PoTasksBoard } from './components/Gd1PoTasksBoard';
import { TaskDetail } from './components/TaskDetail';
import { TaskFormPanel } from './components/TaskFormPanel';
import { TaskListTable } from './components/TaskListTable';
import { TasksFilterPanel } from './components/TasksFilterPanel';
import { useTaskDrawers } from './hooks/useTaskDrawers';
import { useTasksUiStore } from './model/tasksUiStore';

export function Tasks() {
  const { t } = useI18n();
  const today = dayjs().startOf('day');
  const isOverdue = (task: LogisticsTask) => task.status !== 'COMPLETED' && dayjs(task.due_date).isBefore(today, 'day');
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const focusedPo = searchParams.get('po');
  const { value: focusedDo } = useEntityParam('do');
  const focusedContext = focusedPo || focusedDo;

  const search = useTasksUiStore((s) => s.search);
  const statusFilter = useTasksUiStore((s) => s.statusFilter);
  const roleFilter = useTasksUiStore((s) => s.roleFilter);
  const priorityFilter = useTasksUiStore((s) => s.priorityFilter);
  const milestoneFilter = useTasksUiStore((s) => s.milestoneFilter);
  const overdueOnly = useTasksUiStore((s) => s.overdueOnly);
  const setRoleFilter = useTasksUiStore((s) => s.setRoleFilter);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: fetchLogisticsTasks,
  });
  const tasks = tasksQuery.data ?? [];

  const drawers = useTaskDrawers(tasks);

  useEffect(() => {
    if (roleParam) {
      setRoleFilter(roleParam as any);
    }
  }, [roleParam, setRoleFilter]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesFlowContext =
        !focusedContext ||
        task.do_number === focusedContext ||
        task.po_number === focusedContext ||
        task.production_contract_number === focusedContext;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesRole = roleFilter === 'all' || task.role === roleFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesMilestone = milestoneFilter === 'all' || task.template?.milestone_code === milestoneFilter;
      const matchesOverdue = !overdueOnly || isOverdue(task);
      const matchesSearch = [
        task.task_id,
        task.task_name,
        task.do_number,
        task.po_number,
        task.assignee.name,
        task.production_contract_number,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      return (
        matchesFlowContext &&
        matchesStatus &&
        matchesRole &&
        matchesPriority &&
        matchesMilestone &&
        matchesOverdue &&
        matchesSearch
      );
    });
  }, [focusedContext, isOverdue, milestoneFilter, overdueOnly, priorityFilter, roleFilter, search, statusFilter, tasks]);

  const pagination = useListPagination(filteredTasks, [focusedContext, milestoneFilter, overdueOnly, priorityFilter, roleFilter, search, statusFilter]);

  const blockedCount = tasks.filter((task) => task.status === 'BLOCKED').length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((task) => task.status === 'COMPLETED').length / tasks.length) * 100) : 0;

  if (tasksQuery.isError) {
    return (
      <PageError
        title={t('tasks.errorTitle')}
        description={t('tasks.errorDescription')}
        error={tasksQuery.error}
        onRetry={() => {
          void tasksQuery.refetch();
        }}
      />
    );
  }

  if (tasksQuery.isLoading) {
    return (
      <PageLoading
        title={t('tasks.title')}
        description={t('tasks.loadingDescription')}
        tableColumns={[t('common.task'), 'DO', t('common.role'), t('common.assignee'), t('forms.priority'), t('common.status'), t('tasks.progress'), t('tasks.dueDate'), t('common.blocker')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        actions={
          <>
          <Button leftSection={<IconPlus size={16} />} onClick={drawers.openCreateTask}>
            {t('tasks.createTask')}
          </Button>
          <Badge leftSection={<IconUserCheck size={14} />} size="lg" variant="light">
            {t('tasks.completionBadge', { percent: completionRate })}
          </Badge>
          </>
        }
      />

      <Tabs defaultValue="closure">
        <Tabs.List mb="md">
          <Tabs.Tab value="closure" leftSection={<IconChecklist size={16} />}>
            {t('tasks.tabClosureTasks')}
          </Tabs.Tab>
          <Tabs.Tab value="po_checkpoints" leftSection={<IconGitBranch size={16} />}>
            {t('tasks.tabPoCheckpoints')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="closure">
          <Stack gap="lg">
            {focusedContext ? (
              <FlowContextBanner
                message={t('tasks.context', { kind: 'PO', id: focusedContext })}
                linkTo={`/purchase-orders?po=${focusedContext}`}
                linkLabel={t('entityLink.openPo')}
              />
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 3 }} className="dl-metrics-strip">
              <Metric label={t('tasks.totalTasks')} value={tasks.length} color="blue" icon={<IconChecklist size={22} />} />
              <Metric label={t('tasks.blocked')} value={blockedCount} color="red" icon={<IconAlertTriangle size={22} />} />
              <Metric label={t('tasks.overdue')} value={overdueCount} color="orange" icon={<IconClock size={22} />} />
            </SimpleGrid>

            <TasksFilterPanel
              filteredCount={filteredTasks.length}
              isFetching={tasksQuery.isFetching}
              tasks={tasks}
            />

            <TaskListTable
              focusedTaskId={drawers.focusedTask}
              isOverdue={isOverdue}
              onOpenTask={drawers.openTask}
              pagination={pagination}
              selectedTaskId={drawers.selectedTask?.task_id ?? null}
              total={filteredTasks.length}
              visibleTasks={pagination.visibleItems}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="po_checkpoints">
          <Gd1PoTasksBoard />
        </Tabs.Panel>
      </Tabs>

      <Drawer
        opened={drawers.taskFormOpened}
        onClose={drawers.requestTaskFormClose}
        position="right"
        size="60rem"
        withCloseButton={false}
        title={
          <Group gap="xs" wrap="nowrap">
            <ActionIcon variant="subtle" c="var(--kbfe-text-secondary)" aria-label={t('common.back')} onClick={drawers.requestTaskFormClose}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <ModalTitle
              feature="tasks"
              title={drawers.editingTask ? t('tasks.editTask') : t('tasks.createTask')}
              subtitle={drawers.editingTask?.task_id}
            />
          </Group>
        }
      >
        <TaskFormPanel
          editing={drawers.editingTask}
          opened={drawers.taskFormOpened}
          closeRequestToken={drawers.closeRequestToken}
          onClose={drawers.closeTaskForm}
          onSaved={drawers.onTaskSaved}
        />
      </Drawer>

      <Drawer
        opened={!!drawers.selectedTask}
        onClose={drawers.closeTaskDetail}
        position="right"
        size="60rem"
        title={
          <ModalTitle
            feature="tasks"
            title={drawers.selectedTask?.task_id}
            subtitle={drawers.selectedTask?.task_name}
          />
        }
      >
        {drawers.selectedTask && (
          <TaskDetail task={drawers.selectedTask} onUpdated={drawers.setSelectedTask} onEdit={drawers.openEditTask} />
        )}
      </Drawer>
    </Stack>
  );
}
