import { create } from 'zustand';

type MasterDataTab =
  | 'currencies'
  | 'forwarders'
  | 'incoterms'
  | 'items'
  | 'suppliers'
  | 'taskTemplates'
  | 'transportModes';

type MasterDataState = {
  activeTab: MasterDataTab;
  itemGroupFilter: string | null;
  itemGroupSearch: string;
  itemPage: number;
  itemSearch: string;
  taskTemplateDepartmentFilter: string | null;
  taskTemplateMilestoneFilter: string | null;
  setActiveTab: (activeTab: MasterDataTab) => void;
  setItemGroupFilter: (itemGroupFilter: string | null) => void;
  setItemGroupSearch: (itemGroupSearch: string) => void;
  setItemPage: (itemPage: number) => void;
  setItemSearch: (itemSearch: string) => void;
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter: string | null) => void;
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter: string | null) => void;
};

export const useMasterDataStore = create<MasterDataState>((set) => ({
  activeTab: 'suppliers',
  itemGroupFilter: null,
  itemGroupSearch: '',
  itemPage: 1,
  itemSearch: '',
  taskTemplateDepartmentFilter: null,
  taskTemplateMilestoneFilter: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  setItemGroupFilter: (itemGroupFilter) => set({ itemGroupFilter, itemPage: 1 }),
  setItemGroupSearch: (itemGroupSearch) => set({ itemGroupSearch }),
  setItemPage: (itemPage) => set({ itemPage }),
  setItemSearch: (itemSearch) => set({ itemSearch, itemPage: 1 }),
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter) => set({ taskTemplateDepartmentFilter }),
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter) => set({ taskTemplateMilestoneFilter }),
}));
