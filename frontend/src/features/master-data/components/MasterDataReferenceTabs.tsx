import { Group, Select, Tabs } from '@mantine/core';
import {
  IconBox,
  IconCash,
  IconClipboardList,
  IconFileCode,
  IconMapPin,
  IconReceiptTax,
  IconRoute,
  IconRulerMeasure,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useMemo } from 'react';

import { fetchChargeCodes } from '@shared/api/chargeCodes';
import { fetchContainerTypes } from '@shared/api/containerTypes';
import { fetchItems } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
} from '@shared/api/tradeMasterData';
import { fetchUoms } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';

import {
  CHARGE_CODE_FETCH_LIMIT,
  REFERENCE_FETCH_LIMIT,
  type MasterDataFilterOptions,
} from '../hooks/useMasterDataFilterOptions';
import type { DeleteEntityKind, MasterDataModalSet, ToggleEntityKind } from '../model/masterDataEntityMeta';
import { useMasterDataStore } from '../model/masterDataStore';
import { ForwardersCarriersSection } from './ForwardersCarriersSection';
import { FILTER_SELECT_WIDTH } from './MasterDataToolbar';
import { ReferenceDataPanel } from './ReferenceDataPanel';
import {
  buildChargeCodeColumns,
  buildContainerTypeColumns,
  buildCurrencyColumns,
  buildIncotermColumns,
  buildItemColumns,
  buildSupplierColumns,
  buildTransportModeColumns,
  buildUomColumns,
} from './referenceColumns';
import { TaskTemplatesSection } from './TaskTemplatesSection';

/** The full tab strip of the master-data screen with one panel per reference set. */
export function MasterDataReferenceTabs({
  canManage,
  filterOptions,
  modals,
  onDelete,
  onToggleActive,
}: {
  canManage: boolean;
  filterOptions: MasterDataFilterOptions;
  modals: MasterDataModalSet;
  onDelete: (entity: DeleteEntityKind, record: any) => void;
  onToggleActive: (entity: ToggleEntityKind, record: any) => void;
}) {
  const { t } = useI18n();
  const {
    activeTab,
    chargeCategoryFilter,
    chargeCodeModeFilter,
    chargeCodeRevCostFilter,
    chargeCodeStatusFilter,
    chargeGroupFilter,
    clearChargeCodeFilters,
    clearContainerTypeFilters,
    clearCurrencyFilters,
    clearIncotermFilters,
    clearItemFilters,
    clearSupplierFilters,
    clearTaskTemplateFilters,
    clearTransportModeFilters,
    clearUomFilters,
    containerTypeStatusFilter,
    currencyStatusFilter,
    incotermStatusFilter,
    itemCategoryFilter,
    itemStatusFilter,
    itemTypeFilter,
    setActiveTab,
    setChargeCategoryFilter,
    setChargeCodeModeFilter,
    setChargeCodeRevCostFilter,
    setChargeCodeStatusFilter,
    setChargeGroupFilter,
    setContainerTypeStatusFilter,
    setCurrencyStatusFilter,
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

  const hasSupplierFilters = supplierStatusFilter !== null || supplierTypeFilter !== null;
  const hasItemFilters = itemStatusFilter !== null || itemCategoryFilter !== null || itemTypeFilter !== null;
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
  const hasContainerTypeFilters = containerTypeStatusFilter !== null;

  const itemColumns = useMemo(
    () => buildItemColumns(t, canManage ? (rec) => onToggleActive('item', rec) : undefined),
    [t, canManage],
  );
  const currencyColumns = useMemo(
    () => buildCurrencyColumns(t, canManage ? (rec) => onToggleActive('currency', rec) : undefined),
    [t, canManage],
  );
  const incotermColumns = useMemo(
    () => buildIncotermColumns(t, canManage ? (rec) => onToggleActive('incoterm', rec) : undefined),
    [t, canManage],
  );
  const transportModeColumns = useMemo(
    () => buildTransportModeColumns(t, canManage ? (rec) => onToggleActive('transportMode', rec) : undefined),
    [t, canManage],
  );
  const chargeCodeColumns = useMemo(
    () => buildChargeCodeColumns(t, canManage ? (rec) => onToggleActive('chargeCode', rec) : undefined),
    [t, canManage],
  );
  const uomColumns = useMemo(
    () => buildUomColumns(t, canManage ? (rec) => onToggleActive('uom', rec) : undefined),
    [t, canManage],
  );
  const containerTypeColumns = useMemo(
    () => buildContainerTypeColumns(t, canManage ? (rec) => onToggleActive('containerType', rec) : undefined),
    [t, canManage],
  );
  const supplierColumns = useMemo(
    () => buildSupplierColumns(t, canManage ? (rec) => onToggleActive('supplier', rec) : undefined),
    [t, canManage],
  );

  return (
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
            <Tabs.Tab value="containerTypes" leftSection={<IconBox size={16} />}>
              {t('masterData.tabContainerTypes')}
            </Tabs.Tab>
          </Tabs.List>
        </div>
      </Group>

      <Tabs.Panel value="items" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addItem')}
          canManage={canManage}
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
                data={filterOptions.itemCategoryOptions}
                value={itemCategoryFilter ?? 'ALL'}
                onChange={(value) => setItemCategoryFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
              <Select
                className="md-filter-select"
                label={t('masterData.itemType')}
                data={filterOptions.itemTypeOptions}
                value={itemTypeFilter ?? 'ALL'}
                onChange={(value) => setItemTypeFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
            </>
          )}
          onAdd={modals.item.openAdd}
          onEdit={modals.item.openEdit}
          onDelete={(record) => onDelete('item', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="suppliers" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addSupplier')}
          canManage={canManage}
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
              data={filterOptions.supplierTypeOptions}
              value={supplierTypeFilter ?? 'ALL'}
              onChange={(value) => setSupplierTypeFilter(value === 'ALL' ? null : value)}
              w={FILTER_SELECT_WIDTH}
            />
          )}
          onAdd={modals.supplier.openAdd}
          onEdit={modals.supplier.openEdit}
          onDelete={(record) => onDelete('supplier', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="forwarders" pt="md">
        <ForwardersCarriersSection
          canManage={canManage}
          onAddForwarder={modals.forwarder.openAdd}
          onAddCarrier={modals.carrier.openAdd}
          onEditForwarder={modals.forwarder.openEdit}
          onEditCarrier={modals.carrier.openEdit}
          onDeleteForwarder={(record) => onDelete('forwarder', record)}
          onDeleteCarrier={(record) => onDelete('carrier', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="taskTemplates" pt="md">
        <TaskTemplatesSection
          canManage={canManage}
          departmentFilter={taskTemplateDepartmentFilter}
          hasActiveFilters={hasTaskTemplateFilters}
          milestoneFilter={taskTemplateMilestoneFilter}
          onAdd={modals.taskTemplate.openAdd}
          onClearFilters={clearTaskTemplateFilters}
          onDelete={(record) => onDelete('taskTemplate', record)}
          onDepartmentFilterChange={setTaskTemplateDepartmentFilter}
          onEdit={modals.taskTemplate.openEdit}
          onMilestoneFilterChange={setTaskTemplateMilestoneFilter}
          onStatusFilterChange={setTaskTemplateStatusFilter}
          statusFilter={taskTemplateStatusFilter}
        />
      </Tabs.Panel>

      <Tabs.Panel value="currencies" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addCurrency')}
          canManage={canManage}
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
          onAdd={modals.currency.openAdd}
          onEdit={modals.currency.openEdit}
          onDelete={(record) => onDelete('currency', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="incoterms" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addIncoterm')}
          canManage={canManage}
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
          onAdd={modals.incoterm.openAdd}
          onEdit={modals.incoterm.openEdit}
          onDelete={(record) => onDelete('incoterm', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="transportModes" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addTransportMode')}
          canManage={canManage}
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
          onAdd={modals.transportMode.openAdd}
          onEdit={modals.transportMode.openEdit}
          onDelete={(record) => onDelete('transportMode', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="chargeCodes" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addChargeCode')}
          canManage={canManage}
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
          onAdd={modals.chargeCode.openAdd}
          onEdit={modals.chargeCode.openEdit}
          onDelete={(record) => onDelete('chargeCode', record)}
          clientFilter={filterOptions.chargeCodeFilter}
          toolbarExtra={(
            <>
              <Select
                className="md-filter-select"
                label={t('masterData.chargeGroup')}
                data={filterOptions.chargeGroupOptions}
                value={chargeGroupFilter ?? 'ALL'}
                onChange={(value) => setChargeGroupFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
              <Select
                className="md-filter-select"
                label={t('masterData.chargeCategory')}
                data={filterOptions.chargeCategoryOptions}
                value={chargeCategoryFilter ?? 'ALL'}
                onChange={(value) => setChargeCategoryFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
              <Select
                className="md-filter-select"
                label={t('masterData.revCost')}
                data={filterOptions.chargeRevCostOptions}
                value={chargeCodeRevCostFilter ?? 'ALL'}
                onChange={(value) => setChargeCodeRevCostFilter(value === 'ALL' ? null : value)}
                w={FILTER_SELECT_WIDTH}
              />
              <Select
                className="md-filter-select"
                label={t('masterData.filterMode')}
                data={filterOptions.chargeModeOptions}
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
          canManage={canManage}
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
          onAdd={modals.uom.openAdd}
          onEdit={modals.uom.openEdit}
          onDelete={(record) => onDelete('uom', record)}
        />
      </Tabs.Panel>

      <Tabs.Panel value="containerTypes" pt="md">
        <ReferenceDataPanel
          addLabel={t('masterData.addContainerType')}
          canManage={canManage}
          title={t('masterData.containerTypesTitle')}
          searchPlaceholder={t('masterData.searchContainerTypes')}
          emptyTitle={t('masterData.noContainerTypes')}
          emptyDescription={t('masterData.noContainerTypesDescription')}
          columns={containerTypeColumns}
          queryKey={queryKeys.containerTypes}
          fetcher={fetchContainerTypes}
          statusFilter={containerTypeStatusFilter}
          onStatusFilterChange={setContainerTypeStatusFilter}
          hasActiveFilters={hasContainerTypeFilters}
          onClearFilters={clearContainerTypeFilters}
          onAdd={modals.containerType.openAdd}
          onEdit={modals.containerType.openEdit}
          onDelete={(record) => onDelete('containerType', record)}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
