import { ActionIcon, Badge, Group, Paper, Progress, ScrollArea, Table, Text, Tooltip } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';

import type { LogisticsTask } from '@shared/api/logistics';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination, type useListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { departmentLabel, milestoneLabel, priorityColor } from '../model/tasksModel';

/** The paginated closure-tasks table with the per-row detail action. */
export function TaskListTable({
  focusedTaskId,
  isOverdue,
  onOpenTask,
  pagination,
  selectedTaskId,
  total,
  visibleTasks,
}: {
  focusedTaskId: string | null;
  isOverdue: (task: LogisticsTask) => boolean;
  onOpenTask: (task: LogisticsTask) => void;
  pagination: Pick<ReturnType<typeof useListPagination>, 'page' | 'pageCount' | 'pageEnd' | 'pageStart' | 'setPage'>;
  selectedTaskId: string | null;
  total: number;
  visibleTasks: LogisticsTask[];
}) {
  const { priorityLabel, t } = useI18n();

  return (
    <Paper withBorder p={0} className="dl-data-panel">
      <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={1320} verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('common.task')}</Table.Th>
              <Table.Th>
                <HeaderLabel label="DO" hint={t('glossary.do')} />
              </Table.Th>
              <Table.Th>{t('tasks.department')}</Table.Th>
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
              <Table.Tr
                key={task.task_id}
                className="task-list-row"
                data-selected={(selectedTaskId === task.task_id || focusedTaskId === task.task_id) || undefined}
                data-overdue={isOverdue(task) || undefined}
              >
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
                <Table.Td>
                  <Badge size="sm" variant="light" color="blue">{departmentLabel(task.department)}</Badge>
                  <Text size="sm" fw={600}>
                    {task.assignee_code ?? '-'} · {task.assignee.name}
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
                  <Progress value={task.progress} color={task.progress === 100 ? 'teal' : 'blue'} size="xs" mb={4} />
                  <Text size="xs" c="dimmed" className="tabular-nums">
                    {task.progress}%
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text className="task-due-date" c={isOverdue(task) ? 'red' : undefined}>
                    {task.due_date}
                  </Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                  {task.blocked_reason || task.blocked_by_party ? (
                    <Group gap={4} wrap="wrap">
                      {task.blocked_by_party ? (
                        <Badge color="red" variant="filled" size="sm">
                          {t(`tasks.blockedBy.${task.blocked_by_party}`)}
                        </Badge>
                      ) : null}
                      {task.blocked_reason ? (
                        <Badge color="red" variant="light" size="sm" title={task.blocked_reason}>{task.blocked_reason}</Badge>
                      ) : null}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">
                      -
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Tooltip label={t('tasks.openDetail')}>
                    <ActionIcon variant="subtle" aria-label={t('tasks.openDetail')} onClick={() => onOpenTask(task)}>
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
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageEnd={pagination.pageEnd}
        pageStart={pagination.pageStart}
        setPage={pagination.setPage}
        total={total}
      />
      {total === 0 ? (
        <EmptyState title={t('tasks.emptyTitle')} description={t('tasks.emptyDescription')} />
      ) : null}
    </Paper>
  );
}
