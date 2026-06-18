import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  DEPARTMENTS,
  MILESTONE_CODES,
  fetchTaskTemplates,
  type TaskTemplate,
} from '@shared/api/taskTemplates';
import { queryKeys } from '@shared/api/queryKeys';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import {
  getDepartmentLabel,
  getMilestoneLabel,
  optionalString,
} from '../model/masterDataModel';

type TaskTemplateGroup = {
  key: string;
  groupCode: string;
  groupName: string;
  templates: TaskTemplate[];
};

function formatSla(template: TaskTemplate, t: ReturnType<typeof useI18n>['t']) {
  if (template.sla_text) return template.sla_text;
  if (template.sla_hours !== null && template.sla_hours !== undefined) {
    return t('masterData.hoursShort', { count: template.sla_hours });
  }

  return '-';
}

function groupTaskTemplates(templates: TaskTemplate[]) {
  const groups = new Map<string, TaskTemplateGroup>();

  templates.forEach((template) => {
    const key = `${template.group_code}::${template.group_name}`;
    const existing = groups.get(key);

    if (existing) {
      existing.templates.push(template);
      return;
    }

    groups.set(key, {
      key,
      groupCode: template.group_code,
      groupName: template.group_name,
      templates: [template],
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    templates: [...group.templates].sort((left, right) => left.sort_order - right.sort_order),
  }));
}

export function TaskTemplatesSection({
  canManage,
  departmentFilter,
  milestoneFilter,
  onAdd,
  onDelete,
  onDepartmentFilterChange,
  onEdit,
  onMilestoneFilterChange,
}: {
  canManage: boolean;
  departmentFilter: string | null;
  milestoneFilter: string | null;
  onAdd: () => void;
  onDelete: (template: TaskTemplate) => void;
  onDepartmentFilterChange: (value: string | null) => void;
  onEdit: (template: TaskTemplate) => void;
  onMilestoneFilterChange: (value: string | null) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const params = useMemo(
    () => ({
      page: 1,
      limit: 100,
      q: optionalString(search),
      milestone_code: milestoneFilter ?? undefined,
      department: departmentFilter ?? undefined,
    }),
    [departmentFilter, milestoneFilter, search],
  );

  const taskTemplatesQuery = useQuery({
    queryKey: queryKeys.taskTemplatesList(params),
    queryFn: () => fetchTaskTemplates(params),
  });

  const templates = taskTemplatesQuery.data?.data ?? [];
  const groupedTemplates = useMemo(() => groupTaskTemplates(templates), [templates]);
  const milestoneOptions = useMemo(
    () => [
      { label: t('masterData.allMilestones'), value: 'all' },
      ...Object.keys(MILESTONE_CODES).map((code) => ({
        label: getMilestoneLabel(code, t),
        value: code,
      })),
    ],
    [t],
  );
  const departmentOptions = useMemo(
    () => [
      { label: t('masterData.allDepartments'), value: 'all' },
      ...Object.keys(DEPARTMENTS).map((code) => ({
        label: getDepartmentLabel(code, t),
        value: code,
      })),
    ],
    [t],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end" gap="md">
        <TextInput
          label={t('masterData.taskTemplatesTitle')}
          placeholder={t('masterData.searchTaskTemplates')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          label={t('masterData.milestoneCode')}
          data={milestoneOptions}
          value={milestoneFilter ?? 'all'}
          onChange={(value) => onMilestoneFilterChange(value === 'all' ? null : value)}
          w={260}
        />
        <Select
          label={t('masterData.department')}
          data={departmentOptions}
          value={departmentFilter ?? 'all'}
          onChange={(value) => onDepartmentFilterChange(value === 'all' ? null : value)}
          w={240}
        />
        <Group gap="xs">
          {taskTemplatesQuery.isFetching ? <Loader size="sm" /> : null}
          {canManage ? (
            <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
              {t('masterData.addTaskTemplate')}
            </Button>
          ) : null}
          <Tooltip label={t('masterData.refresh')}>
            <ActionIcon
              aria-label={t('masterData.refresh')}
              variant="light"
              onClick={() => {
                void taskTemplatesQuery.refetch();
              }}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {taskTemplatesQuery.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(taskTemplatesQuery.error)}
        </Alert>
      ) : null}

      {taskTemplatesQuery.isLoading ? (
        <Paper withBorder p="xl">
          <Group justify="center">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('masterData.loadingReferenceData')}
            </Text>
          </Group>
        </Paper>
      ) : groupedTemplates.length === 0 ? (
        <Paper withBorder p={0}>
          <EmptyState title={t('masterData.noTaskTemplates')} description={t('masterData.noTaskTemplatesDescription')} />
        </Paper>
      ) : (
        <Stack gap="md">
          {groupedTemplates.map((group) => (
            <Paper key={group.key} withBorder p={0}>
              <Group justify="space-between" px="md" py="sm">
                <Group gap="xs">
                  <Badge variant="light">{group.groupCode}</Badge>
                  <Text fw={700}>{group.groupName}</Text>
                </Group>
                <Badge color="gray" variant="light">
                  {group.templates.length}
                </Badge>
              </Group>
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1180} verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 80 }}>
                        <HeaderLabel label={t('masterData.sortOrder')} />
                      </Table.Th>
                      <Table.Th style={{ minWidth: 280 }}>
                        <HeaderLabel label={t('masterData.taskTemplate')} />
                      </Table.Th>
                      <Table.Th style={{ width: 210 }}>
                        <HeaderLabel label={t('masterData.milestoneCode')} />
                      </Table.Th>
                      <Table.Th style={{ width: 150 }}>
                        <HeaderLabel label={t('masterData.sla')} />
                      </Table.Th>
                      <Table.Th style={{ width: 180 }}>
                        <HeaderLabel label={t('masterData.department')} />
                      </Table.Th>
                      <Table.Th style={{ width: 130 }}>
                        <HeaderLabel label={t('masterData.assigneeCode')} />
                      </Table.Th>
                      <Table.Th style={{ minWidth: 240 }}>
                        <HeaderLabel label={t('masterData.relatedDocuments')} />
                      </Table.Th>
                      {canManage ? (
                        <Table.Th style={{ width: 112 }}>
                          {t('masterData.actions')}
                        </Table.Th>
                      ) : null}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {group.templates.map((template) => (
                      <Table.Tr key={template.id}>
                        <Table.Td>{template.sort_order}</Table.Td>
                        <Table.Td>
                          <Stack gap={3}>
                            <Text fw={700}>{template.task_name}</Text>
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {template.task_description}
                            </Text>
                            {template.note ? (
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {template.note}
                              </Text>
                            ) : null}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={template.milestone_code ? 'blue' : 'gray'} variant="light">
                            {getMilestoneLabel(template.milestone_code, t)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{formatSla(template, t)}</Table.Td>
                        <Table.Td>
                          <Badge color="teal" variant="outline">
                            {getDepartmentLabel(template.department, t)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{template.assignee_code || '-'}</Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2}>
                            {template.related_documents || '-'}
                          </Text>
                        </Table.Td>
                        {canManage ? (
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Tooltip label={t('common.edit')}>
                                <ActionIcon
                                  aria-label={t('common.edit')}
                                  variant="subtle"
                                  onClick={() => onEdit(template)}
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t('common.delete')}>
                                <ActionIcon
                                  aria-label={t('common.delete')}
                                  color="red"
                                  variant="subtle"
                                  onClick={() => onDelete(template)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        ) : null}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
