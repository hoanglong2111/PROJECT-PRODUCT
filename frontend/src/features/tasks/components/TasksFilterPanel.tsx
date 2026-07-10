import { Button, Group, Select, SimpleGrid, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import type { LogisticsTask, Priority, TaskRole, TaskStatus } from '@shared/api/logistics';
import { MILESTONE_CODES } from '@shared/api/taskTemplates';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { useI18n } from '@shared/i18n';

import { useTasksUiStore } from '../model/tasksUiStore';

/** Status segment, search, role/priority/milestone selects, and the overdue toggle. */
export function TasksFilterPanel({
  filteredCount,
  isFetching,
  tasks,
}: {
  filteredCount: number;
  isFetching: boolean;
  tasks: LogisticsTask[];
}) {
  const { priorityLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const search = useTasksUiStore((s) => s.search);
  const statusFilter = useTasksUiStore((s) => s.statusFilter);
  const roleFilter = useTasksUiStore((s) => s.roleFilter);
  const priorityFilter = useTasksUiStore((s) => s.priorityFilter);
  const milestoneFilter = useTasksUiStore((s) => s.milestoneFilter);
  const overdueOnly = useTasksUiStore((s) => s.overdueOnly);
  const setSearch = useTasksUiStore((s) => s.setSearch);
  const setStatusFilter = useTasksUiStore((s) => s.setStatusFilter);
  const setRoleFilter = useTasksUiStore((s) => s.setRoleFilter);
  const setPriorityFilter = useTasksUiStore((s) => s.setPriorityFilter);
  const setMilestoneFilter = useTasksUiStore((s) => s.setMilestoneFilter);
  const setOverdueOnly = useTasksUiStore((s) => s.setOverdueOnly);
  const clearFilters = useTasksUiStore((s) => s.clearFilters);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    priorityFilter !== 'all' ||
    milestoneFilter !== 'all' ||
    overdueOnly;

  const statusOptions: Array<{ label: string; value: TaskStatus | 'all' }> = [
    { label: t('common.allStatuses'), value: 'all' },
    { label: statusLabel('PENDING'), value: 'PENDING' },
    { label: statusLabel('TODO'), value: 'TODO' },
    { label: statusLabel('IN_PROGRESS'), value: 'IN_PROGRESS' },
    { label: statusLabel('WAITING'), value: 'WAITING' },
    { label: statusLabel('BLOCKED'), value: 'BLOCKED' },
    { label: statusLabel('COMPLETED'), value: 'COMPLETED' },
    { label: statusLabel('CANCELLED'), value: 'CANCELLED' },
  ];
  const roleOptions: Array<{ label: string; value: TaskRole | 'all' }> = [
    { label: t('common.allRoles'), value: 'all' },
    { label: taskRoleLabel('BUYER'), value: 'BUYER' },
    { label: taskRoleLabel('LOGISTICS_PLANNER'), value: 'LOGISTICS_PLANNER' },
    { label: taskRoleLabel('PIC_MANAGER'), value: 'PIC_MANAGER' },
    { label: taskRoleLabel('PORT_OFFICER'), value: 'PORT_OFFICER' },
    { label: taskRoleLabel('CUSTOMS_OFFICER'), value: 'CUSTOMS_OFFICER' },
    { label: taskRoleLabel('WAREHOUSE_STAFF'), value: 'WAREHOUSE_STAFF' },
  ];
  const priorityOptions: Array<{ label: string; value: Priority | 'all' }> = [
    { label: t('tasks.allPriorities'), value: 'all' },
    { label: priorityLabel('URGENT'), value: 'URGENT' },
    { label: priorityLabel('HIGH'), value: 'HIGH' },
    { label: priorityLabel('MEDIUM'), value: 'MEDIUM' },
    { label: priorityLabel('LOW'), value: 'LOW' },
  ];
  const milestoneOptions = [
    { label: t('common.all'), value: 'all' },
    ...Object.entries(MILESTONE_CODES).map(([value, label]) => ({ label, value })),
  ];
  const statusCounts = statusOptions.reduce<Record<string, number>>((acc, option) => {
    acc[option.value] = option.value === 'all' ? tasks.length : tasks.filter((task) => task.status === option.value).length;
    return acc;
  }, {});

  return (
    <FilterToolbar
      activeTab={statusFilter}
      className="tasks-filter-panel"
      isFetching={isFetching}
      onTabChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
      headerActions={(
        <Button
          variant={hasActiveFilters ? 'light' : 'subtle'}
          size="compact-sm"
          leftSection={<IconX size={16} />}
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          {t('common.clear')}
        </Button>
      )}
      shown={filteredCount}
      tabs={statusOptions.map((option) => ({ value: option.value, label: option.label, count: statusCounts[option.value] }))}
    >
        <SimpleGrid className="tasks-filter-secondary" cols={{ base: 1, sm: 2, lg: 4 }}>
          <TextInput
            className="tasks-filter-search dl-filter-search kbfe-search-input"
            label={t('common.search')}
            placeholder={t('tasks.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label={t('common.role')}
            value={roleFilter}
            onChange={(value) => setRoleFilter((value ?? 'all') as TaskRole | 'all')}
            data={roleOptions}
          />
          <Select
            label={t('forms.priority')}
            value={priorityFilter}
            onChange={(value) => setPriorityFilter((value ?? 'all') as Priority | 'all')}
            data={priorityOptions}
          />
          <Select
            label={t('tasks.milestone')}
            value={milestoneFilter}
            onChange={(value) => setMilestoneFilter(value ?? 'all')}
            data={milestoneOptions}
          />
        </SimpleGrid>

        <Group className="tasks-filter-toggles" gap="xs" wrap="wrap">
          <Button
            className="tasks-filter-toggle dl-toggle mr-2"
            variant={overdueOnly ? 'light' : 'subtle'}
            color={overdueOnly ? 'orange' : 'gray'}
            onClick={() => setOverdueOnly(!overdueOnly)}
            aria-pressed={overdueOnly}
          >
            {t('tasks.filterOverdueOnly')}
          </Button>
        </Group>
    </FilterToolbar>
  );
}
