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
  supplierStatusFilter: boolean | null;
  itemStatusFilter: boolean | null;
  uomStatusFilter: boolean | null;
  currencyStatusFilter: boolean | null;
  incotermStatusFilter: boolean | null;
  transportModeStatusFilter: boolean | null;
  chargeCodeStatusFilter: boolean | null;
  forwarderStatusFilter: boolean | null;
  carrierStatusFilter: boolean | null;
  taskTemplateStatusFilter: boolean | null;
  chargeGroupFilter: string | null;
  chargeCategoryFilter: string | null;
  chargeCodeRevCostFilter: string | null;
  chargeCodeModeFilter: string | null;
  supplierTypeFilter: string | null;
  itemCategoryFilter: string | null;
  itemTypeFilter: string | null;
  forwarderTypeFilter: string | null;
  carrierTypeFilter: string | null;
  taskTemplateDepartmentFilter: string | null;
  taskTemplateMilestoneFilter: string | null;
  setActiveTab: (activeTab: MasterDataTab) => void;
  setItemPage: (itemPage: number) => void;
  setItemSearch: (itemSearch: string) => void;
  setSupplierStatusFilter: (supplierStatusFilter: boolean | null) => void;
  setItemStatusFilter: (itemStatusFilter: boolean | null) => void;
  setUomStatusFilter: (uomStatusFilter: boolean | null) => void;
  setCurrencyStatusFilter: (currencyStatusFilter: boolean | null) => void;
  setIncotermStatusFilter: (incotermStatusFilter: boolean | null) => void;
  setTransportModeStatusFilter: (transportModeStatusFilter: boolean | null) => void;
  setChargeCodeStatusFilter: (chargeCodeStatusFilter: boolean | null) => void;
  setForwarderStatusFilter: (forwarderStatusFilter: boolean | null) => void;
  setCarrierStatusFilter: (carrierStatusFilter: boolean | null) => void;
  setTaskTemplateStatusFilter: (taskTemplateStatusFilter: boolean | null) => void;
  setChargeGroupFilter: (chargeGroupFilter: string | null) => void;
  setChargeCategoryFilter: (chargeCategoryFilter: string | null) => void;
  setChargeCodeRevCostFilter: (chargeCodeRevCostFilter: string | null) => void;
  setChargeCodeModeFilter: (chargeCodeModeFilter: string | null) => void;
  setSupplierTypeFilter: (supplierTypeFilter: string | null) => void;
  setItemCategoryFilter: (itemCategoryFilter: string | null) => void;
  setItemTypeFilter: (itemTypeFilter: string | null) => void;
  setForwarderTypeFilter: (forwarderTypeFilter: string | null) => void;
  setCarrierTypeFilter: (carrierTypeFilter: string | null) => void;
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter: string | null) => void;
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter: string | null) => void;
  clearChargeCodeFilters: () => void;
  clearSupplierFilters: () => void;
  clearItemFilters: () => void;
  clearUomFilters: () => void;
  clearCurrencyFilters: () => void;
  clearIncotermFilters: () => void;
  clearTransportModeFilters: () => void;
  clearForwarderFilters: () => void;
  clearCarrierFilters: () => void;
  clearTaskTemplateFilters: () => void;
};

export const useMasterDataStore = create<MasterDataState>((set) => ({
  activeTab: 'suppliers',
  itemPage: 1,
  itemSearch: '',
  supplierStatusFilter: null,
  itemStatusFilter: null,
  uomStatusFilter: null,
  currencyStatusFilter: null,
  incotermStatusFilter: null,
  transportModeStatusFilter: null,
  chargeCodeStatusFilter: null,
  forwarderStatusFilter: null,
  carrierStatusFilter: null,
  taskTemplateStatusFilter: null,
  chargeGroupFilter: null,
  chargeCategoryFilter: null,
  chargeCodeRevCostFilter: null,
  chargeCodeModeFilter: null,
  supplierTypeFilter: null,
  itemCategoryFilter: null,
  itemTypeFilter: null,
  forwarderTypeFilter: null,
  carrierTypeFilter: null,
  taskTemplateDepartmentFilter: null,
  taskTemplateMilestoneFilter: null,
  setActiveTab: (activeTab) => set({ activeTab }),
  setItemPage: (itemPage) => set({ itemPage }),
  setItemSearch: (itemSearch) => set({ itemSearch, itemPage: 1 }),
  setSupplierStatusFilter: (supplierStatusFilter) => set({ supplierStatusFilter }),
  setItemStatusFilter: (itemStatusFilter) => set({ itemStatusFilter, itemPage: 1 }),
  setUomStatusFilter: (uomStatusFilter) => set({ uomStatusFilter }),
  setCurrencyStatusFilter: (currencyStatusFilter) => set({ currencyStatusFilter }),
  setIncotermStatusFilter: (incotermStatusFilter) => set({ incotermStatusFilter }),
  setTransportModeStatusFilter: (transportModeStatusFilter) => set({ transportModeStatusFilter }),
  setChargeCodeStatusFilter: (chargeCodeStatusFilter) => set({ chargeCodeStatusFilter }),
  setForwarderStatusFilter: (forwarderStatusFilter) => set({ forwarderStatusFilter }),
  setCarrierStatusFilter: (carrierStatusFilter) => set({ carrierStatusFilter }),
  setTaskTemplateStatusFilter: (taskTemplateStatusFilter) => set({ taskTemplateStatusFilter }),
  setChargeGroupFilter: (chargeGroupFilter) => set({ chargeGroupFilter }),
  setChargeCategoryFilter: (chargeCategoryFilter) => set({ chargeCategoryFilter }),
  setChargeCodeRevCostFilter: (chargeCodeRevCostFilter) => set({ chargeCodeRevCostFilter }),
  setChargeCodeModeFilter: (chargeCodeModeFilter) => set({ chargeCodeModeFilter }),
  setSupplierTypeFilter: (supplierTypeFilter) => set({ supplierTypeFilter }),
  setItemCategoryFilter: (itemCategoryFilter) => set({ itemCategoryFilter, itemPage: 1 }),
  setItemTypeFilter: (itemTypeFilter) => set({ itemTypeFilter, itemPage: 1 }),
  setForwarderTypeFilter: (forwarderTypeFilter) => set({ forwarderTypeFilter }),
  setCarrierTypeFilter: (carrierTypeFilter) => set({ carrierTypeFilter }),
  setTaskTemplateDepartmentFilter: (taskTemplateDepartmentFilter) => set({ taskTemplateDepartmentFilter }),
  setTaskTemplateMilestoneFilter: (taskTemplateMilestoneFilter) => set({ taskTemplateMilestoneFilter }),
  clearChargeCodeFilters: () => set({
    chargeCodeStatusFilter: null,
    chargeGroupFilter: null,
    chargeCategoryFilter: null,
    chargeCodeRevCostFilter: null,
    chargeCodeModeFilter: null,
  }),
  clearSupplierFilters: () => set({ supplierStatusFilter: null, supplierTypeFilter: null }),
  clearItemFilters: () => set({
    itemStatusFilter: null,
    itemCategoryFilter: null,
    itemTypeFilter: null,
    itemSearch: '',
    itemPage: 1,
  }),
  clearUomFilters: () => set({ uomStatusFilter: null }),
  clearCurrencyFilters: () => set({ currencyStatusFilter: null }),
  clearIncotermFilters: () => set({ incotermStatusFilter: null }),
  clearTransportModeFilters: () => set({ transportModeStatusFilter: null }),
  clearForwarderFilters: () => set({ forwarderStatusFilter: null, forwarderTypeFilter: null }),
  clearCarrierFilters: () => set({ carrierStatusFilter: null, carrierTypeFilter: null }),
  clearTaskTemplateFilters: () => set({
    taskTemplateStatusFilter: null,
    taskTemplateDepartmentFilter: null,
    taskTemplateMilestoneFilter: null,
  }),
}));
