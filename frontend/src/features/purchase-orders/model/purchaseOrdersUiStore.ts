import { create } from 'zustand';

import type { PurchaseOrderStatusFilter } from './purchaseOrderModel';

// Feature-scoped UI/filter state for the Purchase Orders list, shared between the
// page orchestrator (query params) and PurchaseOrderListView (controls).
type PurchaseOrdersUiState = {
  search: string;
  statusFilter: PurchaseOrderStatusFilter;
  supplierFilter: string | null;
  dateFrom: string;
  dateTo: string;
  setSearch: (search: string) => void;
  setStatusFilter: (statusFilter: PurchaseOrderStatusFilter) => void;
  setSupplierFilter: (supplierFilter: string | null) => void;
  setDateFrom: (dateFrom: string) => void;
  setDateTo: (dateTo: string) => void;
  clearFilters: () => void;
};

export const usePurchaseOrdersUiStore = create<PurchaseOrdersUiState>((set) => ({
  search: '',
  statusFilter: 'all',
  supplierFilter: null,
  dateFrom: '',
  dateTo: '',
  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSupplierFilter: (supplierFilter) => set({ supplierFilter }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  clearFilters: () => set({ search: '', statusFilter: 'all', supplierFilter: null, dateFrom: '', dateTo: '' }),
}));
