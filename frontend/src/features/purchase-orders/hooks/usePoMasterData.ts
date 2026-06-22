import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchItems, type Item } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
  type Currency,
  type Incoterm,
  type Supplier,
  type TransportMode,
} from '@shared/api/tradeMasterData';

export function usePoMasterData() {
  const supplierParams = useMemo(() => ({ page: 1, limit: 100, role: 'SUPPLIER', is_active: true }), []);
  const activeParams = useMemo(() => ({ page: 1, limit: 100, is_active: true }), []);
  const itemParams = useMemo(() => ({ page: 1, limit: 100 }), []);

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(supplierParams),
    queryFn: () => fetchSuppliers(supplierParams),
  });
  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(activeParams),
    queryFn: () => fetchCurrencies(activeParams),
  });
  const incotermsQuery = useQuery({
    queryKey: queryKeys.incoterms(activeParams),
    queryFn: () => fetchIncoterms(activeParams),
  });
  const transportModesQuery = useQuery({
    queryKey: queryKeys.transportModes(activeParams),
    queryFn: () => fetchTransportModes(activeParams),
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.items(itemParams),
    queryFn: () => fetchItems(itemParams),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const currencies = currenciesQuery.data?.data ?? [];
  const incoterms = incotermsQuery.data?.data ?? [];
  const transportModes = transportModesQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];

  return {
    suppliers,
    currencies,
    incoterms,
    transportModes,
    items,
    supplierOptions: suppliers.map((supplier: Supplier) => ({
      label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
      value: supplier.id,
    })),
    currencyOptions: currencies.map((currency: Currency) => ({
      label: `${currency.currency_code} - ${currency.currency_name}`,
      value: currency.id,
    })),
    incotermOptions: incoterms.map((incoterm: Incoterm) => ({
      label: `${incoterm.incoterm_code} - ${incoterm.incoterm_name}`,
      value: incoterm.id,
    })),
    transportModeOptions: transportModes.map((mode: TransportMode) => ({
      label: `${mode.mode_code} - ${mode.mode_name}`,
      value: mode.id,
    })),
    itemOptions: items.map((item: Item) => ({
      label: `${item.item_code} - ${item.item_name}`,
      value: item.id,
    })),
  };
}
