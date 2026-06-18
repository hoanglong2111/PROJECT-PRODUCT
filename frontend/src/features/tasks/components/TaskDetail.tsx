import { Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import type { LogisticsTask } from '@shared/api/logistics';
import { InfoField } from '@shared/components/InfoField';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { EntityLink, UpdateTaskProgressForm } from '@entities/logistics';
import { departmentLabel, milestoneLabel, templateSlaLabel } from '../model/tasksModel';

export function TaskDetail({ onUpdated, task }: { onUpdated?: (task: LogisticsTask) => void; task: LogisticsTask }) {
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
        <InfoField label={t('common.role')} value={taskRoleLabel(task.role)} />
        <InfoField label={t('common.assignee')} value={`${task.assignee.name} - ${task.assignee.department}`} />
        <InfoField label={t('forms.priority')} value={priorityLabel(task.priority)} />
        <InfoField label={t('tasks.dueDate')} value={task.due_date} />
        <InfoField label="PO" value={task.po_number ?? '-'} />
        <InfoField label={t('tasks.requiredForClosure')} value={task.is_required_for_do_closure ? t('common.yes') : t('common.no')} />
      </SimpleGrid>

      {task.template ? (
        <Paper withBorder p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{t('tasks.sopTemplate')}</Text>
            {task.template.group_name ? (
              <Text size="xs" c="dimmed">
                {task.template.group_code ? `${task.template.group_code} · ` : ''}
                {task.template.group_name}
              </Text>
            ) : null}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <InfoField label={t('tasks.milestone')} value={milestoneLabel(task.template.milestone_code)} />
            <InfoField label={t('tasks.department')} value={departmentLabel(task.template.department)} />
            <InfoField label={t('tasks.sla')} value={templateSlaLabel(task.template)} />
            <InfoField label={t('tasks.relatedDocuments')} value={task.template.related_documents ?? '-'} />
          </SimpleGrid>
        </Paper>
      ) : null}

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
