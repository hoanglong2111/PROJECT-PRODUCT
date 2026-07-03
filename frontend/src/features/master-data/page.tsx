import { Alert, Badge, Group, Select, Stack, Tabs, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertCircle,
  IconCash,
  IconClipboardList,
  IconFileCode,
  IconMapPin,
  IconReceiptTax,
  IconRoute,
  IconRulerMeasure,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import {
  deleteChargeCode,
  fetchChargeCodes,
  type ChargeCode,
} from '@shared/api/chargeCodes';
import {
  deleteCarrier,
  deleteForwarder,
  type Carrier,
  type Forwarder,
} from '@shared/api/forwarders';
import {
  deleteItem,
  fetchItems,
  type Item,
} from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import { deleteTaskTemplate, type TaskTemplate } from '@shared/api/taskTemplates';
import {
  deleteCurrency,
  deleteIncoterm,
  deleteSupplier,
  deleteTransportMode,
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
  type Currency,
  type Incoterm,
  type Supplier,
  type TransportMode,
} from '@shared/api/tradeMasterData';
import { deleteUom, fetchUoms, type Uom } from '@shared/api/uoms';
import { useCan } from '@shared/auth/useCan';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';
import { useMasterDataStore } from './model/masterDataStore';

import {
  getItemCategoryLabel,
  getItemTypeLabel,
  getRevCostLabel,
  getSupplierTypeLabel,
  ITEM_CATEGORY_VALUES,
  ITEM_TYPE_VALUES,
  SUPPLIER_TYPE_VALUES,
} from './model/masterDataModel';
import { CarrierModal } from './components/CarrierModal';
import { ChargeCodeModal } from './components/ChargeCodeModal';
import { CurrencyModal } from './components/CurrencyModal';
import { ForwarderModal } from './components/ForwarderModal';
import { ForwardersCarriersSection } from './components/ForwardersCarriersSection';
import { IncotermModal } from './components/IncotermModal';
import { ItemModal } from './components/ItemModal';
import { FILTER_SELECT_WIDTH } from './components/MasterDataToolbar';
import { ReferenceDataPanel } from './components/ReferenceDataPanel';
import {
  buildChargeCodeColumns,
  buildCurrencyColumns,
  buildIncotermColumns,
  buildItemColumns,
  buildSupplierColumns,
  buildTransportModeColumns,
  buildUomColumns,
} from './components/referenceColumns';
import { SupplierModal } from './components/SupplierModal';
import { TaskTemplateModal } from './components/TaskTemplateModal';
import { TaskTemplatesSection } from './components/TaskTemplatesSection';
import { TransportModeModal } from './components/TransportModeModal';
import { UomModal } from './components/UomModal';

// Charge codes total ~79; fetch all so the group switcher counts and filtering
// operate over the whole set rather than a single 20-row page.
const CHARGE_CODE_FETCH_LIMIT = 500;
// Suppliers/items (and other client-filtered reference lists) also filter attributes
// client-side, so they must load the whole set — otherwise a client filter (or the
// always-on type filter) would only see the first server page and hide the rest.
const REFERENCE_FETCH_LIMIT = 500;
const CHARGE_MODES = [
  { value: 'sea_fcl', labelKey: 'masterData.seaFcl' },
  { value: 'sea_lcl', labelKey: 'masterData.seaLcl' },
  { value: 'air', labelKey: 'masterData.air' },
  { value: 'road', labelKey: 'masterData.road' },
  { value: 'rail', labelKey: 'masterData.rail' },
];

export function MasterData() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const canManageMasterData = useCan('masterData.manage');
  const {
    activeTab,
    carrierStatusFilter,
    carrierTypeFilter,
    chargeCategoryFilter,
    chargeCodeModeFilter,
    chargeCodeRevCostFilter,
    chargeCodeStatusFilter,
    chargeGroupFilter,
    clearCarrierFilters,
    clearChargeCodeFilters,
    clearCurrencyFilters,
    clearForwarderFilters,
    clearIncotermFilters,
    clearItemFilters,
    clearSupplierFilters,
    clearTaskTemplateFilters,
    clearTransportModeFilters,
    clearUomFilters,
    currencyStatusFilter,
    forwarderStatusFilter,
    forwarderTypeFilter,
    incotermStatusFilter,
    itemCategoryFilter,
    itemStatusFilter,
    itemTypeFilter,
    setActiveTab,
    setCarrierStatusFilter,
    setCarrierTypeFilter,
    setChargeCategoryFilter,
    setChargeCodeModeFilter,
    setChargeCodeRevCostFilter,
    setChargeCodeStatusFilter,
    setChargeGroupFilter,
    setCurrencyStatusFilter,
    setForwarderStatusFilter,
    setForwarderTypeFilter,
    setIncotermStatusFilter,
    setItemCategoryFilter,
    setItemStatusFilter,
    setItemTypeFilter,
    setSupplierStatusFilter,
    setSupplierTypeFilter,
    setTaskTemplateDepartmentFilter,
    setTaskTemplateMilestoneFilter,
    setTaskTemplateStatusFilter,
    setTransportModeStatusFilter,
    setUomStatusFilter,
    supplierStatusFilter,
    supplierTypeFilter,
    taskTemplateDepartmentFilter,
    taskTemplateMilestoneFilter,
    taskTemplateStatusFilter,
    transportModeStatusFilter,
    uomStatusFilter,
  } = useMasterDataStore();

  const [itemModalOpened, itemModalHandlers] = useDisclosure(false);
  const [currencyModalOpened, currencyModalHandlers] = useDisclosure(false);
  const [incotermModalOpened, incotermModalHandlers] = useDisclosure(false);
  const [transportModeModalOpened, transportModeModalHandlers] = useDisclosure(false);
  const [chargeCodeModalOpened, chargeCodeModalHandlers] = useDisclosure(false);
  const [uomModalOpened, uomModalHandlers] = useDisclosure(false);
  const [supplierModalOpened, supplierModalHandlers] = useDisclosure(false);
  const [forwarderModalOpened, forwarderModalHandlers] = useDisclosure(false);
  const [carrierModalOpened, carrierModalHandlers] = useDisclosure(false);
  const [taskTemplateModalOpened, taskTemplateModalHandlers] = useDisclosure(false);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingIncoterm, setEditingIncoterm] = useState<Incoterm | null>(null);
  const [editingTransportMode, setEditingTransportMode] = useState<TransportMode | null>(null);
  const [editingChargeCode, setEditingChargeCode] = useState<ChargeCode | null>(null);
  const [editingUom, setEditingUom] = useState<Uom | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingForwarder, setEditingForwarder] = useState<Forwarder | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [editingTaskTemplate, setEditingTaskTemplate] = useState<TaskTemplate | null>(null);

  const uomOptionsQuery = useQuery({
    queryKey: queryKeys.uoms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchUoms({ page: 1, limit: 100, is_active: true }),
    enabled:
      activeTab === 'items' ||
      activeTab === 'chargeCodes' ||
      activeTab === 'uoms' ||
      itemModalOpened ||
      chargeCodeModalOpened ||
      uomModalOpened,
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

  const invalidateTradeMasterData = (queryKey: readonly unknown[]) => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
    ]);
  };

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.itemLists });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: deleteCurrency,
    onSuccess: () => invalidateTradeMasterData(queryKeys.currencyLists),
  });

  const deleteIncotermMutation = useMutation({
    mutationFn: deleteIncoterm,
    onSuccess: () => invalidateTradeMasterData(queryKeys.incotermLists),
  });

  const deleteTransportModeMutation = useMutation({
    mutationFn: deleteTransportMode,
    onSuccess: () => invalidateTradeMasterData(queryKeys.transportModeLists),
  });

  const deleteChargeCodeMutation = useMutation({
    mutationFn: deleteChargeCode,
    onSuccess: () => invalidateTradeMasterData(queryKeys.chargeCodeLists),
  });

  const deleteUomMutation = useMutation({
    mutationFn: deleteUom,
    onSuccess: () => invalidateTradeMasterData(queryKeys.uomLists),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => invalidateTradeMasterData(queryKeys.supplierLists),
  });

  const deleteForwarderMutation = useMutation({
    mutationFn: deleteForwarder,
    onSuccess: () => invalidateTradeMasterData(queryKeys.forwarderLists),
  });

  const deleteCarrierMutation = useMutation({
    mutationFn: deleteCarrier,
    onSuccess: () => invalidateTradeMasterData(queryKeys.carrierLists),
  });

  const deleteTaskTemplateMutation = useMutation({
    mutationFn: deleteTaskTemplate,
    onSuccess: () => invalidateTradeMasterData(queryKeys.taskTemplateLists),
  });

  const openAddCurrency = () => { setEditingCurrency(null); currencyModalHandlers.open(); };
  const openEditCurrency = (currency: Currency) => { setEditingCurrency(currency); currencyModalHandlers.open(); };

  const openAddIncoterm = () => { setEditingIncoterm(null); incotermModalHandlers.open(); };
  const openEditIncoterm = (incoterm: Incoterm) => { setEditingIncoterm(incoterm); incotermModalHandlers.open(); };

  const openAddTransportMode = () => { setEditingTransportMode(null); transportModeModalHandlers.open(); };
  const openEditTransportMode = (mode: TransportMode) => { setEditingTransportMode(mode); transportModeModalHandlers.open(); };

  const openAddChargeCode = () => { setEditingChargeCode(null); chargeCodeModalHandlers.open(); };
  const openEditChargeCode = (chargeCode: ChargeCode) => { setEditingChargeCode(chargeCode); chargeCodeModalHandlers.open(); };

  const openAddUom = () => { setEditingUom(null); uomModalHandlers.open(); };
  const openEditUom = (uom: Uom) => { setEditingUom(uom); uomModalHandlers.open(); };

  const openAddSupplier = () => { setEditingSupplier(null); supplierModalHandlers.open(); };
  const openEditSupplier = (supplier: Supplier) => { setEditingSupplier(supplier); supplierModalHandlers.open(); };

  const openAddForwarder = () => { setEditingForwarder(null); forwarderModalHandlers.open(); };
  const openEditForwarder = (forwarder: Forwarder) => { setEditingForwarder(forwarder); forwarderModalHandlers.open(); };

  const openAddCarrier = () => { setEditingCarrier(null); carrierModalHandlers.open(); };
  const openEditCarrier = (carrier: Carrier) => { setEditingCarrier(carrier); carrierModalHandlers.open(); };

  const openAddTaskTemplate = () => { setEditingTaskTemplate(null); taskTemplateModalHandlers.open(); };
  const openEditTaskTemplate = (template: TaskTemplate) => { setEditingTaskTemplate(template); taskTemplateModalHandlers.open(); };

  const openAddItem = () => { setEditingItem(null); itemModalHandlers.open(); };
  const openEditItem = (item: Item) => { setEditingItem(item); itemModalHandlers.open(); };

  const handleDeleteCurrency = (currency: Currency) => {
    if (!window.confirm(t('masterData.confirmDeleteCurrency'))) return;
    deleteCurrencyMutation.mutate(currency.id);
  };
  const handleDeleteIncoterm = (incoterm: Incoterm) => {
    if (!window.confirm(t('masterData.confirmDeleteIncoterm'))) return;
    deleteIncotermMutation.mutate(incoterm.id);
  };
  const handleDeleteTransportMode = (mode: TransportMode) => {
    if (!window.confirm(t('masterData.confirmDeleteTransportMode'))) return;
    deleteTransportModeMutation.mutate(mode.id);
  };
  const handleDeleteChargeCode = (chargeCode: ChargeCode) => {
    if (!window.confirm(t('masterData.confirmDeleteChargeCode'))) return;
    deleteChargeCodeMutation.mutate(chargeCode.id);
  };
  const handleDeleteUom = (uom: Uom) => {
    if (!window.confirm(t('masterData.confirmDeleteUom'))) return;
    deleteUomMutation.mutate(uom.id);
  };
  const handleDeleteSupplier = (supplier: Supplier) => {
    if (!window.confirm(t('masterData.confirmDeleteSupplier'))) return;
    deleteSupplierMutation.mutate(supplier.id);
  };
  const handleDeleteForwarder = (forwarder: Forwarder) => {
    if (!window.confirm(t('masterData.confirmDeleteForwarder'))) return;
    deleteForwarderMutation.mutate(forwarder.id);
  };
  const handleDeleteCarrier = (carrier: Carrier) => {
    if (!window.confirm(t('masterData.confirmDeleteCarrier'))) return;
    deleteCarrierMutation.mutate(carrier.id);
  };
  const handleDeleteTaskTemplate = (template: TaskTemplate) => {
    if (!window.confirm(t('masterData.confirmDeleteTaskTemplate'))) return;
    deleteTaskTemplateMutation.mutate(template.id);
  };
  const handleDeleteItem = (item: Item) => {
    if (!window.confirm(t('masterData.confirmDeleteItem'))) return;
    deleteItemMutation.mutate(item.id);
  };

  const hasSupplierFilters = supplierStatusFilter !== null || supplierTypeFilter !== null;
  const hasItemFilters = itemStatusFilter !== null || itemCategoryFilter !== null || itemTypeFilter !== null;
  const hasForwarderFilters = forwarderStatusFilter !== null || forwarderTypeFilter !== null;
  const hasCarrierFilters = carrierStatusFilter !== null || carrierTypeFilter !== null;
  const hasTaskTemplateFilters = taskTemplateStatusFilter !== null || taskTemplateDepartmentFilter !== null || taskTemplateMilestoneFilter !== null;
  const hasCurrencyFilters = currencyStatusFilter !== null;
  const hasIncotermFilters = incotermStatusFilter !== null;
  const hasTransportModeFilters = transportModeStatusFilter !== null;
  const hasChargeCodeFilters = chargeCodeStatusFilter !== null ||
    chargeGroupFilter !== null ||
    chargeCategoryFilter !== null ||
    chargeCodeRevCostFilter !== null ||
    chargeCodeModeFilter !== null;
  const hasUomFilters = uomStatusFilter !== null;

  const itemColumns = useMemo(() => buildItemColumns(t), [t]);
  const currencyColumns = useMemo(() => buildCurrencyColumns(t), [t]);
  const incotermColumns = useMemo(() => buildIncotermColumns(t), [t]);
  const transportModeColumns = useMemo(() => buildTransportModeColumns(t), [t]);
  const chargeCodeColumns = useMemo(() => buildChargeCodeColumns(t), [t]);
  const uomColumns = useMemo(() => buildUomColumns(t), [t]);
  const supplierColumns = useMemo(() => buildSupplierColumns(t), [t]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" className="dl-page-header">
        <div className="dl-page-title-block">
          <Title order={1}>{t('masterData.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('masterData.subtitle')}
          </Text>
        </div>
        {!canManageMasterData && (
          <Badge color="blue" variant="filled" size="lg" leftSection={<IconAlertCircle size={14} />}>
            {t('masterData.readOnlyBadge')}
          </Badge>
        )}
      </Group>

      {!canManageMasterData && (
        <Alert color="blue" variant="light" title={t('masterData.readOnlyBadge')} icon={<IconAlertCircle size={18} />}>
          {t('masterData.readOnlyAlert')}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(val) => setActiveTab((val || 'suppliers') as typeof activeTab)}>
        <Group align="center" gap="md" wrap="wrap">
          <div className="md-tab-group">
            <Tabs.List>
              <Tabs.Tab value="items" leftSection={<IconFileCode size={16} />}>
                {t('masterData.tabItems')}
              </Tabs.Tab>
              <Tabs.Tab value="suppliers" leftSection={<IconTruckDelivery size={16} />}>
                {t('masterData.tabSuppliers')}
              </Tabs.Tab>
              <Tabs.Tab value="forwarders" leftSection={<IconRoute size={16} />}>
                {t('masterData.tabForwarders')}
              </Tabs.Tab>
              <Tabs.Tab value="taskTemplates" leftSection={<IconClipboardList size={16} />}>
                {t('masterData.tabTaskTemplates')}
              </Tabs.Tab>
            </Tabs.List>
          </div>
          <div className="md-tab-group">
            <Tabs.List>
              <Tabs.Tab value="currencies" leftSection={<IconCash size={16} />}>
                {t('masterData.tabCurrencies')}
              </Tabs.Tab>
              <Tabs.Tab value="incoterms" leftSection={<IconRoute size={16} />}>
                {t('masterData.tabIncoterms')}
              </Tabs.Tab>
              <Tabs.Tab value="transportModes" leftSection={<IconMapPin size={16} />}>
                {t('masterData.tabTransportModes')}
              </Tabs.Tab>
              <Tabs.Tab value="chargeCodes" leftSection={<IconReceiptTax size={16} />}>
                {t('masterData.tabChargeCodes')}
              </Tabs.Tab>
              <Tabs.Tab value="uoms" leftSection={<IconRulerMeasure size={16} />}>
                {t('masterData.tabUoms')}
              </Tabs.Tab>
            </Tabs.List>
          </div>
        </Group>

        <Tabs.Panel value="items" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addItem')}
            canManage={canManageMasterData}
            title={t('masterData.itemCatalogTitle')}
            searchPlaceholder={t('masterData.searchItems')}
            emptyTitle={t('masterData.noItems')}
            emptyDescription={t('masterData.noItemsDescription')}
            columns={itemColumns}
            queryKey={queryKeys.items}
            fetcher={({ search, ...params }) => fetchItems({ ...params, q: search })}
            pageSize={REFERENCE_FETCH_LIMIT}
            statusFilter={itemStatusFilter}
            onStatusFilterChange={setItemStatusFilter}
            hasActiveFilters={hasItemFilters}
            onClearFilters={clearItemFilters}
            clientFilter={(item) =>
              (!itemCategoryFilter || item.item_category === itemCategoryFilter) &&
              (!itemTypeFilter || item.item_type === itemTypeFilter)}
            toolbarExtra={(
              <>
                <Select
                  className="md-filter-select"
                  label={t('masterData.itemCategory')}
                  data={itemCategoryOptions}
                  value={itemCategoryFilter ?? 'ALL'}
                  onChange={(value) => setItemCategoryFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
                <Select
                  className="md-filter-select"
                  label={t('masterData.itemType')}
                  data={itemTypeOptions}
                  value={itemTypeFilter ?? 'ALL'}
                  onChange={(value) => setItemTypeFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
              </>
            )}
            onAdd={openAddItem}
            onEdit={openEditItem}
            onDelete={handleDeleteItem}
          />
        </Tabs.Panel>

        <Tabs.Panel value="suppliers" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addSupplier')}
            canManage={canManageMasterData}
            title={t('masterData.suppliersTitle')}
            searchPlaceholder={t('masterData.searchSuppliers')}
            emptyTitle={t('masterData.noSuppliers')}
            emptyDescription={t('masterData.noSuppliersDescription')}
            columns={supplierColumns}
            queryKey={queryKeys.suppliers}
            fetcher={fetchSuppliers}
            pageSize={REFERENCE_FETCH_LIMIT}
            statusFilter={supplierStatusFilter}
            onStatusFilterChange={setSupplierStatusFilter}
            hasActiveFilters={hasSupplierFilters}
            onClearFilters={clearSupplierFilters}
            clientFilter={(supplier) => !supplierTypeFilter || supplier.supplier_type === supplierTypeFilter}
            toolbarExtra={(
              <Select
                className="md-filter-select"
                label={t('masterData.supplierType')}
                data={supplierTypeOptions}
                value={supplierTypeFilter ?? 'ALL'}
                onChange={(value) => setSupplierTypeFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
            )}
            onAdd={openAddSupplier}
            onEdit={openEditSupplier}
            onDelete={handleDeleteSupplier}
          />
        </Tabs.Panel>

        <Tabs.Panel value="forwarders" pt="md">
          <ForwardersCarriersSection
            canManage={canManageMasterData}
            onAddForwarder={openAddForwarder}
            onAddCarrier={openAddCarrier}
            onEditForwarder={openEditForwarder}
            onEditCarrier={openEditCarrier}
            onDeleteForwarder={handleDeleteForwarder}
            onDeleteCarrier={handleDeleteCarrier}
          />
        </Tabs.Panel>

        <Tabs.Panel value="taskTemplates" pt="md">
          <TaskTemplatesSection
            canManage={canManageMasterData}
            departmentFilter={taskTemplateDepartmentFilter}
            hasActiveFilters={hasTaskTemplateFilters}
            milestoneFilter={taskTemplateMilestoneFilter}
            onAdd={openAddTaskTemplate}
            onClearFilters={clearTaskTemplateFilters}
            onDelete={handleDeleteTaskTemplate}
            onDepartmentFilterChange={setTaskTemplateDepartmentFilter}
            onEdit={openEditTaskTemplate}
            onMilestoneFilterChange={setTaskTemplateMilestoneFilter}
            onStatusFilterChange={setTaskTemplateStatusFilter}
            statusFilter={taskTemplateStatusFilter}
          />
        </Tabs.Panel>

        <Tabs.Panel value="currencies" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addCurrency')}
            canManage={canManageMasterData}
            title={t('masterData.currenciesTitle')}
            searchPlaceholder={t('masterData.searchCurrencies')}
            emptyTitle={t('masterData.noCurrencies')}
            emptyDescription={t('masterData.noCurrenciesDescription')}
            columns={currencyColumns}
            queryKey={queryKeys.currencies}
            fetcher={fetchCurrencies}
            statusFilter={currencyStatusFilter}
            onStatusFilterChange={setCurrencyStatusFilter}
            hasActiveFilters={hasCurrencyFilters}
            onClearFilters={clearCurrencyFilters}
            onAdd={openAddCurrency}
            onEdit={openEditCurrency}
            onDelete={handleDeleteCurrency}
          />
        </Tabs.Panel>

        <Tabs.Panel value="incoterms" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addIncoterm')}
            canManage={canManageMasterData}
            title={t('masterData.incotermsTitle')}
            searchPlaceholder={t('masterData.searchIncoterms')}
            emptyTitle={t('masterData.noIncoterms')}
            emptyDescription={t('masterData.noIncotermsDescription')}
            columns={incotermColumns}
            queryKey={queryKeys.incoterms}
            fetcher={fetchIncoterms}
            statusFilter={incotermStatusFilter}
            onStatusFilterChange={setIncotermStatusFilter}
            hasActiveFilters={hasIncotermFilters}
            onClearFilters={clearIncotermFilters}
            onAdd={openAddIncoterm}
            onEdit={openEditIncoterm}
            onDelete={handleDeleteIncoterm}
          />
        </Tabs.Panel>

        <Tabs.Panel value="transportModes" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addTransportMode')}
            canManage={canManageMasterData}
            title={t('masterData.transportModesTitle')}
            searchPlaceholder={t('masterData.searchTransportModes')}
            emptyTitle={t('masterData.noTransportModes')}
            emptyDescription={t('masterData.noTransportModesDescription')}
            columns={transportModeColumns}
            queryKey={queryKeys.transportModes}
            fetcher={fetchTransportModes}
            statusFilter={transportModeStatusFilter}
            onStatusFilterChange={setTransportModeStatusFilter}
            hasActiveFilters={hasTransportModeFilters}
            onClearFilters={clearTransportModeFilters}
            onAdd={openAddTransportMode}
            onEdit={openEditTransportMode}
            onDelete={handleDeleteTransportMode}
          />
        </Tabs.Panel>

        <Tabs.Panel value="chargeCodes" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addChargeCode')}
            canManage={canManageMasterData}
            title={t('masterData.chargeCodesTitle')}
            searchPlaceholder={t('masterData.searchChargeCodes')}
            emptyTitle={t('masterData.noChargeCodes')}
            emptyDescription={t('masterData.noChargeCodesDescription')}
            columns={chargeCodeColumns}
            queryKey={queryKeys.chargeCodes}
            fetcher={fetchChargeCodes}
            pageSize={CHARGE_CODE_FETCH_LIMIT}
            statusFilter={chargeCodeStatusFilter}
            statusFilterClientSide
            onStatusFilterChange={setChargeCodeStatusFilter}
            hasActiveFilters={hasChargeCodeFilters}
            onClearFilters={clearChargeCodeFilters}
            onAdd={openAddChargeCode}
            onEdit={openEditChargeCode}
            onDelete={handleDeleteChargeCode}
            clientFilter={chargeCodeFilter}
            toolbarExtra={(
              <>
                <Select
                  className="md-filter-select"
                  label={t('masterData.chargeGroup')}
                  data={chargeGroupOptions}
                  value={chargeGroupFilter ?? 'ALL'}
                  onChange={(value) => setChargeGroupFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
                <Select
                  className="md-filter-select"
                  label={t('masterData.chargeCategory')}
                  data={chargeCategoryOptions}
                  value={chargeCategoryFilter ?? 'ALL'}
                  onChange={(value) => setChargeCategoryFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
                <Select
                  className="md-filter-select"
                  label={t('masterData.revCost')}
                  data={chargeRevCostOptions}
                  value={chargeCodeRevCostFilter ?? 'ALL'}
                  onChange={(value) => setChargeCodeRevCostFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
                <Select
                  className="md-filter-select"
                  label={t('masterData.filterMode')}
                  data={chargeModeOptions}
                  value={chargeCodeModeFilter ?? 'ALL'}
                  onChange={(value) => setChargeCodeModeFilter(value === 'ALL' ? null : value)}
                  w={FILTER_SELECT_WIDTH}
                />
              </>
            )}
          />
        </Tabs.Panel>

        <Tabs.Panel value="uoms" pt="md">
          <ReferenceDataPanel
            addLabel={t('masterData.addUom')}
            canManage={canManageMasterData}
            title={t('masterData.uomsTitle')}
            searchPlaceholder={t('masterData.searchUoms')}
            emptyTitle={t('masterData.noUoms')}
            emptyDescription={t('masterData.noUomsDescription')}
            columns={uomColumns}
            queryKey={queryKeys.uoms}
            fetcher={fetchUoms}
            statusFilter={uomStatusFilter}
            onStatusFilterChange={setUomStatusFilter}
            hasActiveFilters={hasUomFilters}
            onClearFilters={clearUomFilters}
            onAdd={openAddUom}
            onEdit={openEditUom}
            onDelete={handleDeleteUom}
          />
        </Tabs.Panel>
      </Tabs>

      <CurrencyModal
        editing={editingCurrency}
        onClose={currencyModalHandlers.close}
        opened={currencyModalOpened}
      />

      <IncotermModal
        editing={editingIncoterm}
        onClose={incotermModalHandlers.close}
        opened={incotermModalOpened}
      />

      <TransportModeModal
        editing={editingTransportMode}
        onClose={transportModeModalHandlers.close}
        opened={transportModeModalOpened}
      />

      <ChargeCodeModal
        editing={editingChargeCode}
        onClose={chargeCodeModalHandlers.close}
        opened={chargeCodeModalOpened}
        uomOptions={uomOptions}
      />

      <UomModal
        editing={editingUom}
        onClose={uomModalHandlers.close}
        opened={uomModalOpened}
      />

      <SupplierModal
        editing={editingSupplier}
        onClose={supplierModalHandlers.close}
        opened={supplierModalOpened}
      />

      <ForwarderModal
        editing={editingForwarder}
        onClose={forwarderModalHandlers.close}
        opened={forwarderModalOpened}
      />

      <CarrierModal
        editing={editingCarrier}
        onClose={carrierModalHandlers.close}
        opened={carrierModalOpened}
      />

      <TaskTemplateModal
        editing={editingTaskTemplate}
        onClose={taskTemplateModalHandlers.close}
        opened={taskTemplateModalOpened}
      />

      <ItemModal
        canManage={canManageMasterData}
        editing={editingItem}
        onClose={itemModalHandlers.close}
        opened={itemModalOpened}
        uomOptions={uomOptions}
      />
    </Stack>
  );
}
