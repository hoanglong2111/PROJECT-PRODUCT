import { create } from 'zustand';

type MasterDataTab =
  | 'chargeCodes'
  | 'currencies'
  | 'forwarders'
  | 'incoterms'
  | 'items'
  | 'suppliers'
  | 'taskTemplates'
  | 'transportModes'
  | 'uoms';

type MasterDataState = {
  activeTab: MasterDataTab;
  itemPage: number;
  itemSearch: string;
  taskTemplateDepartmentFilter: string | null;
  taskTemplateMilestoneFilter: string | null;
  setActiveTab: (activeTab: MasterDataTab) => void;
  setItemPage: (itemPage: number) => void;
  setItemSearch: (itemSearch: string) => void;
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter: string | null) => void;
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter: string | null) => void;
};

export const useMasterDataStore = create<MasterDataState>((set) => ({
  activeTab: 'suppliers',
  itemPage: 1,
  itemSearch: '',
  taskTemplateDepartmentFilter: null,
  taskTemplateMilestoneFilter: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  setItemPage: (itemPage) => set({ itemPage }),
  setItemSearch: (itemSearch) => set({ itemSearch, itemPage: 1 }),
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter) => set({ taskTemplateDepartmentFilter }),
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter) => set({ taskTemplateMilestoneFilter }),
}));
