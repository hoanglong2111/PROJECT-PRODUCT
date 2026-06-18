import { create } from 'zustand';

import type { ShipmentModeV1 } from '@shared/api/shipments';

import type { ShipmentChannelFilter, ShipmentTab } from './shipmentModel';

// Feature-scoped UI/filter state for the Shipments list. Shared between the page
// orchestrator (filtering) and ShipmentListView (controls) without prop-drilling.
type ShipmentsUiState = {
  activeTab: ShipmentTab;
  search: string;
  modeFilter: ShipmentModeV1 | 'all';
  carrierFilter: string | null;
  channelFilter: ShipmentChannelFilter;
  etdFrom: string;
  etdTo: string;
  setActiveTab: (activeTab: ShipmentTab) => void;
  setSearch: (search: string) => void;
  setModeFilter: (modeFilter: ShipmentModeV1 | 'all') => void;
  setCarrierFilter: (carrierFilter: string | null) => void;
  setChannelFilter: (channelFilter: ShipmentChannelFilter) => void;
  setEtdFrom: (etdFrom: string) => void;
  setEtdTo: (etdTo: string) => void;
  clearFilters: () => void;
};

export const useShipmentsUiStore = create<ShipmentsUiState>((set) => ({
  activeTab: 'all',
  search: '',
  modeFilter: 'all',
  carrierFilter: null,
  channelFilter: 'all',
  etdFrom: '',
  etdTo: '',
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
  setModeFilter: (modeFilter) => set({ modeFilter }),
  setCarrierFilter: (carrierFilter) => set({ carrierFilter }),
  setChannelFilter: (channelFilter) => set({ channelFilter }),
  setEtdFrom: (etdFrom) => set({ etdFrom }),
  setEtdTo: (etdTo) => set({ etdTo }),
  clearFilters: () =>
    set({ search: '', modeFilter: 'all', carrierFilter: null, channelFilter: 'all', etdFrom: '', etdTo: '' }),
}));
