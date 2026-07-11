import { Alert, Badge, Button, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createLogisticsTask,
  updateLogisticsTask,
  type BlockedByParty,
  type DepartmentCode,
  type LogisticsTask,
  type Priority,
  type TaskStatus,
} from '@shared/api/logistics';
import { ConfirmModal } from '@shared/components/ConfirmModal';
import { DateTimeField } from '@shared/components/DateField';
import { FieldPair } from '@shared/components/FieldPair';
import { DEPARTMENTS, fetchTaskTemplates } from '@shared/api/taskTemplates';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { useI18n } from '@shared/i18n';

import { milestoneLabel, templateSlaLabel } from '../model/tasksModel';

const PRIORITY_VALUES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_VALUES: TaskStatus[] = ['PENDING', 'TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const BLOCKED_BY_PARTY_VALUES: BlockedByParty[] = ['SUPPLIER', 'CARRIER', 'KBI', 'CUSTOMS', 'INTERNAL'];

type TaskFormValues = {
  taskTemplateId: string | null;
  taskName: string;
  department: DepartmentCode;
  assigneeCode: string;
  refNo: string;
  assigneeName: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  progress: number;
  notes: string;
  blockedByParty: string;
  blockedReason: string;
};

const emptyValues: TaskFormValues = {
  taskTemplateId: null,
  taskName: '',
  department: 'FDS_OPS',
  assigneeCode: '',
  refNo: '',
  assigneeName: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  dueDate: '',
  progress: 0,
  notes: '',
  blockedByParty: '',
  blockedReason: '',
};

export function TaskFormPanel({
  closeRequestToken,
  editing,
  onClose,
  onSaved,
  opened,
}: {
  closeRequestToken?: number;
  editing: LogisticsTask | null;
  onClose: () => void;
  onSaved?: (task: LogisticsTask) => void;
  opened: boolean;
}) {
  const { departmentLabel, priorityLabel, statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<TaskFormValues>({ initialValues: emptyValues });
  const [confirmDiscardOpened, setConfirmDiscardOpened] = useState(false);
  const closeRequestTokenRef = useRef(closeRequestToken);

  const templatesQuery = useQuery({
    queryKey: queryKeys.taskTemplates,
    queryFn: () => fetchTaskTemplates({ page: 1, limit: 100 }),
    enabled: opened,
  });
  const templates = useMemo(() => templatesQuery.data?.data ?? [], [templatesQuery.data?.data]);

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
      form.resetDirty(emptyValues);
      return;
    }
    const values: TaskFormValues = {
      taskTemplateId: editing.task_template_id,
      taskName: editing.task_name,
      department: editing.department,
      assigneeCode: editing.assignee_code ?? '',
      refNo: editing.po_number ?? editing.do_number ?? '',
      assigneeName: editing.assignee.name,
      priority: editing.priority,
      status: editing.status,
      dueDate: editing.due_date,
      progress: editing.progress,
      notes: editing.notes,
      blockedByParty: editing.blocked_by_party ?? '',
      blockedReason: editing.blocked_reason ?? '',
    };
    form.setValues(values);
    form.resetDirty(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const requestClose = () => {
    if (form.isDirty()) {
      setConfirmDiscardOpened(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (closeRequestTokenRef.current === closeRequestToken) return;
    closeRequestTokenRef.current = closeRequestToken;
    requestClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeRequestToken]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        taskName: form.values.taskName.trim(),
        taskTemplateId: form.values.taskTemplateId,
        refNo: form.values.refNo.trim() || undefined,
        doNumber: form.values.refNo.trim().startsWith('DO-') ? form.values.refNo.trim() : undefined,
        poNumber: form.values.refNo.trim().startsWith('PO-') ? form.values.refNo.trim() : undefined,
        department: form.values.department,
        assigneeCode: form.values.assigneeCode.trim() || null,
        assignee: { name: form.values.assigneeName.trim() || 'Unassigned', department: form.values.department, code: form.values.assigneeCode.trim() || null },
        priority: form.values.priority,
        status: form.values.status,
        dueDate: form.values.dueDate || undefined,
        progress: Number(form.values.progress) || 0,
        notes: form.values.notes.trim(),
        blockedByParty: form.values.status === 'BLOCKED' ? ((form.values.blockedByParty || null) as BlockedByParty | null) : null,
        blockedReason: form.values.status === 'BLOCKED' ? form.values.blockedReason.trim() || null : null,
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
      setConfirmDiscardOpened(false);
      onSaved?.(saved);
      onClose();
    },
  });

  const handleSave = () => {
    if (!form.values.taskName.trim()) return;
    mutation.mutate();
  };

  const handleDiscardChanges = () => {
    setConfirmDiscardOpened(false);
    onClose();
  };

  const onTemplateChange = (value: string | null) => {
    form.setFieldValue('taskTemplateId', value);
    const template = templates.find((item) => item.id === value);
    if (template) {
      form.setFieldValue('taskName', template.task_name);
      form.setFieldValue('department', template.department);
      form.setFieldValue('assigneeCode', template.assignee_code ?? '');
    }
  };

  if (!opened) return null;

  return (
    <Paper p={0} className="task-form-panel task-form-panel-body">
      <Stack gap="xl" className="task-form-shell">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        <div className="task-form-topline">
          <div className="task-form-topline-copy">
            <Text fw={800}>{editing ? t('tasks.editTask') : t('tasks.createTask')}</Text>
            <Text size="sm" c="dimmed">
              {t('tasks.templatePickerHint')}
            </Text>
          </div>
          <Badge variant="light" color={editing ? 'blue' : 'teal'}>
            {editing ? editing.task_id : t('tasks.sopTemplate')}
          </Badge>
        </div>

        <div className="task-form-layout">
          <section className="task-form-section task-form-section-main">
            <Group justify="space-between" gap="sm" className="task-form-section-title">
              <Text className="task-form-section-heading-text" size="xs" tt="uppercase" fw={700} c="dimmed">
                {t('common.task')}
              </Text>
              {selectedTemplate?.group_code ? (
                <Badge size="sm" variant="light" color="grape">
                  {selectedTemplate.group_code}
                </Badge>
              ) : null}
            </Group>
            <Stack gap="sm">
              <Tooltip
                label={selectedTemplate ? templateOptions.find((option) => option.value === selectedTemplate.id)?.label : ''}
                disabled={!selectedTemplate}
                multiline
                maw={360}
                withinPortal
              >
                <Select
                  label={t('tasks.sopTemplate')}
                  placeholder={t('tasks.templatePickerPlaceholder')}
                  data={templateOptions}
                  searchable
                  clearable
                  value={form.values.taskTemplateId}
                  onChange={onTemplateChange}
                  renderOption={({ option }) => (
                    <Text size="sm" className="task-form-template-option">
                      {option.label}
                    </Text>
                  )}
                />
              </Tooltip>
              <TextInput label={t('common.task')} required {...form.getInputProps('taskName')} />
              <TextInput label="PO / DO" placeholder="PO-KBI-2026-001" {...form.getInputProps('refNo')} />
            </Stack>
          </section>

          <aside className="task-form-template-panel">
            <Text className="task-form-section-heading metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
              {t('tasks.sopTemplate')}
            </Text>
            {selectedTemplate ? (
              <Stack gap="sm">
                <SimpleGrid cols={1} spacing="sm" className="task-form-template-facts">
                  <FieldPair className="task-form-template-fact" label={t('tasks.milestone')} value={milestoneLabel(selectedTemplate.milestone_code)} />
                  <FieldPair className="task-form-template-fact" label={t('tasks.department')} value={departmentLabel(selectedTemplate.department)} />
                  <FieldPair className="task-form-template-fact" label={t('tasks.sla')} value={templateSlaLabel(selectedTemplate)} />
                </SimpleGrid>
                {selectedTemplate.is_required_for_closure ? (
                  <Badge color="orange" variant="light" w="fit-content">
                    {t('tasks.required')}
                  </Badge>
                ) : null}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" mt={6}>
                {t('tasks.templatePickerPlaceholder')}
              </Text>
            )}
          </aside>
        </div>

        <section className="task-form-section">
          <Text className="task-form-section-heading" size="xs" tt="uppercase" fw={700} c="dimmed">
            {t('common.assignee')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label={t('tasks.department')}
              data={Object.keys(DEPARTMENTS).map((department) => ({ label: departmentLabel(department), value: department }))}
              {...form.getInputProps('department')}
            />
            <TextInput label={t('common.assignee')} {...form.getInputProps('assigneeName')} />
            <TextInput label={t('tasks.assigneeCode')} {...form.getInputProps('assigneeCode')} />
            <Select
              label={t('forms.priority')}
              data={PRIORITY_VALUES.map((priority) => ({ label: priorityLabel(priority), value: priority }))}
              {...form.getInputProps('priority')}
            />
          </SimpleGrid>
        </section>

        <section className="task-form-section">
          <Text className="task-form-section-heading" size="xs" tt="uppercase" fw={700} c="dimmed">
            {t('tasks.progress')}
          </Text>
          <div className="task-form-progress-grid">
            <Select
              label={t('common.status')}
              data={STATUS_VALUES.map((status) => ({ label: statusLabel(status), value: status }))}
              {...form.getInputProps('status')}
            />
            <DateTimeField label={t('tasks.dueDate')} {...form.getInputProps('dueDate')} />
            <NumberInput label={t('tasks.progress')} min={0} max={100} suffix="%" {...form.getInputProps('progress')} />
          </div>
        </section>

        {form.values.status === 'BLOCKED' ? (
          <section className="task-form-section">
            <Text className="task-form-section-heading" size="xs" tt="uppercase" fw={700} c="dimmed">
              {t('tasks.blocked')}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={t('tasks.blockedByLabel')}
                clearable
                data={BLOCKED_BY_PARTY_VALUES.map((party) => ({ label: t(`tasks.blockedBy.${party}`), value: party }))}
                value={form.values.blockedByParty || null}
                onChange={(value) => form.setFieldValue('blockedByParty', value ?? '')}
              />
              <TextInput label={t('tasks.blockedReason')} {...form.getInputProps('blockedReason')} />
            </SimpleGrid>
          </section>
        ) : null}

        <section className="task-form-section">
          <Textarea label={t('common.notes')} autosize minRows={3} {...form.getInputProps('notes')} />
        </section>

        <Group justify="space-between" className="task-form-footer">
          <Text size="sm" c="dimmed">
            {t('forms.updateTaskHint')}
          </Text>
          <Group gap="xs">
            <Button variant="subtle" color="gray" onClick={requestClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={mutation.isPending} disabled={!form.values.taskName.trim()}>
              {t('common.save')}
            </Button>
          </Group>
        </Group>
      </Stack>

      <ConfirmModal
        opened={confirmDiscardOpened}
        title={t('tasks.unsavedChangesTitle')}
        message={t('tasks.unsavedChangesMessage')}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.no')}
        confirmColor="teal"
        loading={mutation.isPending}
        onConfirm={handleSave}
        onCancel={handleDiscardChanges}
      />
    </Paper>
  );
}
