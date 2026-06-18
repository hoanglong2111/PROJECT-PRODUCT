import { Alert, Badge, Checkbox, Group, Loader, Paper, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchGlobalPoStageTasks, updatePoStageTask } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@entities/logistics';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

export function Gd1PoTasksBoard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const tasksQuery = useQuery({
    queryKey: queryKeys.globalPoStageTasks,
    queryFn: fetchGlobalPoStageTasks,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updatePoStageTask(taskId, { status }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.globalPoStageTasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
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
      <Alert color="red" title={t('tasks.loadError')}>
        {getApiErrorMessage(tasksQuery.error)}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md">
          <TextInput
            placeholder={t('tasks.poChecklistSearch')}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={16} />}
          />
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val || 'all')}
            data={[
              { label: t('tasks.allPoStatuses'), value: 'all' },
              { label: t('tasks.pendingStatus') + ' (PENDING)', value: 'PENDING' },
              { label: t('tasks.inProgressStatus') + ' (IN_PROGRESS)', value: 'IN_PROGRESS' },
              { label: t('tasks.doneStatus') + ' (DONE)', value: 'DONE' },
            ]}
          />
        </Group>
      </Paper>

      {tasksQuery.isLoading ? (
        <Group justify="center" p="xl">
          <Loader size="md" />
          <Text c="dimmed">{t('tasks.loadingChecklist')}</Text>
        </Group>
      ) : filteredTasks.length === 0 ? (
        <EmptyState title={t('tasks.noChecklistFound')} description={t('tasks.noChecklistDesc')} />
      ) : (
        <Paper withBorder p="0" style={{ overflow: 'hidden' }}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}></Table.Th>
                <Table.Th>{t('tasks.poChecklistTask')}</Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('tasks.poNumber')} hint={t('glossary.po')} />
                </Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('tasks.poStage')} hint={t('glossary.poStage')} />
                </Table.Th>
                <Table.Th>{t('tasks.assignedRole')}</Table.Th>
                <Table.Th>{t('tasks.dueCompletion')}</Table.Th>
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
                          {t('tasks.notePrefix')}{task.note}
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
