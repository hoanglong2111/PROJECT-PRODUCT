import {
  ActionIcon,
  Alert,
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
  Tabs,
  Checkbox,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle, IconChecklist, IconClock, IconEye, IconGitBranch, IconSearch, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getApiErrorMessage } from '@shared/api/http';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@shared/components/EntityLink';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { UpdateTaskProgressForm } from '@shared/components/UpdateOrderForms';
import {
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  type BusinessFlowTag,
  type LogisticsTask,
  type TaskRole,
  type TaskStatus,
  fetchGlobalPoStageTasks,
  updatePoStageTask,
  type Gd1PoStageTask,
} from '@shared/api/logistics';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

const priorityColor = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
} as const;

function Gd1PoTasksBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tasksQuery = useQuery({
    queryKey: ['po-stage-tasks'],
    queryFn: fetchGlobalPoStageTasks,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updatePoStageTask(taskId, { status }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['po-stage-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ]);
    },
  });

  const tasks = tasksQuery.data ?? [];

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const matchesSearch =
        task.task_name.toLowerCase().includes(normalizedSearch) ||
        task.purchase_order_id.toLowerCase().includes(normalizedSearch) ||
        task.assignee_id.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tasks]);

  if (tasksQuery.isError) {
    return (
      <Alert color="red" title="Lỗi tải danh sách checklist">
        {getApiErrorMessage(tasksQuery.error)}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md">
          <TextInput
            placeholder="Tìm theo tên task, số PO hoặc vai trò..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={16} />}
          />
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val || 'all')}
            data={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Chưa làm (PENDING)', value: 'PENDING' },
              { label: 'Đang làm (IN_PROGRESS)', value: 'IN_PROGRESS' },
              { label: 'Hoàn thành (DONE)', value: 'DONE' },
            ]}
          />
        </Group>
      </Paper>

      {tasksQuery.isLoading ? (
        <Group justify="center" p="xl">
          <Loader size="md" />
          <Text c="dimmed">Đang tải danh sách checklist...</Text>
        </Group>
      ) : filteredTasks.length === 0 ? (
        <EmptyState title="Không tìm thấy công việc nào" description="Không có công việc checklist PO nào khớp với bộ lọc của bạn." />
      ) : (
        <Paper withBorder p="0" style={{ overflow: 'hidden' }}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}></Table.Th>
                <Table.Th>Công việc checklist PO</Table.Th>
                <Table.Th>Mã PO</Table.Th>
                <Table.Th>Chặng</Table.Th>
                <Table.Th>Vai trò</Table.Th>
                <Table.Th>Hạn hoàn thành</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredTasks.map((task) => {
                const isCompleted = task.status === 'DONE';
                return (
                  <Table.Tr
                    key={task.id}
                    style={{ backgroundColor: isCompleted ? 'rgba(46, 125, 50, 0.02)' : undefined }}
                  >
                    <Table.Td>
                      <Checkbox
                        checked={isCompleted}
                        onChange={(e) =>
                          completeMutation.mutate({
                            taskId: task.id,
                            status: e.currentTarget.checked ? 'DONE' : 'PENDING',
                          })
                        }
                        color="teal"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} size="sm" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {task.task_name}
                      </Text>
                      {task.note && (
                        <Text size="xs" c="dimmed" fs="italic">
                          Ghi chú: {task.note}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <EntityLink type="po" id={task.purchase_order_id} />
                    </Table.Td>
                    <Table.Td>
                      <Badge color="gray" variant="light">
                        {task.po_stage}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {task.assignee_id}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" className="tabular-nums">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}

export function Tasks() {
  const { flowTagLabel, priorityLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const { value: focusedDo } = useEntityParam('do');
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
  const deliveryOrderFlowTagsByNumber = useMemo(
    () => new Map(deliveryOrders.map((order) => [order.order_info.order_number, order.flow_tags])),
    [deliveryOrders],
  );

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
      const matchesFlowContext = !focusedDo || task.do_number === focusedDo;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesRole = roleFilter === 'all' || task.role === roleFilter;
      const matchesRequired = !requiredOnly || task.is_required_for_do_closure;
      const parentFlowTags = deliveryOrderFlowTagsByNumber.get(task.do_number) ?? [];
      const matchesFlow = flowFilter === 'all' || parentFlowTags.includes(flowFilter);
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

      return matchesFlowContext && matchesStatus && matchesRole && matchesRequired && matchesFlow && matchesSearch;
    });
  }, [deliveryOrderFlowTagsByNumber, flowFilter, focusedDo, requiredOnly, roleFilter, search, statusFilter, tasks]);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleTasks,
  } = useListPagination(filteredTasks, [flowFilter, focusedDo, requiredOnly, roleFilter, search, statusFilter]);

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
            {focusedDo ? (
              <Paper withBorder p="md" className="flow-context">
                <Group justify="space-between">
                  <Text size="sm">
                    {t('tasks.context', { kind: 'DO', id: focusedDo })}
                  </Text>
                  <Button
                    component={Link}
                    to={`/workflow?do=${focusedDo}`}
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
              <Metric label={t('tasks.totalTasks')} value={tasks.length} color="blue" icon={<IconChecklist size={22} />} />
              <Metric label={t('tasks.blocked')} value={blockedCount} color="red" icon={<IconAlertTriangle size={22} />} />
              <Metric label={t('tasks.overdue')} value={overdueCount} color="orange" icon={<IconClock size={22} />} />
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
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1320} verticalSpacing="sm" highlightOnHover>
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
                    {visibleTasks.map((task) => (
                      <Table.Tr key={task.task_id}>
                        <Table.Td className="table-cell-truncate" style={{ maxWidth: '20rem' }}>
                          <Text fw={700} lineClamp={1} title={task.task_name}>{task.task_name}</Text>
                          <Text size="xs" c="dimmed">
                            {task.task_id}
                          </Text>
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
        {selectedTask ? <TaskDetail task={selectedTask} onUpdated={setSelectedTask} /> : null}
      </Drawer>
    </Stack>
  );
}

function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} style={{ lineHeight: 1.1 }}>
            {value}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
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
            {task.do_number}
          </Text>
        </div>
        <StatusBadge status={task.status} />
      </Group>

      <Group gap="xs">
        <EntityLink type="do" id={task.do_number} />
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
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
