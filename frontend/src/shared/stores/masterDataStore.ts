import { create } from 'zustand';

type MasterDataTab = 'currencies' | 'incoterms' | 'items' | 'partners' | 'ports' | 'suppliers' | 'transportModes';

type MasterDataState = {
  activeTab: MasterDataTab;
  itemGroupFilter: string | null;
  itemGroupSearch: string;
  itemPage: number;
  itemSearch: string;
  partnerSearch: string;
  portSearch: string;
  setActiveTab: (activeTab: MasterDataTab) => void;
  setItemGroupFilter: (itemGroupFilter: string | null) => void;
  setItemGroupSearch: (itemGroupSearch: string) => void;
  setItemPage: (itemPage: number) => void;
  setItemSearch: (itemSearch: string) => void;
  setPartnerSearch: (partnerSearch: string) => void;
  setPortSearch: (portSearch: string) => void;
};

export const useMasterDataStore = create<MasterDataState>((set) => ({
  activeTab: 'partners',
  itemGroupFilter: null,
  itemGroupSearch: '',
  itemPage: 1,
  itemSearch: '',
  partnerSearch: '',
  portSearch: '',
  setActiveTab: (activeTab) => set({ activeTab }),
  setItemGroupFilter: (itemGroupFilter) => set({ itemGroupFilter, itemPage: 1 }),
  setItemGroupSearch: (itemGroupSearch) => set({ itemGroupSearch }),
  setItemPage: (itemPage) => set({ itemPage }),
  setItemSearch: (itemSearch) => set({ itemSearch, itemPage: 1 }),
  setPartnerSearch: (partnerSearch) => set({ partnerSearch }),
  setPortSearch: (portSearch) => set({ portSearch }),
}));
