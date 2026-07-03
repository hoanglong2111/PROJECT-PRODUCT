import { create } from 'zustand';

import type { QuotationTypeV1 } from '@shared/api/quotations';
import type { QuotationTab } from './quotationModel';

type QuotationsUiState = {
  activeTab: QuotationTab;
  search: string;
  typeFilter: QuotationTypeV1 | 'all';
  supplierFilter: string | null;
  createdFrom: string;
  createdTo: string;
  setActiveTab: (activeTab: QuotationTab) => void;
  setSearch: (search: string) => void;
  setTypeFilter: (typeFilter: QuotationTypeV1 | 'all') => void;
  setSupplierFilter: (supplierFilter: string | null) => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;
  clearFilters: () => void;
};

const INITIAL = {
  search: '',
  typeFilter: 'all' as const,
  supplierFilter: null,
  createdFrom: '',
  createdTo: '',
};

export const useQuotationsUiStore = create<QuotationsUiState>((set) => ({
  activeTab: 'all',
  ...INITIAL,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSupplierFilter: (supplierFilter) => set({ supplierFilter }),
  setCreatedFrom: (createdFrom) => set({ createdFrom }),
  setCreatedTo: (createdTo) => set({ createdTo }),
  clearFilters: () => set({ ...INITIAL }),
}));
