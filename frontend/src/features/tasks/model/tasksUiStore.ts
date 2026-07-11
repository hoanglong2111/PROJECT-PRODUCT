import { create } from 'zustand';

import type { DepartmentCode, Priority, TaskStatus } from '@shared/api/logistics';

// Feature-scoped UI/filter state for the Tasks closure list.
type TasksUiState = {
  search: string;
  statusFilter: TaskStatus | 'all';
  departmentFilter: DepartmentCode | 'all';
  priorityFilter: Priority | 'all';
  milestoneFilter: string | 'all';
  overdueOnly: boolean;
  setSearch: (search: string) => void;
  setStatusFilter: (statusFilter: TaskStatus | 'all') => void;
  setDepartmentFilter: (departmentFilter: DepartmentCode | 'all') => void;
  setPriorityFilter: (priorityFilter: Priority | 'all') => void;
  setMilestoneFilter: (milestoneFilter: string | 'all') => void;
  setOverdueOnly: (overdueOnly: boolean) => void;
  clearFilters: () => void;
};

export const useTasksUiStore = create<TasksUiState>((set) => ({
  search: '',
  statusFilter: 'all',
  departmentFilter: 'all',
  priorityFilter: 'all',
  milestoneFilter: 'all',
  overdueOnly: false,
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setDepartmentFilter: (departmentFilter) => set({ departmentFilter }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
  setMilestoneFilter: (milestoneFilter) => set({ milestoneFilter }),
  setOverdueOnly: (overdueOnly) => set({ overdueOnly }),
  clearFilters: () =>
    set({
      search: '',
      statusFilter: 'all',
      departmentFilter: 'all',
      priorityFilter: 'all',
      milestoneFilter: 'all',
      overdueOnly: false,
    }),
}));
