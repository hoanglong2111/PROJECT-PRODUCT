import { Alert, Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import {
  createLogisticsTask,
  updateLogisticsTask,
  type LogisticsTask,
  type Priority,
  type TaskRole,
  type TaskStatus,
} from '@shared/api/logistics';
import { fetchTaskTemplates } from '@shared/api/taskTemplates';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { useI18n } from '@shared/i18n';

import { departmentLabel, milestoneLabel, templateSlaLabel } from '../model/tasksModel';

const ROLE_VALUES: TaskRole[] = [
  'BUYER',
  'LOGISTICS_PLANNER',
  'PIC_MANAGER',
  'PORT_OFFICER',
  'CUSTOMS_OFFICER',
  'WAREHOUSE_STAFF',
];
const PRIORITY_VALUES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_VALUES: TaskStatus[] = ['PENDING', 'TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

type TaskFormValues = {
  taskTemplateId: string | null;
  taskName: string;
  role: TaskRole;
  refNo: string;
  assigneeName: string;
  assigneeDepartment: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  progress: number;
  notes: string;
};

const emptyValues: TaskFormValues = {
  taskTemplateId: null,
  taskName: '',
  role: 'BUYER',
  refNo: '',
  assigneeName: '',
  assigneeDepartment: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  dueDate: '',
  progress: 0,
  notes: '',
};

export function TaskFormModal({
  editing,
  onClose,
  onSaved,
  opened,
}: {
  editing: LogisticsTask | null;
  onClose: () => void;
  onSaved?: (task: LogisticsTask) => void;
  opened: boolean;
}) {
  const { priorityLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<TaskFormValues>({ initialValues: emptyValues });

  const templatesQuery = useQuery({
    queryKey: queryKeys.taskTemplates,
    queryFn: () => fetchTaskTemplates({ page: 1, limit: 100 }),
    enabled: opened,
  });
  const templates = templatesQuery.data?.data ?? [];

  const templateOptions = useMemo(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: `${template.group_code ? `${template.group_code} · ` : ''}${template.task_name}`,
      })),
    [templates],
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.values.taskTemplateId) ?? null,
    [templates, form.values.taskTemplateId],
  );

  useEffect(() => {
    if (!opened) return;
    if (!editing) {
      form.setValues(emptyValues);
      return;
    }
    form.setValues({
      taskTemplateId: editing.task_template_id,
      taskName: editing.task_name,
      role: editing.role,
      refNo: editing.po_number ?? editing.do_number ?? '',
      assigneeName: editing.assignee.name,
      assigneeDepartment: editing.assignee.department ?? '',
      priority: editing.priority,
      status: editing.status,
      dueDate: editing.due_date,
      progress: editing.progress,
      notes: editing.notes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        taskName: form.values.taskName.trim(),
        taskTemplateId: form.values.taskTemplateId,
        role: form.values.role,
        refNo: form.values.refNo.trim() || undefined,
        assignee: { name: form.values.assigneeName.trim() || 'Unassigned', department: form.values.assigneeDepartment.trim() || null },
        priority: form.values.priority,
        status: form.values.status,
        dueDate: form.values.dueDate || undefined,
        progress: Number(form.values.progress) || 0,
        notes: form.values.notes.trim(),
      };
      return editing ? updateLogisticsTask(editing.task_id, payload) : createLogisticsTask(payload);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalPoStageTasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      onSaved?.(saved);
      onClose();
    },
  });

  const handleSave = () => {
    if (!form.values.taskName.trim()) return;
    mutation.mutate();
  };

  const onTemplateChange = (value: string | null) => {
    form.setFieldValue('taskTemplateId', value);
    const template = templates.find((item) => item.id === value);
    if (template && !form.values.taskName.trim()) {
      form.setFieldValue('taskName', template.task_name);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={editing ? t('tasks.editTask') : t('tasks.createTask')}
    >
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        <Select
          label={t('tasks.sopTemplate')}
          description={t('tasks.templatePickerHint')}
          placeholder={t('tasks.templatePickerPlaceholder')}
          data={templateOptions}
          searchable
          clearable
          value={form.values.taskTemplateId}
          onChange={onTemplateChange}
        />

        {selectedTemplate ? (
          <Alert variant="light" color="grape" icon={<IconAlertCircle size={16} />}>
            <Group gap="lg">
              <Text size="sm">
                <b>{t('tasks.milestone')}:</b> {milestoneLabel(selectedTemplate.milestone_code)}
              </Text>
              <Text size="sm">
                <b>{t('tasks.department')}:</b> {departmentLabel(selectedTemplate.department)}
              </Text>
              <Text size="sm">
                <b>{t('tasks.sla')}:</b> {templateSlaLabel(selectedTemplate)}
              </Text>
            </Group>
          </Alert>
        ) : null}

        <TextInput label={t('common.task')} required {...form.getInputProps('taskName')} />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label={t('common.role')}
            data={ROLE_VALUES.map((role) => ({ label: taskRoleLabel(role), value: role }))}
            {...form.getInputProps('role')}
          />
          <TextInput label="PO / DO" placeholder="PO-KBI-2026-001" {...form.getInputProps('refNo')} />
          <TextInput label={t('common.assignee')} {...form.getInputProps('assigneeName')} />
          <TextInput label={t('tasks.department')} {...form.getInputProps('assigneeDepartment')} />
          <Select
            label={t('forms.priority')}
            data={PRIORITY_VALUES.map((priority) => ({ label: priorityLabel(priority), value: priority }))}
            {...form.getInputProps('priority')}
          />
          <Select
            label={t('common.status')}
            data={STATUS_VALUES.map((status) => ({ label: statusLabel(status), value: status }))}
            {...form.getInputProps('status')}
          />
          <TextInput label={t('tasks.dueDate')} type="date" {...form.getInputProps('dueDate')} />
          <NumberInput label={t('tasks.progress')} min={0} max={100} suffix="%" {...form.getInputProps('progress')} />
        </SimpleGrid>

        <Textarea label={t('common.notes')} autosize minRows={2} {...form.getInputProps('notes')} />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} loading={mutation.isPending} disabled={!form.values.taskName.trim()}>
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
