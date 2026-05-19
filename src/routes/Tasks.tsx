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
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconEye, IconGitBranch, IconSearch, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/EmptyState';
import { EntityLink } from '../components/EntityLink';
import { PageError, PageLoading } from '../components/PageFeedback';
import { StatusBadge } from '../components/StatusBadge';
import { UpdateTaskProgressForm } from '../components/UpdateOrderForms';
import {
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  type BusinessFlowTag,
  type LogisticsTask,
  type TaskRole,
  type TaskStatus,
} from '../api/logistics';
import { useEntityParam } from '../hooks/useEntityParam';
import { useI18n } from '../i18n';
import { useWorkspaceStore } from '../stores/workspaceStore';

const priorityColor = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
} as const;

export function Tasks() {
  const { flowTagLabel, priorityLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const { value: focusedDo } = useEntityParam('do');
  const { value: focusedPr } = useEntityParam('pr');
  const { close: closeTaskParam, open: openTaskParam, value: focusedTask } = useEntityParam('task');
  const [selectedTask, setSelectedTask] = useState<LogisticsTask | null>(null);
  const search = useWorkspaceStore((state) => state.taskSearch);
  const statusFilter = useWorkspaceStore((state) => state.taskStatusFilter);
  const roleFilter = useWorkspaceStore((state) => state.taskRoleFilter);
  const requiredOnly = useWorkspaceStore((state) => state.taskRequiredOnly);
  const flowFilter = useWorkspaceStore((state) => state.taskFlowFilter);
  const setSearch = useWorkspaceStore((state) => state.setTaskSearch);
  const setStatusFilter = useWorkspaceStore((state) => state.setTaskStatusFilter);
  const setRoleFilter = useWorkspaceStore((state) => state.setTaskRoleFilter);
  const setRequiredOnly = useWorkspaceStore((state) => state.setTaskRequiredOnly);
  const setFlowFilter = useWorkspaceStore((state) => state.setTaskFlowFilter);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchLogisticsTasks,
  });
  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const tasks = tasksQuery.data ?? [];
  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const isFetching = tasksQuery.isFetching;

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
        (!focusedDo || task.do_number === focusedDo) && (!focusedPr || task.request_code === focusedPr);
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesRole = roleFilter === 'all' || task.role === roleFilter;
      const matchesRequired = !requiredOnly || task.is_required_for_do_closure;
      const parentDeliveryOrder = deliveryOrders.find((order) => order.order_info.order_number === task.do_number);
      const matchesFlow = flowFilter === 'all' || Boolean(parentDeliveryOrder?.flow_tags.includes(flowFilter));
      const matchesSearch = [
        task.task_id,
        task.task_name,
        task.do_number,
        task.request_code,
        task.po_number,
        task.assignee.name,
        task.production_contract_number,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesFlowContext && matchesStatus && matchesRole && matchesRequired && matchesFlow && matchesSearch;
    });
  }, [deliveryOrders, flowFilter, focusedDo, focusedPr, requiredOnly, roleFilter, search, statusFilter, tasks]);

  const today = dayjs().startOf('day');
  const isOverdue = (task: LogisticsTask) => task.status !== 'COMPLETED' && dayjs(task.due_date).isBefore(today, 'day');
  const blockedCount = tasks.filter((task) => task.status === 'BLOCKED').length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((task) => task.status === 'COMPLETED').length / tasks.length) * 100) : 0;

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
        <Badge leftSection={<IconUserCheck size={14} />} size="lg" variant="light">
          {t('tasks.completionBadge', { percent: completionRate })}
        </Badge>
      </Group>

      {focusedDo || focusedPr ? (
        <Paper withBorder p="md" className="flow-context">
          <Group justify="space-between">
            <Text size="sm">
              {t('tasks.context', { kind: focusedDo ? 'DO' : 'PR', id: focusedDo ?? focusedPr })}
            </Text>
            <Button
              component={Link}
              to={`/workflow?${focusedDo ? `do=${focusedDo}` : `pr=${focusedPr}`}`}
              size="xs"
              variant="light"
              leftSection={<IconGitBranch size={14} />}
            >
              {t('purchaseRequests.openFlow')}
            </Button>
          </Group>
        </Paper>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('tasks.totalTasks')} value={tasks.length} />
        <Metric label={t('tasks.blocked')} value={blockedCount} color="red" />
        <Metric label={t('tasks.overdue')} value={overdueCount} color="orange" />
      </SimpleGrid>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 6 }}>
          <TextInput
            label={t('common.search')}
            placeholder={t('tasks.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label={t('common.status')}
            value={statusFilter}
            onChange={(value) => setStatusFilter((value ?? 'all') as TaskStatus | 'all')}
            data={[
              { label: t('common.allStatuses'), value: 'all' },
              { label: statusLabel('TODO'), value: 'TODO' },
              { label: statusLabel('IN_PROGRESS'), value: 'IN_PROGRESS' },
              { label: statusLabel('WAITING'), value: 'WAITING' },
              { label: statusLabel('BLOCKED'), value: 'BLOCKED' },
              { label: statusLabel('COMPLETED'), value: 'COMPLETED' },
              { label: statusLabel('CANCELLED'), value: 'CANCELLED' },
            ]}
          />
          <Select
            label={t('common.role')}
            value={roleFilter}
            onChange={(value) => setRoleFilter((value ?? 'all') as TaskRole | 'all')}
            data={[
              { label: t('common.allRoles'), value: 'all' },
              { label: taskRoleLabel('PIC Manager'), value: 'PIC Manager' },
              { label: taskRoleLabel('Sale Staff'), value: 'Sale Staff' },
              { label: taskRoleLabel('Port Officer'), value: 'Port Officer' },
              { label: taskRoleLabel('Customs Officer'), value: 'Customs Officer' },
              { label: taskRoleLabel('Finance Officer'), value: 'Finance Officer' },
              { label: taskRoleLabel('Warehouse Staff'), value: 'Warehouse Staff' },
            ]}
          />
          <Select
            label={t('common.flow')}
            value={flowFilter}
            onChange={(value) => setFlowFilter((value ?? 'all') as BusinessFlowTag | 'all')}
            data={[
              { label: t('common.all'), value: 'all' },
              { label: flowTagLabel('LINEAR'), value: 'LINEAR' },
              { label: flowTagLabel('BULK_PURCHASE'), value: 'BULK_PURCHASE' },
              { label: flowTagLabel('SPLIT_PURCHASE'), value: 'SPLIT_PURCHASE' },
              { label: flowTagLabel('PARTIAL_DELIVERY'), value: 'PARTIAL_DELIVERY' },
              { label: flowTagLabel('CONTAINER_CONSOLIDATION'), value: 'CONTAINER_CONSOLIDATION' },
            ]}
          />
          <Switch
            className="filter-switch"
            checked={requiredOnly}
            onChange={(event) => setRequiredOnly(event.currentTarget.checked)}
            label={t('tasks.filterRequiredOnly')}
          />
          <Group className="filter-actions" gap="xs">
            {isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: filteredTasks.length })}
            </Text>
          </Group>
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0}>
        <ScrollArea>
          <Table miw={1160} verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('common.task')}</Table.Th>
                <Table.Th>DO</Table.Th>
                <Table.Th>{t('common.role')}</Table.Th>
                <Table.Th>{t('common.assignee')}</Table.Th>
                <Table.Th>{t('forms.priority')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th>{t('tasks.progress')}</Table.Th>
                <Table.Th>{t('tasks.dueDate')}</Table.Th>
                <Table.Th>{t('common.blocker')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTasks.map((task) => (
                <Table.Tr key={task.task_id}>
                  <Table.Td>
                    <Text fw={700}>{task.task_name}</Text>
                    <Text size="xs" c="dimmed">
                      {task.task_id}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {task.do_number}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {task.request_code}
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
                  <Table.Td>
                    {task.blocked_reason ? (
                      <Badge color="red">{task.blocked_reason}</Badge>
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
        {filteredTasks.length === 0 ? (
          <EmptyState title={t('tasks.emptyTitle')} description={t('tasks.emptyDescription')} />
        ) : null}
      </Paper>

      <Drawer opened={Boolean(focusedTask && selectedTask)} onClose={closeDrawer} title={t('tasks.detailTitle')} position="right" size="lg">
        {selectedTask ? <TaskDetail task={selectedTask} onUpdated={setSelectedTask} /> : null}
      </Drawer>
    </Stack>
  );
}

function Metric({ color = 'blue', label, value }: { color?: string; label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2} c={color}>
        {value}
      </Title>
    </Paper>
  );
}

function TaskDetail({ onUpdated, task }: { onUpdated?: (task: LogisticsTask) => void; task: LogisticsTask }) {
  const { priorityLabel, t, taskRoleLabel } = useI18n();

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>{task.task_name}</Title>
          <Text c="dimmed">
            {task.do_number} - {task.request_code}
          </Text>
        </div>
        <StatusBadge status={task.status} />
      </Group>

      <Group gap="xs">
        <EntityLink type="workflow" id={task.do_number} />
        <EntityLink type="do" id={task.do_number} />
        <EntityLink type="pr" id={task.request_code} />
        <EntityLink type="po" id={task.po_number} />
      </Group>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="xs">
          <Text fw={700}>{t('tasks.progress')}</Text>
          <Text fw={700}>{task.progress}%</Text>
        </Group>
        <Progress value={task.progress} color={task.progress === 100 ? 'teal' : 'blue'} />
      </Paper>

      <UpdateTaskProgressForm task={task} onUpdated={onUpdated} />

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Info label={t('common.role')} value={taskRoleLabel(task.role)} />
        <Info label={t('common.assignee')} value={`${task.assignee.name} - ${task.assignee.department}`} />
        <Info label={t('forms.priority')} value={priorityLabel(task.priority)} />
        <Info label={t('tasks.dueDate')} value={task.due_date} />
        <Info label="PO" value={task.po_number ?? '-'} />
        <Info label={t('tasks.requiredForClosure')} value={task.is_required_for_do_closure ? t('common.yes') : t('common.no')} />
      </SimpleGrid>

      {task.blocked_reason ? (
        <Paper withBorder p="md" className="risk-panel">
          <Text fw={700}>{t('tasks.blockedReason')}</Text>
          <Text size="sm">{task.blocked_reason}</Text>
        </Paper>
      ) : null}

      <Paper withBorder p="md">
        <Text fw={700} mb={6}>
          {t('common.notes')}
        </Text>
        <Text size="sm">{task.notes}</Text>
      </Paper>
    </Stack>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
