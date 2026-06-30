import { Alert, Badge, Chip, Group, Paper, Select, Stack, Tabs, Text, Title } from '@mantine/core';
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
import { useEffect, useMemo, useState } from 'react';

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
import { LIST_PAGE_SIZE } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';
import { useMasterDataStore } from './model/masterDataStore';

import { optionalString } from './model/masterDataModel';
import { CarrierModal } from './components/CarrierModal';
import { CarriersSection } from './components/CarriersSection';
import { ChargeCodeModal } from './components/ChargeCodeModal';
import { CurrencyModal } from './components/CurrencyModal';
import { ForwarderModal } from './components/ForwarderModal';
import { ForwardersSection } from './components/ForwardersSection';
import { IncotermModal } from './components/IncotermModal';
import { ItemCatalogSection } from './components/ItemCatalogSection';
import { ItemModal } from './components/ItemModal';
import { ReferenceDataPanel } from './components/ReferenceDataPanel';
import {
  buildChargeCodeColumns,
  buildCurrencyColumns,
  buildIncotermColumns,
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

export function MasterData() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const canManageMasterData = useCan('masterData.manage');
  const {
    activeTab,
    itemPage,
    itemSearch,
    setActiveTab,
    setItemPage,
    setItemSearch,
    setTaskTemplateDepartmentFilter,
    setTaskTemplateMilestoneFilter,
    taskTemplateDepartmentFilter,
    taskTemplateMilestoneFilter,
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
  const [chargeGroup, setChargeGroup] = useState<string | null>(null);
  const [chargeCategory, setChargeCategory] = useState<string | null>(null);

  const itemListParams = useMemo(
    () => ({
      page: itemPage,
      limit: LIST_PAGE_SIZE,
      q: optionalString(itemSearch),
    }),
    [itemPage, itemSearch],
  );

  const itemsQuery = useQuery({
    queryKey: queryKeys.items(itemListParams),
    queryFn: () => fetchItems(itemListParams),
    enabled: activeTab === 'items',
  });

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
      ...CHARGE_CATEGORIES.map((category) => ({ label: t(category.labelKey), value: category.value })),
    ],
    [t],
  );
  const chargeCodeFilter = useMemo(
    () => (chargeGroup || chargeCategory
      ? (chargeCode: ChargeCode) =>
        (!chargeGroup || chargeCode.group === chargeGroup) &&
        (!chargeCategory || chargeCode.category === chargeCategory)
      : undefined),
    [chargeCategory, chargeGroup],
  );

  const items = itemsQuery.data?.data ?? [];
  const uomOptions = useMemo(
    () =>
      (uomOptionsQuery.data?.data ?? []).map((uom) => ({
        label: `${uom.uom_code} - ${uom.uom_name_en}`,
        value: uom.uom_code,
      })),
    [uomOptionsQuery.data],
  );

  const itemTotal = itemsQuery.data?.total ?? 0;
  const itemPageCount = Math.max(1, itemsQuery.data?.pagination.totalPages ?? 1);
  const itemPageStart = itemTotal === 0 ? 0 : (itemPage - 1) * LIST_PAGE_SIZE + 1;
  const itemPageEnd = Math.min(itemTotal, itemPage * LIST_PAGE_SIZE);

  useEffect(() => {
    if (itemPage > itemPageCount) {
      setItemPage(itemPageCount);
    }
  }, [itemPage, itemPageCount]);

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
  const handleDeleteItem = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeleteItem'))) return;
    deleteItemMutation.mutate(id);
  };

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
              <Tabs.Tab value="chargeCodes" leftSection={<IconReceiptTax size={16} />}>
                {t('masterData.tabChargeCodes')}
              </Tabs.Tab>
              <Tabs.Tab value="uoms" leftSection={<IconRulerMeasure size={16} />}>
                {t('masterData.tabUoms')}
              </Tabs.Tab>
            </Tabs.List>
          </Group>
        </Group>

        <Tabs.Panel value="items" pt="md">
          <ItemCatalogSection
            canManage={canManageMasterData}
            deleteItemIsPending={deleteItemMutation.isPending}
            error={itemsQuery.error}
            isError={itemsQuery.isError}
            isLoading={itemsQuery.isLoading}
            items={items}
            onAddItem={openAddItem}
            onDeleteItem={handleDeleteItem}
            onEditItem={openEditItem}
            onSearchChange={setItemSearch}
            page={itemPage}
            pageCount={itemPageCount}
            pageEnd={itemPageEnd}
            pageStart={itemPageStart}
            search={itemSearch}
            setPage={setItemPage}
            total={itemTotal}
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
          />
        </Tabs.Panel>

        <Tabs.Panel value="chargeCodes" pt="md">
          <Stack gap="md">
            <Paper withBorder p="md">
              <Chip.Group
                multiple={false}
                value={chargeGroup ?? 'ALL'}
                onChange={(value) => setChargeGroup(value === 'ALL' ? null : (value as string))}
              >
                <Group gap="xs">
                  <Chip value="ALL" variant="outline">
                    {t('common.all')} ({chargeCodeTotal})
                  </Chip>
                  {CHARGE_GROUPS.map((g) => (
                    <Chip key={g.value} value={g.value} variant="outline">
                      {t(g.labelKey)} ({chargeGroupCounts[g.value] ?? 0})
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              <Select
                mt="md"
                label={t('masterData.chargeCategory')}
                data={chargeCategoryOptions}
                value={chargeCategory ?? 'ALL'}
                onChange={(value) => setChargeCategory(value === 'ALL' ? null : value)}
              />
            </Paper>
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
              onAdd={openAddChargeCode}
              onEdit={openEditChargeCode}
              onDelete={handleDeleteChargeCode}
              clientFilter={chargeCodeFilter}
            />
          </Stack>
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
