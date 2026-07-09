import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';

import {
  getItemCategoryLabel,
  getItemTypeLabel,
  getRevCostLabel,
  getSupplierTypeLabel,
  ITEM_CATEGORY_VALUES,
  ITEM_TYPE_VALUES,
  SUPPLIER_TYPE_VALUES,
} from '../model/masterDataModel';
import { useMasterDataStore } from '../model/masterDataStore';

// Charge codes total ~79; fetch all so the group switcher counts and filtering
// operate over the whole set rather than a single 20-row page.
export const CHARGE_CODE_FETCH_LIMIT = 500;
// Suppliers/items (and other client-filtered reference lists) also filter attributes
// client-side, so they must load the whole set — otherwise a client filter (or the
// always-on type filter) would only see the first server page and hide the rest.
export const REFERENCE_FETCH_LIMIT = 500;

const CHARGE_MODES = [
  { value: 'sea_fcl', labelKey: 'masterData.seaFcl' },
  { value: 'sea_lcl', labelKey: 'masterData.seaLcl' },
  { value: 'air', labelKey: 'masterData.air' },
  { value: 'road', labelKey: 'masterData.road' },
  { value: 'rail', labelKey: 'masterData.rail' },
];

export type MasterDataFilterOptions = ReturnType<typeof useMasterDataFilterOptions>;

/**
 * Select options and derived client-side filters for the master-data tabs,
 * plus the shared UoM options used by the item/charge-code modals.
 */
export function useMasterDataFilterOptions({ uomOptionsEnabled }: { uomOptionsEnabled: boolean }) {
  const { t } = useI18n();
  const {
    activeTab,
    chargeCategoryFilter,
    chargeCodeModeFilter,
    chargeCodeRevCostFilter,
    chargeCodeStatusFilter,
    chargeGroupFilter,
  } = useMasterDataStore();

  const uomOptionsQuery = useQuery({
    queryKey: queryKeys.uoms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchUoms({ page: 1, limit: 100, is_active: true }),
    enabled: uomOptionsEnabled,
  });

  const chargeCodeAllQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: CHARGE_CODE_FETCH_LIMIT, search: undefined }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: CHARGE_CODE_FETCH_LIMIT }),
    enabled: activeTab === 'chargeCodes',
  });

  const chargeGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const code of chargeCodeAllQuery.data?.data ?? []) {
      counts[code.group] = (counts[code.group] ?? 0) + 1;
    }
    return counts;
  }, [chargeCodeAllQuery.data]);
  const chargeCodeTotal = chargeCodeAllQuery.data?.data?.length ?? 0;

  const chargeCategoryOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...CHARGE_CATEGORIES.map((category) => ({ label: category.docLabel, value: category.value })),
    ],
    [t],
  );
  const chargeGroupOptions = useMemo(
    () => [
      { label: `${t('common.all')} (${chargeCodeTotal})`, value: 'ALL' },
      ...CHARGE_GROUPS.map((group) => ({
        label: `${group.docLabel} (${chargeGroupCounts[group.value] ?? 0})`,
        value: group.value,
      })),
    ],
    [chargeCodeTotal, chargeGroupCounts, t],
  );
  const chargeRevCostOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      { label: getRevCostLabel('REVENUE'), value: 'REVENUE' },
      { label: getRevCostLabel('COST'), value: 'COST' },
      { label: getRevCostLabel('BOTH'), value: 'BOTH' },
    ],
    [t],
  );
  const chargeModeOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...CHARGE_MODES.map((mode) => ({ label: t(mode.labelKey), value: mode.value })),
    ],
    [t],
  );
  const supplierTypeOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...SUPPLIER_TYPE_VALUES.map((value) => ({ label: getSupplierTypeLabel(value, t), value })),
    ],
    [t],
  );
  const itemCategoryOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...ITEM_CATEGORY_VALUES.map((value) => ({ label: getItemCategoryLabel(value, t), value })),
    ],
    [t],
  );
  const itemTypeOptions = useMemo(
    () => [
      { label: t('common.all'), value: 'ALL' },
      ...ITEM_TYPE_VALUES.map((value) => ({ label: getItemTypeLabel(value, t), value })),
    ],
    [t],
  );

  const chargeCodeFilter = useMemo(
    () => (chargeGroupFilter || chargeCategoryFilter || chargeCodeRevCostFilter || chargeCodeModeFilter || chargeCodeStatusFilter !== null
      ? (chargeCode: ChargeCode) =>
        (!chargeGroupFilter || chargeCode.group === chargeGroupFilter) &&
        (!chargeCategoryFilter || chargeCode.category === chargeCategoryFilter) &&
        (!chargeCodeRevCostFilter || chargeCode.rev_cost === chargeCodeRevCostFilter) &&
        (!chargeCodeModeFilter || chargeCode[chargeCodeModeFilter as keyof Pick<ChargeCode, 'sea_fcl' | 'sea_lcl' | 'air' | 'road' | 'rail'>] === true) &&
        (chargeCodeStatusFilter === null || chargeCode.is_active === chargeCodeStatusFilter)
      : undefined),
    [chargeCategoryFilter, chargeCodeModeFilter, chargeCodeRevCostFilter, chargeCodeStatusFilter, chargeGroupFilter],
  );

  const uomOptions = useMemo(
    () =>
      (uomOptionsQuery.data?.data ?? []).map((uom) => ({
        label: `${uom.uom_code} - ${uom.uom_name_en}`,
        value: uom.uom_code,
      })),
    [uomOptionsQuery.data],
  );

  return {
    chargeCategoryOptions,
    chargeCodeFilter,
    chargeGroupOptions,
    chargeModeOptions,
    chargeRevCostOptions,
    itemCategoryOptions,
    itemTypeOptions,
    supplierTypeOptions,
    uomOptions,
  };
}
