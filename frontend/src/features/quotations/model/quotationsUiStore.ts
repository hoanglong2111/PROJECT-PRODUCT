import { create } from 'zustand';

import type { QuotationTab } from './quotationModel';

// Feature-scoped UI/filter state for the Quotations list, shared between the page
// orchestrator (filtering) and QuotationListView (controls).
type QuotationsUiState = {
  activeTab: QuotationTab;
  search: string;
  setActiveTab: (activeTab: QuotationTab) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
};

export const useQuotationsUiStore = create<QuotationsUiState>((set) => ({
  activeTab: 'all',
  search: '',
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
  clearFilters: () => set({ search: '' }),
}));
