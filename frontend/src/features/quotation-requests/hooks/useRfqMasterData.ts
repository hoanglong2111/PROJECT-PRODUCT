import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchItems } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
} from '@shared/api/tradeMasterData';

type Option = {
  label: string;
  value: string;
};

export function useRfqMasterData() {
  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers({ page: 1, limit: 100, role: 'SUPPLIER', is_active: true }),
    queryFn: () => fetchSuppliers({ page: 1, limit: 100, role: 'SUPPLIER', is_active: true }),
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.items({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchItems({ page: 1, limit: 200, is_active: true }),
  });
  const incotermsQuery = useQuery({
    queryKey: queryKeys.incoterms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchIncoterms({ page: 1, limit: 100, is_active: true }),
  });
  const transportModesQuery = useQuery({
    queryKey: queryKeys.transportModes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchTransportModes({ page: 1, limit: 100, is_active: true }),
  });
  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchCurrencies({ page: 1, limit: 100, is_active: true }),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  const incoterms = incotermsQuery.data?.data ?? [];
  const transportModes = transportModesQuery.data?.data ?? [];
  const currencies = currenciesQuery.data?.data ?? [];

  return {
    suppliers,
    items,
    incoterms,
    transportModes,
    currencies,
    supplierOptions: useMemo<Option[]>(
      () => suppliers.map((supplier) => ({
        value: supplier.id,
        label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
      })),
      [suppliers],
    ),
    itemOptions: useMemo<Option[]>(
      () => items.map((item) => ({
        value: item.id,
        label: `${item.item_code} - ${item.item_name_en ?? item.item_name}`,
      })),
      [items],
    ),
    incotermOptions: useMemo<Option[]>(
      () => incoterms.map((incoterm) => ({
        value: incoterm.incoterm_code,
        label: `${incoterm.incoterm_code} - ${incoterm.incoterm_name}`,
      })),
      [incoterms],
    ),
    currencyOptions: useMemo<Option[]>(
      () => currencies.map((currency) => ({
        value: currency.currency_code,
        label: `${currency.currency_code} - ${currency.currency_name}`,
      })),
      [currencies],
    ),
    isLoading:
      suppliersQuery.isLoading ||
      itemsQuery.isLoading ||
      incotermsQuery.isLoading ||
      transportModesQuery.isLoading ||
      currenciesQuery.isLoading,
  };
}
