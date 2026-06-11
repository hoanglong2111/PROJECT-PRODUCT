import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
  type Supplier,
  type TransportMode,
} from '@shared/api/tradeMasterData';
import { queryKeys } from '@shared/api/queryKeys';

type Option = {
  label: string;
  value: string;
};

type UseTradeMasterDataOptionsInput = {
  supplierRole?: string;
};

const shippingMethodValues = new Set(['SEA', 'AIR', 'ROAD']);

export function useTradeMasterDataOptions({ supplierRole }: UseTradeMasterDataOptionsInput = {}) {
  const supplierParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      role: supplierRole,
      is_active: true,
    }),
    [supplierRole],
  );

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchCurrencies({ page: 1, limit: 100, is_active: true }),
  });

  const incotermsQuery = useQuery({
    queryKey: queryKeys.incoterms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchIncoterms({ page: 1, limit: 100, is_active: true }),
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(supplierParams),
    queryFn: () => fetchSuppliers(supplierParams),
  });

  const transportModesQuery = useQuery({
    queryKey: queryKeys.transportModes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchTransportModes({ page: 1, limit: 100, is_active: true }),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const transportModes = transportModesQuery.data?.data ?? [];

  return {
    currencyOptions: useMemo<Option[]>(
      () =>
        (currenciesQuery.data?.data ?? []).map((currency) => ({
          label: `${currency.currency_code} - ${currency.currency_name}`,
          value: currency.currency_code,
        })),
      [currenciesQuery.data],
    ),
    incotermOptions: useMemo<Option[]>(
      () =>
        (incotermsQuery.data?.data ?? []).map((incoterm) => ({
          label: `${incoterm.incoterm_code} - ${incoterm.incoterm_name}`,
          value: incoterm.incoterm_code,
        })),
      [incotermsQuery.data],
    ),
    isLoading:
      currenciesQuery.isLoading ||
      incotermsQuery.isLoading ||
      suppliersQuery.isLoading ||
      transportModesQuery.isLoading,
    supplierOptions: useMemo<Option[]>(
      () =>
        suppliers.map((supplier) => ({
          label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
          value: supplier.supplier_code,
        })),
      [suppliers],
    ),
    suppliers,
    transportModeOptions: useMemo<Option[]>(
      () =>
        transportModes.map((mode) => ({
          label: `${mode.mode_code} - ${mode.mode_name}`,
          value: mode.mode_code,
        })),
      [transportModes],
    ),
    transportModes,
    shippingMethodOptions: useMemo<Option[]>(
      () => buildShippingMethodOptions(transportModes),
      [transportModes],
    ),
  };
}

function buildShippingMethodOptions(transportModes: TransportMode[]) {
  const grouped = new Map<string, TransportMode[]>();

  transportModes.forEach((mode) => {
    if (!shippingMethodValues.has(mode.mode_type)) return;
    grouped.set(mode.mode_type, [...(grouped.get(mode.mode_type) ?? []), mode]);
  });

  return Array.from(grouped.entries()).map(([modeType, modes]) => ({
    label: `${modeType} - ${modes.map((mode) => mode.mode_name).join(', ')}`,
    value: modeType,
  }));
}

export function findSupplierByCode(suppliers: Supplier[], supplierCode: string | null | undefined) {
  if (!supplierCode) return undefined;
  return suppliers.find((supplier) => supplier.supplier_code === supplierCode);
}
