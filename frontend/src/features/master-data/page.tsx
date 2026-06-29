import { Alert, Badge, Group, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertCircle,
  IconCash,
  IconClipboardList,
  IconFileCode,
  IconMapPin,
  IconRoute,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import {
  deleteCarrier,
  deleteForwarder,
  type Carrier,
  type Forwarder,
} from '@shared/api/forwarders';
import {
  deleteItem,
  deleteItemGroup,
  fetchItemGroups,
  fetchItems,
  fetchItemTaxProfiles,
  type Item,
  type ItemGroup,
  type ItemTaxProfile,
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
import { useAuth } from '@shared/auth/useAuth';
import { LIST_PAGE_SIZE } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { useMasterDataStore } from './model/masterDataStore';

import { optionalString } from './model/masterDataModel';
import { CarrierModal } from './components/CarrierModal';
import { CarriersSection } from './components/CarriersSection';
import { CurrencyModal } from './components/CurrencyModal';
import { ForwarderModal } from './components/ForwarderModal';
import { ForwardersSection } from './components/ForwardersSection';
import { IncotermModal } from './components/IncotermModal';
import { ItemCatalogSection } from './components/ItemCatalogSection';
import { ItemGroupModal } from './components/ItemGroupModal';
import { ItemGroupsSection } from './components/ItemGroupsSection';
import { ItemModal } from './components/ItemModal';
import { ReferenceDataPanel } from './components/ReferenceDataPanel';
import {
  buildCurrencyColumns,
  buildIncotermColumns,
  buildSupplierColumns,
  buildTransportModeColumns,
} from './components/referenceColumns';
import { SupplierModal } from './components/SupplierModal';
import { TaskTemplateModal } from './components/TaskTemplateModal';
import { TaskTemplatesSection } from './components/TaskTemplatesSection';
import { TransportModeModal } from './components/TransportModeModal';

export function MasterData() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const canManageMasterData = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';
  const {
    activeTab,
    itemGroupFilter,
    itemGroupSearch,
    itemPage,
    itemSearch,
    setActiveTab,
    setItemGroupFilter,
    setItemGroupSearch,
    setItemPage,
    setItemSearch,
    setTaskTemplateDepartmentFilter,
    setTaskTemplateMilestoneFilter,
    taskTemplateDepartmentFilter,
    taskTemplateMilestoneFilter,
  } = useMasterDataStore();

  const [itemGroupModalOpened, itemGroupModalHandlers] = useDisclosure(false);
  const [itemModalOpened, itemModalHandlers] = useDisclosure(false);
  const [currencyModalOpened, currencyModalHandlers] = useDisclosure(false);
  const [incotermModalOpened, incotermModalHandlers] = useDisclosure(false);
  const [transportModeModalOpened, transportModeModalHandlers] = useDisclosure(false);
  const [supplierModalOpened, supplierModalHandlers] = useDisclosure(false);
  const [forwarderModalOpened, forwarderModalHandlers] = useDisclosure(false);
  const [carrierModalOpened, carrierModalHandlers] = useDisclosure(false);
  const [taskTemplateModalOpened, taskTemplateModalHandlers] = useDisclosure(false);

  const [editingItemGroup, setEditingItemGroup] = useState<ItemGroup | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingIncoterm, setEditingIncoterm] = useState<Incoterm | null>(null);
  const [editingTransportMode, setEditingTransportMode] = useState<TransportMode | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingForwarder, setEditingForwarder] = useState<Forwarder | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [editingTaskTemplate, setEditingTaskTemplate] = useState<TaskTemplate | null>(null);
  const [transportScope, setTransportScope] = useState<'all' | 'intl' | 'domestic'>('all');

  const itemListParams = useMemo(
    () => ({
      page: itemPage,
      limit: LIST_PAGE_SIZE,
      q: optionalString(itemSearch),
      item_group_id: itemGroupFilter || undefined,
    }),
    [itemGroupFilter, itemPage, itemSearch],
  );

  const itemGroupsQuery = useQuery({
    queryKey: queryKeys.itemGroups({ page: 1, limit: 100 }),
    queryFn: () => fetchItemGroups({ page: 1, limit: 100 }),
    enabled: activeTab === 'items',
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.items(itemListParams),
    queryFn: () => fetchItems(itemListParams),
    enabled: activeTab === 'items',
  });

  const currencyOptionsQuery = useQuery({
    queryKey: queryKeys.currencies({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchCurrencies({ page: 1, limit: 100, is_active: true }),
    enabled: activeTab === 'suppliers' || supplierModalOpened,
  });

  const incotermOptionsQuery = useQuery({
    queryKey: queryKeys.incoterms({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchIncoterms({ page: 1, limit: 100, is_active: true }),
    enabled: activeTab === 'suppliers' || supplierModalOpened,
  });

  const transportModeOptionsQuery = useQuery({
    queryKey: queryKeys.transportModes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchTransportModes({ page: 1, limit: 100, is_active: true }),
    enabled: activeTab === 'suppliers' || supplierModalOpened,
  });

  const itemGroups = itemGroupsQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  const currencyOptions = useMemo(
    () =>
      (currencyOptionsQuery.data?.data ?? []).map((currency) => ({
        label: `${currency.currency_code} - ${currency.currency_name}`,
        value: currency.id,
      })),
    [currencyOptionsQuery.data],
  );
  const incotermOptions = useMemo(
    () =>
      (incotermOptionsQuery.data?.data ?? []).map((incoterm) => ({
        label: `${incoterm.incoterm_code} - ${incoterm.incoterm_name}`,
        value: incoterm.id,
      })),
    [incotermOptionsQuery.data],
  );
  const transportModeOptions = useMemo(
    () =>
      (transportModeOptionsQuery.data?.data ?? []).map((mode) => ({
        label: `${mode.mode_code} - ${mode.mode_name}`,
        value: mode.id,
      })),
    [transportModeOptionsQuery.data],
  );

  const taxProfileQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: queryKeys.itemTaxProfiles(item.id),
      queryFn: () => fetchItemTaxProfiles(item.id),
      enabled: activeTab === 'items',
    })),
  });

  const taxProfilesByItemId = useMemo(() => {
    return new Map<string, ItemTaxProfile[]>(
      items.map((item, index) => {
        const embeddedProfiles = item.customs_profiles ?? [];
        const queriedProfiles = taxProfileQueries[index]?.data ?? [];
        return [item.id, queriedProfiles.length > 0 ? queriedProfiles : embeddedProfiles] as const;
      }),
    );
  }, [items, taxProfileQueries]);

  const groupOptions = useMemo(
    () =>
      itemGroups.map((group) => ({
        label: `${group.group_code ? `${group.group_code} - ` : ''}${group.group_name}`,
        value: group.id,
      })),
    [itemGroups],
  );

  const filteredItemGroups = useMemo(() => {
    const q = itemGroupSearch.toLowerCase().trim();
    return itemGroups.filter(
      (group) =>
        (group.group_code || '').toLowerCase().includes(q) ||
        group.group_name.toLowerCase().includes(q) ||
        (group.description || '').toLowerCase().includes(q) ||
        (group.default_hs_code || '').toLowerCase().includes(q),
    );
  }, [itemGroupSearch, itemGroups]);

  const itemTotal = itemsQuery.data?.total ?? 0;
  const itemPageCount = Math.max(1, itemsQuery.data?.pagination.totalPages ?? 1);
  const itemPageStart = itemTotal === 0 ? 0 : (itemPage - 1) * LIST_PAGE_SIZE + 1;
  const itemPageEnd = Math.min(itemTotal, itemPage * LIST_PAGE_SIZE);

  useEffect(() => {
    if (itemPage > itemPageCount) {
      setItemPage(itemPageCount);
    }
  }, [itemPage, itemPageCount]);

  const deleteItemGroupMutation = useMutation({
    mutationFn: deleteItemGroup,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemGroupLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
      ]);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.itemLists });
    },
  });

  const invalidateTradeMasterData = (queryKey: readonly unknown[]) => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
    ]);
  };

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

  const openAddCurrency = () => {
    setEditingCurrency(null);
    currencyModalHandlers.open();
  };
  const openEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    currencyModalHandlers.open();
  };

  const openAddIncoterm = () => {
    setEditingIncoterm(null);
    incotermModalHandlers.open();
  };
  const openEditIncoterm = (incoterm: Incoterm) => {
    setEditingIncoterm(incoterm);
    incotermModalHandlers.open();
  };

  const openAddTransportMode = () => {
    setEditingTransportMode(null);
    transportModeModalHandlers.open();
  };
  const openEditTransportMode = (mode: TransportMode) => {
    setEditingTransportMode(mode);
    transportModeModalHandlers.open();
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    supplierModalHandlers.open();
  };
  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    supplierModalHandlers.open();
  };

  const openAddForwarder = () => {
    setEditingForwarder(null);
    forwarderModalHandlers.open();
  };
  const openEditForwarder = (forwarder: Forwarder) => {
    setEditingForwarder(forwarder);
    forwarderModalHandlers.open();
  };

  const openAddCarrier = () => {
    setEditingCarrier(null);
    carrierModalHandlers.open();
  };
  const openEditCarrier = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    carrierModalHandlers.open();
  };

  const openAddTaskTemplate = () => {
    setEditingTaskTemplate(null);
    taskTemplateModalHandlers.open();
  };
  const openEditTaskTemplate = (template: TaskTemplate) => {
    setEditingTaskTemplate(template);
    taskTemplateModalHandlers.open();
  };

  const openAddItemGroup = () => {
    setEditingItemGroup(null);
    itemGroupModalHandlers.open();
  };
  const openEditItemGroup = (group: ItemGroup) => {
    setEditingItemGroup(group);
    itemGroupModalHandlers.open();
  };

  const openAddItem = () => {
    setEditingItem(null);
    itemModalHandlers.open();
  };
  const openEditItem = (item: Item) => {
    setEditingItem(item);
    itemModalHandlers.open();
  };

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

  const handleDeleteItemGroup = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeleteItemGroup'))) return;
    deleteItemGroupMutation.mutate(id);
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeleteItem'))) return;
    deleteItemMutation.mutate(id);
  };

  const handleRefreshItems = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.itemGroupLists }),
      queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
    ]);
  };

  const currencyColumns = useMemo(() => buildCurrencyColumns(t), [t]);
  const incotermColumns = useMemo(() => buildIncotermColumns(t), [t]);
  const transportModeColumns = useMemo(() => buildTransportModeColumns(t), [t]);
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
          <Group align="center" gap="xs">
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
          </Group>
          <Text c="dimmed" fw={700}>
            |
          </Text>
          <Group align="center" gap="xs">
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
            </Tabs.List>
          </Group>
        </Group>

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
            onAdd={openAddSupplier}
            onEdit={openEditSupplier}
            onDelete={handleDeleteSupplier}
          />
        </Tabs.Panel>

        <Tabs.Panel value="forwarders" pt="md">
          <Stack gap="md">
            <ForwardersSection
              canManage={canManageMasterData}
              onAdd={openAddForwarder}
              onDelete={handleDeleteForwarder}
              onEdit={openEditForwarder}
            />
            <CarriersSection
              canManage={canManageMasterData}
              onAdd={openAddCarrier}
              onDelete={handleDeleteCarrier}
              onEdit={openEditCarrier}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="taskTemplates" pt="md">
          <TaskTemplatesSection
            canManage={canManageMasterData}
            departmentFilter={taskTemplateDepartmentFilter}
            milestoneFilter={taskTemplateMilestoneFilter}
            onAdd={openAddTaskTemplate}
            onDelete={handleDeleteTaskTemplate}
            onDepartmentFilterChange={setTaskTemplateDepartmentFilter}
            onEdit={openEditTaskTemplate}
            onMilestoneFilterChange={setTaskTemplateMilestoneFilter}
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
            onAdd={openAddTransportMode}
            onEdit={openEditTransportMode}
            onDelete={handleDeleteTransportMode}
            clientFilter={
              transportScope === 'all'
                ? undefined
                : (mode) => (transportScope === 'intl' ? mode.is_international : !mode.is_international)
            }
            toolbarExtra={
              <SegmentedControl
                value={transportScope}
                onChange={(value) => setTransportScope(value as 'all' | 'intl' | 'domestic')}
                data={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('masterData.international'), value: 'intl' },
                  { label: t('masterData.domestic'), value: 'domestic' },
                ]}
              />
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="items" pt="md">
          <Stack gap="md">
            <ItemGroupsSection
              canManage={canManageMasterData}
              error={itemGroupsQuery.error}
              filteredItemGroups={filteredItemGroups}
              isError={itemGroupsQuery.isError}
              isFetching={itemGroupsQuery.isFetching}
              isLoading={itemGroupsQuery.isLoading}
              onAdd={openAddItemGroup}
              onDelete={handleDeleteItemGroup}
              onEdit={openEditItemGroup}
              onRefresh={handleRefreshItems}
              onSearchChange={setItemGroupSearch}
              search={itemGroupSearch}
              total={itemGroupsQuery.data?.total ?? 0}
            />

            <ItemCatalogSection
              canManage={canManageMasterData}
              deleteItemIsPending={deleteItemMutation.isPending}
              error={itemsQuery.error}
              groupFilter={itemGroupFilter}
              groupOptions={groupOptions}
              isError={itemsQuery.isError}
              isLoading={itemsQuery.isLoading}
              items={items}
              onAddItem={openAddItem}
              onDeleteItem={handleDeleteItem}
              onEditItem={openEditItem}
              onGroupFilterChange={setItemGroupFilter}
              onSearchChange={setItemSearch}
              page={itemPage}
              pageCount={itemPageCount}
              pageEnd={itemPageEnd}
              pageStart={itemPageStart}
              search={itemSearch}
              setPage={setItemPage}
              taxProfileQueries={taxProfileQueries}
              taxProfilesByItemId={taxProfilesByItemId}
              total={itemTotal}
            />
          </Stack>
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

      <SupplierModal
        currencyOptions={currencyOptions}
        editing={editingSupplier}
        incotermOptions={incotermOptions}
        onClose={supplierModalHandlers.close}
        opened={supplierModalOpened}
        transportModeOptions={transportModeOptions}
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

      <ItemGroupModal
        editing={editingItemGroup}
        onClose={itemGroupModalHandlers.close}
        opened={itemGroupModalOpened}
      />

      <ItemModal
        canManage={canManageMasterData}
        defaultGroupId={itemGroupFilter}
        editing={editingItem}
        groupOptions={groupOptions}
        onClose={itemModalHandlers.close}
        opened={itemModalOpened}
      />
    </Stack>
  );
}
