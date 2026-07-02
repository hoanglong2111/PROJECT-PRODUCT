import {
  ActionIcon,
  Alert,
  Badge,
  Collapse,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle, IconChevronDown, IconChevronRight, IconPencil, IconTrash } from '@tabler/icons-react';
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
import { StatusDot } from '@shared/components/StatusDot';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import {
  getDepartmentLabel,
  getMilestoneLabel,
  optionalString,
} from '../model/masterDataModel';
import { FILTER_SELECT_WIDTH, MasterDataToolbar } from './MasterDataToolbar';

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
  hasActiveFilters,
  milestoneFilter,
  onAdd,
  onClearFilters,
  onDelete,
  onDepartmentFilterChange,
  onEdit,
  onMilestoneFilterChange,
  onStatusFilterChange,
  statusFilter,
}: {
  canManage: boolean;
  departmentFilter: string | null;
  hasActiveFilters: boolean;
  milestoneFilter: string | null;
  onAdd: () => void;
  onClearFilters: () => void;
  onDelete: (template: TaskTemplate) => void;
  onDepartmentFilterChange: (value: string | null) => void;
  onEdit: (template: TaskTemplate) => void;
  onMilestoneFilterChange: (value: string | null) => void;
  onStatusFilterChange: (value: boolean | null) => void;
  statusFilter: boolean | null;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const hasSearch = search.trim().length > 0;
  const showClearFilters = hasActiveFilters || hasSearch;
  const params = useMemo(
    () => ({
      page: 1,
      limit: 100,
      q: optionalString(debouncedSearch),
      milestone_code: milestoneFilter ?? undefined,
      department: departmentFilter ?? undefined,
      is_active: statusFilter ?? undefined,
    }),
    [debouncedSearch, departmentFilter, milestoneFilter, statusFilter],
  );

  const taskTemplatesQuery = useQuery({
    queryKey: queryKeys.taskTemplatesList(params),
    queryFn: () => fetchTaskTemplates(params),
  });

  const templates = useMemo(() => taskTemplatesQuery.data?.data ?? [], [taskTemplatesQuery.data?.data]);
  const groupedTemplates = useMemo(() => groupTaskTemplates(templates), [templates]);
  const milestoneOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...Object.keys(MILESTONE_CODES).map((code) => ({
        label: getMilestoneLabel(code, t),
        value: code,
      })),
    ],
    [t],
  );
  const departmentOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...Object.keys(DEPARTMENTS).map((code) => ({
        label: getDepartmentLabel(code, t),
        value: code,
      })),
    ],
    [t],
  );
  const handleClearFilters = () => {
    setSearch('');
    onClearFilters();
  };
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  };

  return (
    <Stack gap="md">
      <MasterDataToolbar
        addLabel={t('masterData.addTaskTemplate')}
        canManage={canManage}
        count={templates.length}
        filters={(
          <>
            <Select
              className="md-filter-select"
              label={t('masterData.milestoneCode')}
              data={milestoneOptions}
              value={milestoneFilter ?? 'ALL'}
              onChange={(value) => onMilestoneFilterChange(value === 'ALL' ? null : value)}
              w={FILTER_SELECT_WIDTH}
            />
            <Select
              className="md-filter-select"
              label={t('masterData.department')}
              data={departmentOptions}
              value={departmentFilter ?? 'ALL'}
              onChange={(value) => onDepartmentFilterChange(value === 'ALL' ? null : value)}
              w={FILTER_SELECT_WIDTH}
            />
          </>
        )}
        hasActiveFilters={showClearFilters}
        isFetching={taskTemplatesQuery.isFetching}
        onAdd={onAdd}
        onClear={handleClearFilters}
        onSearchChange={setSearch}
        onStatusChange={onStatusFilterChange}
        searchLabel={t('masterData.taskTemplatesTitle')}
        searchPlaceholder={t('masterData.searchTaskTemplates')}
        searchValue={search}
        statusValue={statusFilter}
      />

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
          <EmptyState
            title={showClearFilters ? t('masterData.noFilteredResults') : t('masterData.noTaskTemplates')}
            description={showClearFilters ? t('masterData.noFilteredResultsDescription') : t('masterData.noTaskTemplatesDescription')}
            action={showClearFilters ? { label: t('masterData.clearFilters'), onClick: handleClearFilters } : undefined}
          />
        </Paper>
      ) : (
        <Stack gap="md">
          {groupedTemplates.map((group) => {
            const collapsed = collapsedGroups[group.key] === true;

            return (
              <Paper key={group.key} withBorder p={0} className="dl-data-panel">
              <Group justify="space-between" px="md" py="sm" className="dl-data-panel-header">
                <Group gap="xs">
                  <ActionIcon
                    aria-label={group.groupName}
                    variant="subtle"
                    onClick={() => toggleGroup(group.key)}
                  >
                    {collapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                  </ActionIcon>
                  <Badge variant="light">{group.groupCode}</Badge>
                  <Text fw={700}>{group.groupName}</Text>
                </Group>
                <Badge color="gray" variant="light">
                  {group.templates.length}
                </Badge>
              </Group>
              <Collapse expanded={!collapsed}>
                <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                  <Table stickyHeader verticalSpacing="sm" highlightOnHover style={{ tableLayout: 'fixed', width: '100%' }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 80 }}>
                          <HeaderLabel label={t('masterData.sortOrder')} />
                        </Table.Th>
                        <Table.Th>
                          <HeaderLabel label={t('masterData.taskTemplate')} />
                        </Table.Th>
                        <Table.Th style={{ width: 180 }}>
                          <HeaderLabel label={t('masterData.milestoneCode')} />
                        </Table.Th>
                        <Table.Th style={{ width: 120 }}>
                          <HeaderLabel label={t('masterData.sla')} />
                        </Table.Th>
                        <Table.Th style={{ width: 160 }}>
                          <HeaderLabel label={t('masterData.department')} />
                        </Table.Th>
                        <Table.Th style={{ width: 180 }}>
                          <HeaderLabel label={t('masterData.assigneeCode')} />
                        </Table.Th>
                        <Table.Th style={{ width: 56 }}>
                          <HeaderLabel label={t('common.status')} />
                        </Table.Th>
                        {canManage ? (
                          <Table.Th style={{ width: 96 }}>
                            {t('masterData.actions')}
                          </Table.Th>
                        ) : null}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {group.templates.map((template) => (
                        <Table.Tr key={template.id}>
                          <Table.Td>{template.sort_order}</Table.Td>
                          <Table.Td className="md-cell-clamp">
                            <Stack gap={3}>
                              <Text fw={700}>{template.task_name}</Text>
                              <Text size="sm" c="dimmed" lineClamp={2}>
                                {template.task_description || '-'}
                              </Text>
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
                          <Table.Td className="md-cell-clamp">
                            <Text size="sm" lineClamp={1}>{template.assignee_code || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <StatusDot active={template.is_active !== false} />
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
              </Collapse>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
