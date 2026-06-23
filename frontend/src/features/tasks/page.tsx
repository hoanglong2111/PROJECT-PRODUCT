import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  Tabs,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconChecklist, IconClock, IconEye, IconGitBranch, IconPlus, IconSearch, IconUserCheck, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import {
  fetchLogisticsTasks,
  type LogisticsTask,
  type Priority,
  type TaskRole,
  type TaskStatus,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';
import { MILESTONE_CODES } from '@shared/api/taskTemplates';
import { departmentLabel, milestoneLabel, priorityColor } from './model/tasksModel';
import { useTasksUiStore } from './model/tasksUiStore';
import { Gd1PoTasksBoard } from './components/Gd1PoTasksBoard';
import { Metric } from './components/Metric';
import { TaskDetail } from './components/TaskDetail';
import { TaskFormModal } from './components/TaskFormModal';

export function Tasks() {
  const { priorityLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const today = dayjs().startOf('day');
  const isOverdue = (task: LogisticsTask) => task.status !== 'COMPLETED' && dayjs(task.due_date).isBefore(today, 'day');
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const focusedPo = searchParams.get('po');
  const { value: focusedDo } = useEntityParam('do');
  const focusedContext = focusedPo || focusedDo;
  const { close: closeTaskParam, open: openTaskParam, value: focusedTask } = useEntityParam('task');
  const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
  const [taskFormOpened, taskFormHandlers] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<LogisticsTask | null>(null);
  const openCreateTask = () => {
    setEditingTask(null);
    taskFormHandlers.open();
  };
  const openEditTask = (task: LogisticsTask) => {
    setEditingTask(task);
    taskFormHandlers.open();
  };
  const search = useTasksUiStore((s) => s.search);
  const statusFilter = useTasksUiStore((s) => s.statusFilter);
  const roleFilter = useTasksUiStore((s) => s.roleFilter);
  const priorityFilter = useTasksUiStore((s) => s.priorityFilter);
  const milestoneFilter = useTasksUiStore((s) => s.milestoneFilter);
  const requiredOnly = useTasksUiStore((s) => s.requiredOnly);
  const overdueOnly = useTasksUiStore((s) => s.overdueOnly);
  const setSearch = useTasksUiStore((s) => s.setSearch);
  const setStatusFilter = useTasksUiStore((s) => s.setStatusFilter);
  const setRoleFilter = useTasksUiStore((s) => s.setRoleFilter);
  const setPriorityFilter = useTasksUiStore((s) => s.setPriorityFilter);
  const setMilestoneFilter = useTasksUiStore((s) => s.setMilestoneFilter);
  const setRequiredOnly = useTasksUiStore((s) => s.setRequiredOnly);
  const setOverdueOnly = useTasksUiStore((s) => s.setOverdueOnly);

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: fetchLogisticsTasks,
  });
  const tasks = tasksQuery.data ?? [];
  const isFetching = tasksQuery.isFetching;

  useEffect(() => {
    if (roleParam) {
      setRoleFilter(roleParam as any);
    }
  }, [roleParam, setRoleFilter]);

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
      const matchesRequired = !requiredOnly || task.is_required_for_do_closure;
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
        matchesRequired &&
        matchesOverdue &&
        matchesSearch
      );
    });
  }, [focusedContext, isOverdue, milestoneFilter, overdueOnly, priorityFilter, requiredOnly, roleFilter, search, statusFilter, tasks]);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleTasks,
  } = useListPagination(filteredTasks, [focusedContext, milestoneFilter, overdueOnly, priorityFilter, requiredOnly, roleFilter, search, statusFilter]);

  const clearFilters = useTasksUiStore((s) => s.clearFilters);

  const blockedCount = tasks.filter((task) => task.status === 'BLOCKED').length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((task) => task.status === 'COMPLETED').length / tasks.length) * 100) : 0;
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    priorityFilter !== 'all' ||
    milestoneFilter !== 'all' ||
    requiredOnly ||
    overdueOnly;
  const statusOptions: Array<{ label: string; value: TaskStatus | 'all' }> = [
    { label: t('common.allStatuses'), value: 'all' },
    { label: statusLabel('PENDING'), value: 'PENDING' },
    { label: statusLabel('TODO'), value: 'TODO' },
    { label: statusLabel('IN_PROGRESS'), value: 'IN_PROGRESS' },
    { label: statusLabel('WAITING'), value: 'WAITING' },
    { label: statusLabel('BLOCKED'), value: 'BLOCKED' },
    { label: statusLabel('COMPLETED'), value: 'COMPLETED' },
    { label: statusLabel('CANCELLED'), value: 'CANCELLED' },
  ];
  const roleOptions: Array<{ label: string; value: TaskRole | 'all' }> = [
    { label: t('common.allRoles'), value: 'all' },
    { label: taskRoleLabel('BUYER'), value: 'BUYER' },
    { label: taskRoleLabel('LOGISTICS_PLANNER'), value: 'LOGISTICS_PLANNER' },
    { label: taskRoleLabel('PIC_MANAGER'), value: 'PIC_MANAGER' },
    { label: taskRoleLabel('PORT_OFFICER'), value: 'PORT_OFFICER' },
    { label: taskRoleLabel('CUSTOMS_OFFICER'), value: 'CUSTOMS_OFFICER' },
    { label: taskRoleLabel('WAREHOUSE_STAFF'), value: 'WAREHOUSE_STAFF' },
    { label: taskRoleLabel('PIC Manager'), value: 'PIC Manager' },
    { label: taskRoleLabel('Sale Staff'), value: 'Sale Staff' },
    { label: taskRoleLabel('Port Officer'), value: 'Port Officer' },
    { label: taskRoleLabel('Customs Officer'), value: 'Customs Officer' },
    { label: taskRoleLabel('Finance Officer'), value: 'Finance Officer' },
    { label: taskRoleLabel('Warehouse Staff'), value: 'Warehouse Staff' },
  ];
  const priorityOptions: Array<{ label: string; value: Priority | 'all' }> = [
    { label: t('tasks.allPriorities'), value: 'all' },
    { label: priorityLabel('URGENT'), value: 'URGENT' },
    { label: priorityLabel('HIGH'), value: 'HIGH' },
    { label: priorityLabel('MEDIUM'), value: 'MEDIUM' },
    { label: priorityLabel('LOW'), value: 'LOW' },
  ];
  const milestoneOptions = [
    { label: t('common.all'), value: 'all' },
    ...Object.entries(MILESTONE_CODES).map(([value, label]) => ({ label, value })),
  ];
  const statusCounts = statusOptions.reduce<Record<string, number>>((acc, option) => {
    acc[option.value] = option.value === 'all' ? tasks.length : tasks.filter((task) => task.status === option.value).length;
    return acc;
  }, {});

  const openTask = (task: LogisticsTask) => {
    setSelectedTask(task);
    openTaskParam(task.task_id);
  };

  const closeDrawer = () => {
    setSelectedTask(null);
    closeTaskParam();
  };

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
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('tasks.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('tasks.subtitle')}
          </Text>
        </div>
        <Group gap="sm">
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateTask}>
            {t('tasks.createTask')}
          </Button>
          <Badge leftSection={<IconUserCheck size={14} />} size="lg" variant="light">
            {t('tasks.completionBadge', { percent: completionRate })}
          </Badge>
        </Group>
      </Group>

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
              <Paper withBorder p="md" className="flow-context">
                <Group justify="space-between">
                  <Text size="sm">
                    {t('tasks.context', { kind: 'PO', id: focusedContext })}
                  </Text>
                  <Button component={Link} to={`/purchase-orders?po=${focusedContext}`} size="xs" variant="light">
                    {t('entityLink.openPo')}
                  </Button>
                </Group>
              </Paper>
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Metric label={t('tasks.totalTasks')} value={tasks.length} color="blue" icon={<IconChecklist size={22} />} />
              <Metric label={t('tasks.blocked')} value={blockedCount} color="red" icon={<IconAlertTriangle size={22} />} />
              <Metric label={t('tasks.overdue')} value={overdueCount} color="orange" icon={<IconClock size={22} />} />
            </SimpleGrid>

            <Paper withBorder p="md" className="tasks-filter-panel">
              <Stack gap="md">
                <Group className="tasks-filter-primary" justify="space-between" align="flex-end" gap="md">
                  <TextInput
                    className="tasks-filter-search"
                    label={t('common.search')}
                    placeholder={t('tasks.searchPlaceholder')}
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                  />
                  <Group className="tasks-filter-actions" gap="xs" wrap="nowrap">
                    {isFetching ? <Loader size="sm" /> : null}
                    <Text className="tasks-filter-count" size="sm" c="dimmed">
                      {t('common.shown', { count: filteredTasks.length })}
                    </Text>
                    <Button
                      variant={hasActiveFilters ? 'light' : 'subtle'}
                      size="compact-sm"
                      leftSection={<IconX size={16} />}
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      {t('common.clear')}
                    </Button>
                  </Group>
                </Group>

                <ScrollArea className="tasks-status-scroll" type="never" offsetScrollbars scrollbarSize={6}>
                  <Group className="tasks-status-strip" gap="xs" wrap="nowrap">
                    {statusOptions.map((option) => (
                      <Button
                        key={option.value}
                        className={`tasks-status-pill ${statusFilter === option.value ? 'is-active' : ''}`}
                        variant={statusFilter === option.value ? 'light' : 'subtle'}
                        color={option.value === 'BLOCKED' ? 'red' : option.value === 'COMPLETED' ? 'teal' : undefined}
                        size="compact-sm"
                        onClick={() => setStatusFilter(option.value)}
                        aria-pressed={statusFilter === option.value}
                        rightSection={
                          <Badge size="xs" variant={statusFilter === option.value ? 'filled' : 'light'}>
                            {statusCounts[option.value]}
                          </Badge>
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </Group>
                </ScrollArea>

                <SimpleGrid className="tasks-filter-secondary" cols={{ base: 1, sm: 2, lg: 4 }}>
                  <Select
                    label={t('common.role')}
                    value={roleFilter}
                    onChange={(value) => setRoleFilter((value ?? 'all') as TaskRole | 'all')}
                    data={roleOptions}
                  />
                  <Select
                    label={t('forms.priority')}
                    value={priorityFilter}
                    onChange={(value) => setPriorityFilter((value ?? 'all') as Priority | 'all')}
                    data={priorityOptions}
                  />
                  <Select
                    label={t('tasks.milestone')}
                    value={milestoneFilter}
                    onChange={(value) => setMilestoneFilter(value ?? 'all')}
                    data={milestoneOptions}
                  />
                  <Group className="tasks-filter-toggles" gap="xs" wrap="nowrap">
                    <Button
                      className="tasks-filter-toggle"
                      variant={requiredOnly ? 'light' : 'subtle'}
                      color={requiredOnly ? 'blue' : 'gray'}
                      onClick={() => setRequiredOnly(!requiredOnly)}
                      aria-pressed={requiredOnly}
                    >
                      {t('tasks.filterRequiredOnly')}
                    </Button>
                    <Button
                      className="tasks-filter-toggle"
                      variant={overdueOnly ? 'light' : 'subtle'}
                      color={overdueOnly ? 'orange' : 'gray'}
                      onClick={() => setOverdueOnly(!overdueOnly)}
                      aria-pressed={overdueOnly}
                    >
                      {t('tasks.filterOverdueOnly')}
                    </Button>
                  </Group>
                </SimpleGrid>
              </Stack>
            </Paper>

            <Paper withBorder p={0}>
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1320} verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('common.task')}</Table.Th>
                      <Table.Th>
                        <HeaderLabel label="DO" hint={t('glossary.do')} />
                      </Table.Th>
                      <Table.Th>{t('common.role')}</Table.Th>
                      <Table.Th>{t('common.assignee')}</Table.Th>
                      <Table.Th>{t('forms.priority')}</Table.Th>
                      <Table.Th>{t('common.status')}</Table.Th>
                      <Table.Th>{t('tasks.progress')}</Table.Th>
                      <Table.Th>{t('tasks.dueDate')}</Table.Th>
                      <Table.Th>
                        <HeaderLabel label={t('common.blocker')} hint={t('glossary.blocker')} />
                      </Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visibleTasks.map((task) => (
                      <Table.Tr key={task.task_id}>
                        <Table.Td className="table-cell-truncate" style={{ maxWidth: '20rem' }}>
                          <Text fw={700} lineClamp={1} title={task.task_name}>{task.task_name}</Text>
                          <Group gap={6} mt={2}>
                            <Text size="xs" c="dimmed">
                              {task.task_id}
                            </Text>
                            {task.template?.milestone_code ? (
                              <Badge size="xs" variant="light" color="grape">
                                {milestoneLabel(task.template.milestone_code)}
                              </Badge>
                            ) : null}
                            {task.template?.department ? (
                              <Badge size="xs" variant="light" color="blue">
                                {departmentLabel(task.template.department)}
                              </Badge>
                            ) : null}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {task.do_number}
                          </Text>
                        </Table.Td>
                        <Table.Td>{taskRoleLabel(task.role)}</Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {task.assignee.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {task.assignee.department}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={priorityColor[task.priority]} variant="light">
                            {priorityLabel(task.priority)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <StatusBadge status={task.status} />
                        </Table.Td>
                        <Table.Td>
                          <Progress value={task.progress} color={task.progress === 100 ? 'teal' : 'blue'} size="sm" mb={4} />
                          <Text size="xs" c="dimmed">
                            {task.progress}%
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c={isOverdue(task) ? 'red' : undefined}>
                            {task.due_date}
                          </Text>
                        </Table.Td>
                        <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                          {task.blocked_reason ? (
                            <Badge color="red" title={task.blocked_reason}>{task.blocked_reason}</Badge>
                          ) : (
                            <Text size="sm" c="dimmed">
                              -
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={t('tasks.openDetail')}>
                            <ActionIcon variant="subtle" aria-label={t('tasks.openDetail')} onClick={() => openTask(task)}>
                              <IconEye size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              <ListPagination
                page={page}
                pageCount={pageCount}
                pageEnd={pageEnd}
                pageStart={pageStart}
                setPage={setPage}
                total={filteredTasks.length}
              />
              {filteredTasks.length === 0 ? (
                <EmptyState title={t('tasks.emptyTitle')} description={t('tasks.emptyDescription')} />
              ) : null}
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="po_checkpoints">
          <Gd1PoTasksBoard />
        </Tabs.Panel>
      </Tabs>

      <Drawer opened={Boolean(focusedTask && selectedTask)} onClose={closeDrawer} title={t('tasks.detailTitle')} position="right" size="lg">
        {selectedTask ? <TaskDetail task={selectedTask} onUpdated={setSelectedTask} onEdit={openEditTask} /> : null}
      </Drawer>

      <TaskFormModal
        editing={editingTask}
        opened={taskFormOpened}
        onClose={taskFormHandlers.close}
        onSaved={(saved) => setSelectedTask((current) => (current && current.task_id === saved.task_id ? saved : current))}
      />
    </Stack>
  );
}
