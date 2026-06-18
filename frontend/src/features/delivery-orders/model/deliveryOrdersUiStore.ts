import { create } from 'zustand';

import type { BusinessFlowTag } from '@shared/api/logistics';

import type { DeliveryOrderTab } from './deliveryOrderModel';

// Feature-scoped UI/filter state for the Delivery Orders list, shared between the
// page orchestrator (filtering) and DeliveryOrderListView (controls).
type DeliveryOrdersUiState = {
  activeTab: DeliveryOrderTab;
  flowFilter: BusinessFlowTag | 'all';
  supplierFilter: string | null;
  search: string;
  riskOnly: boolean;
  setActiveTab: (activeTab: DeliveryOrderTab) => void;
  setFlowFilter: (flowFilter: BusinessFlowTag | 'all') => void;
  setSupplierFilter: (supplierFilter: string | null) => void;
  setSearch: (search: string) => void;
  setRiskOnly: (riskOnly: boolean) => void;
  clearFilters: () => void;
};

export const useDeliveryOrdersUiStore = create<DeliveryOrdersUiState>((set) => ({
  activeTab: 'processing',
  flowFilter: 'all',
  supplierFilter: null,
  search: '',
  riskOnly: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setFlowFilter: (flowFilter) => set({ flowFilter }),
  setSupplierFilter: (supplierFilter) => set({ supplierFilter }),
  setSearch: (search) => set({ search }),
  setRiskOnly: (riskOnly) => set({ riskOnly }),
  clearFilters: () => set({ search: '', flowFilter: 'all', supplierFilter: null, riskOnly: false }),
}));
