import { create } from 'zustand';

import type { QuotationTypeV1 } from '@shared/api/quotations';
import type { QuotationTab } from './quotationModel';

type QuotationsUiState = {
  activeTab: QuotationTab;
  search: string;
  typeFilter: QuotationTypeV1 | 'all';
  supplierFilter: string | null;
  modeFilter: string | 'all';
  createdFrom: string;
  createdTo: string;
  validFrom: string;
  validTo: string;
  setActiveTab: (activeTab: QuotationTab) => void;
  setSearch: (search: string) => void;
  setTypeFilter: (typeFilter: QuotationTypeV1 | 'all') => void;
  setSupplierFilter: (supplierFilter: string | null) => void;
  setModeFilter: (modeFilter: string | 'all') => void;
  setCreatedFrom: (createdFrom: string) => void;
  setCreatedTo: (createdTo: string) => void;
  setValidFrom: (validFrom: string) => void;
  setValidTo: (validTo: string) => void;
  clearFilters: () => void;
};

const INITIAL = {
  search: '',
  typeFilter: 'all' as const,
  supplierFilter: null,
  modeFilter: 'all' as const,
  createdFrom: '',
  createdTo: '',
  validFrom: '',
  validTo: '',
};

export const useQuotationsUiStore = create<QuotationsUiState>((set) => ({
  activeTab: 'all',
  ...INITIAL,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSupplierFilter: (supplierFilter) => set({ supplierFilter }),
  setModeFilter: (modeFilter) => set({ modeFilter }),
  setCreatedFrom: (createdFrom) => set({ createdFrom }),
  setCreatedTo: (createdTo) => set({ createdTo }),
  setValidFrom: (validFrom) => set({ validFrom }),
  setValidTo: (validTo) => set({ validTo }),
  clearFilters: () => set({ ...INITIAL }),
}));
