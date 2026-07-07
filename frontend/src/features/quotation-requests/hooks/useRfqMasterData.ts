import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { containerTypeSelectOptions, fetchContainerTypes } from '@shared/api/containerTypes';
import { fetchItems } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
} from '@shared/api/tradeMasterData';
import { fetchUoms, uomSelectOptions } from '@shared/api/uoms';

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
  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchUoms({ page: 1, limit: 100, is_active: true }),
  });
  const containerTypesQuery = useQuery({
    queryKey: queryKeys.containerTypes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchContainerTypes({ page: 1, limit: 100, is_active: true }),
  });
  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchCurrencies({ page: 1, limit: 100, is_active: true }),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  const incoterms = incotermsQuery.data?.data ?? [];
  const uoms = uomsQuery.data?.data ?? [];
  const containerTypes = containerTypesQuery.data?.data ?? [];
  const currencies = currenciesQuery.data?.data ?? [];

  return {
    suppliers,
    items,
    incoterms,
    uoms,
    containerTypes,
    currencies,
    uomOptions: useMemo<Option[]>(() => uomSelectOptions(uoms), [uoms]),
    containerTypeOptions: useMemo<Option[]>(() => containerTypeSelectOptions(containerTypes), [containerTypes]),
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
      uomsQuery.isLoading ||
      containerTypesQuery.isLoading ||
      currenciesQuery.isLoading,
  };
}
