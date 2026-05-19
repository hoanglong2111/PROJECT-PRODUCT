import { create } from 'zustand';

import type { BusinessFlowTag, DeliveryOrderStatus, PurchaseRequestStatus, TaskRole, TaskStatus } from '../api/logistics';

type StatusFilter = 'all';

type WorkspaceState = {
  compactMode: boolean;
  search: string;
  statusFilter: StatusFilter;
  prSearch: string;
  prStatusFilter: PurchaseRequestStatus | 'all';
  prRiskOnly: boolean;
  doSearch: string;
  doStatusFilter: DeliveryOrderStatus | 'all';
  doRiskOnly: boolean;
  taskSearch: string;
  taskStatusFilter: TaskStatus | 'all';
  taskRoleFilter: TaskRole | 'all';
  taskRequiredOnly: boolean;
  taskFlowFilter: BusinessFlowTag | 'all';
  setCompactMode: (compactMode: boolean) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (statusFilter: StatusFilter) => void;
  setPrSearch: (prSearch: string) => void;
  setPrStatusFilter: (prStatusFilter: PurchaseRequestStatus | 'all') => void;
  setPrRiskOnly: (prRiskOnly: boolean) => void;
  setDoSearch: (doSearch: string) => void;
  setDoStatusFilter: (doStatusFilter: DeliveryOrderStatus | 'all') => void;
  setDoRiskOnly: (doRiskOnly: boolean) => void;
  setTaskSearch: (taskSearch: string) => void;
  setTaskStatusFilter: (taskStatusFilter: TaskStatus | 'all') => void;
  setTaskRoleFilter: (taskRoleFilter: TaskRole | 'all') => void;
  setTaskRequiredOnly: (taskRequiredOnly: boolean) => void;
  setTaskFlowFilter: (taskFlowFilter: BusinessFlowTag | 'all') => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  compactMode: false,
  search: '',
  statusFilter: 'all',
  prSearch: '',
  prStatusFilter: 'all',
  prRiskOnly: false,
  doSearch: '',
  doStatusFilter: 'all',
  doRiskOnly: false,
  taskSearch: '',
  taskStatusFilter: 'all',
  taskRoleFilter: 'all',
  taskRequiredOnly: false,
  taskFlowFilter: 'all',
  setCompactMode: (compactMode) => set({ compactMode }),
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPrSearch: (prSearch) => set({ prSearch }),
  setPrStatusFilter: (prStatusFilter) => set({ prStatusFilter }),
  setPrRiskOnly: (prRiskOnly) => set({ prRiskOnly }),
  setDoSearch: (doSearch) => set({ doSearch }),
  setDoStatusFilter: (doStatusFilter) => set({ doStatusFilter }),
  setDoRiskOnly: (doRiskOnly) => set({ doRiskOnly }),
  setTaskSearch: (taskSearch) => set({ taskSearch }),
  setTaskStatusFilter: (taskStatusFilter) => set({ taskStatusFilter }),
  setTaskRoleFilter: (taskRoleFilter) => set({ taskRoleFilter }),
  setTaskRequiredOnly: (taskRequiredOnly) => set({ taskRequiredOnly }),
  setTaskFlowFilter: (taskFlowFilter) => set({ taskFlowFilter }),
}));
