import { Badge, Button, Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { LogisticsTask } from '@shared/api/logistics';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { EntityLink, UpdateTaskProgressForm } from '@entities/logistics';
import { departmentLabel, milestoneLabel, templateSlaLabel } from '../model/tasksModel';

export function TaskDetail({
  onEdit,
  onUpdated,
  task,
}: {
  onEdit?: (task: LogisticsTask) => void;
  onUpdated?: (task: LogisticsTask) => void;
  task: LogisticsTask;
}) {
  const { priorityLabel, t, taskRoleLabel } = useI18n();
  const detailFacts: Array<{ label: ReactNode; value: ReactNode; tone?: 'attention' | 'neutral' }> = [
    { label: t('common.role'), value: taskRoleLabel(task.role) },
    { label: t('common.assignee'), value: `${task.assignee.name} - ${task.assignee.department}` },
    { label: t('forms.priority'), value: priorityLabel(task.priority) },
    { label: t('tasks.dueDate'), value: task.due_date },
    { label: 'PO', value: task.po_number ?? '-' },
  ];

  return (
    <Stack gap="md" className="task-detail-stack">
      <Paper withBorder p={0} className="task-detail-workbench">
        <div className="task-detail-hero">
          <Group justify="space-between" align="flex-start" gap="sm" className="task-detail-title-row">
            <div className="task-detail-title-block">
              <Group gap="xs" align="center" wrap="wrap">
                <Title order={3}>{task.task_name}</Title>
                <StatusBadge status={task.status} />
              </Group>
              <Group gap="xs" mt={6} wrap="wrap">
                <EntityLink type="do" id={task.do_number} compact />
                <EntityLink type="po" id={task.po_number} compact />
              </Group>
            </div>
            {onEdit ? (
              <Button size="xs" variant="light" leftSection={<IconPencil size={14} />} onClick={() => onEdit(task)}>
                {t('common.edit')}
              </Button>
            ) : null}
          </Group>

          <div className="task-detail-progress-panel">
            <Group justify="space-between" mb="xs" gap="sm" wrap="nowrap">
              <Text fw={700}>{t('tasks.progress')}</Text>
              <Text fw={800} className="tabular-nums">{task.progress}%</Text>
            </Group>
            <Progress value={task.progress} color={task.progress === 100 ? 'teal' : 'blue'} />
          </div>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={0} className="task-detail-facts">
          {detailFacts.map((fact) => (
            <TaskFact key={String(fact.label)} label={fact.label} tone={fact.tone} value={fact.value} />
          ))}
        </SimpleGrid>

        {task.template ? (
          <div className="task-detail-section">
            <Group justify="space-between" gap="sm" className="task-detail-section-header">
              <Text fw={700}>{t('tasks.sopTemplate')}</Text>
              {task.template.group_name ? (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {task.template.group_code ? `${task.template.group_code} · ` : ''}
                  {task.template.group_name}
                </Text>
              ) : null}
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={0} className="task-detail-facts is-compact">
              <TaskFact label={t('tasks.milestone')} value={milestoneLabel(task.template.milestone_code)} />
              <TaskFact label={t('tasks.department')} value={departmentLabel(task.template.department)} />
              <TaskFact label={t('tasks.sla')} value={templateSlaLabel(task.template)} />
              <TaskFact label={t('tasks.relatedDocuments')} value={task.template.related_documents ?? '-'} />
            </SimpleGrid>
          </div>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: task.blocked_reason ? 2 : 1 }} spacing={0} className="task-detail-notes-grid">
          {task.blocked_reason ? (
            <div className="task-detail-note-block is-risk">
              <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                {t('tasks.blockedReason')}
              </Text>
              <Text size="sm">{task.blocked_reason}</Text>
            </div>
          ) : null}
          <div className="task-detail-note-block">
            <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
              {t('common.notes')}
            </Text>
            <Text size="sm">{task.notes || '-'}</Text>
          </div>
        </SimpleGrid>
      </Paper>

      <UpdateTaskProgressForm task={task} onUpdated={onUpdated} />
    </Stack>
  );
}

function TaskFact({
  label,
  tone,
  value,
}: {
  label: ReactNode;
  tone?: 'attention' | 'neutral';
  value: ReactNode;
}) {
  return (
    <div className="task-detail-fact">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      {tone ? (
        <Badge color={tone === 'attention' ? 'orange' : 'gray'} variant="light">
          {value}
        </Badge>
      ) : (
        <Text fw={700} lineClamp={1} title={typeof value === 'string' ? value : undefined}>
          {value}
        </Text>
      )}
    </div>
  );
}
