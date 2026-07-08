import { Alert, NumberInput, Select, SimpleGrid, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import {
  DEPARTMENTS,
  MILESTONE_CODES,
  createTaskTemplate,
  updateTaskTemplate,
  type TaskTemplate,
} from '@shared/api/taskTemplates';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import {
  getDepartmentLabel,
  getMilestoneLabel,
  optionalNumber,
  optionalString,
  type SaveTaskTemplateInput,
} from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type TaskTemplateFormValues = {
  groupCode: string;
  groupName: string;
  taskName: string;
  taskDescription: string;
  milestoneCode: string | null;
  slaHours: string;
  slaText: string;
  department: string;
  assigneeCode: string;
  relatedDocuments: string;
  note: string;
  sortOrder: string;
};

const emptyValues: TaskTemplateFormValues = {
  groupCode: '',
  groupName: '',
  taskName: '',
  taskDescription: '',
  milestoneCode: null,
  slaHours: '',
  slaText: '',
  department: '',
  assigneeCode: '',
  relatedDocuments: '',
  note: '',
  sortOrder: '',
};

export function TaskTemplateModal({
  editing,
  onClose,
  opened,
}: {
  editing: TaskTemplate | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<TaskTemplateFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;

    if (!editing) {
      form.setValues(emptyValues);
      return;
    }

    form.setValues({
      groupCode: editing.group_code,
      groupName: editing.group_name,
      taskName: editing.task_name,
      taskDescription: editing.task_description,
      milestoneCode: editing.milestone_code,
      slaHours: editing.sla_hours === null ? '' : String(editing.sla_hours),
      slaText: editing.sla_text ?? '',
      department: editing.department,
      assigneeCode: editing.assignee_role ?? '',
      relatedDocuments: editing.required_documents,
      note: editing.note ?? '',
      sortOrder: String(editing.sort_order),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const milestoneOptions = useMemo(
    () => [
      { label: t('masterData.noMilestone'), value: 'none' },
      ...Object.keys(MILESTONE_CODES).map((code) => ({
        label: getMilestoneLabel(code, t),
        value: code,
      })),
    ],
    [t],
  );
  const departmentOptions = useMemo(
    () =>
      Object.keys(DEPARTMENTS).map((code) => ({
        label: getDepartmentLabel(code, t),
        value: code,
      })),
    [t],
  );

  const sortOrderNumber = optionalNumber(form.values.sortOrder);
  const slaHoursNumber = optionalNumber(form.values.slaHours);
  const hasInvalidSlaHours = form.values.slaHours.trim().length > 0 && slaHoursNumber === undefined;
  const isSaveDisabled =
    !form.values.groupName.trim() ||
    !form.values.taskName.trim() ||
    !form.values.taskDescription.trim() ||
    !form.values.department.trim() ||
    sortOrderNumber === undefined ||
    hasInvalidSlaHours;

  const mutation = useMutation({
    mutationFn: () => {
      const payload: SaveTaskTemplateInput['payload'] = {
        group_code: form.values.groupCode.trim().toUpperCase() || undefined,
        group_name: form.values.groupName.trim(),
        task_name: form.values.taskName.trim(),
        task_description: form.values.taskDescription.trim(),
        milestone_code: form.values.milestoneCode,
        sla_hours: slaHoursNumber ?? null,
        sla_text: optionalString(form.values.slaText) ?? null,
        department: form.values.department,
        assignee_role: optionalString(form.values.assigneeCode) ?? null,
        required_documents: optionalString(form.values.relatedDocuments) ?? '',
        note: optionalString(form.values.note) ?? null,
        sort_order: sortOrderNumber ?? 0,
      };

      return editing ? updateTaskTemplate(editing.id, payload) : createTaskTemplate(payload);
    },
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskTemplateLists });
    },
  });

  const handleSave = () => {
    if (isSaveDisabled) return;
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={editing ? t('masterData.editTaskTemplate') : t('masterData.createTaskTemplate')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={isSaveDisabled}
        />
      )}
    >
      {mutation.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.groupCode')} {...form.getInputProps('groupCode')} />
          <TextInput label={t('masterData.groupName')} required {...form.getInputProps('groupName')} />
          <NumberInput
            label={t('masterData.sortOrder')}
            required
            min={0}
            value={form.values.sortOrder}
            onChange={(value) => form.setFieldValue('sortOrder', value === '' ? '' : String(value))}
          />
          <Select
            label={t('masterData.milestoneCode')}
            data={milestoneOptions}
            value={form.values.milestoneCode ?? 'none'}
            onChange={(value) => form.setFieldValue('milestoneCode', value === 'none' ? null : value)}
          />
          <Select
            label={t('masterData.department')}
            data={departmentOptions}
            value={form.values.department || null}
            onChange={(value) => form.setFieldValue('department', value || '')}
            searchable
            required
          />
          <TextInput label={t('masterData.assigneeCode')} {...form.getInputProps('assigneeCode')} />
          <NumberInput
            label={t('masterData.slaHours')}
            min={0}
            value={form.values.slaHours}
            onChange={(value) => form.setFieldValue('slaHours', value === '' ? '' : String(value))}
          />
          <TextInput label={t('masterData.slaText')} {...form.getInputProps('slaText')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <TextInput label={t('masterData.taskName')} required {...form.getInputProps('taskName')} />
        <Textarea
          label={t('masterData.taskDescription')}
          autosize
          minRows={3}
          required
          {...form.getInputProps('taskDescription')}
        />
      </MasterDataFormSection>
      <MasterDataFormSection>
        <Textarea
          label={t('masterData.relatedDocuments')}
          autosize
          minRows={2}
          {...form.getInputProps('relatedDocuments')}
        />
        <Textarea label={t('masterData.note')} autosize minRows={2} {...form.getInputProps('note')} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
