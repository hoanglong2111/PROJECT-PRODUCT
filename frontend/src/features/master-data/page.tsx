import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertCircle,
  IconBuilding,
  IconCash,
  IconEye,
  IconFileCode,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconRoute,
  IconSearch,
  IconTrash,
  IconTruckDelivery,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createItem,
  createItemGroup,
  createItemTaxProfile,
  deleteItem,
  deleteItemGroup,
  deleteItemTaxProfile,
  fetchItem,
  fetchItemGroups,
  fetchItems,
  fetchItemTaxProfiles,
  updateItem,
  updateItemGroup,
  updateItemTaxProfile,
  type CreateItemPayload,
  type CreateItemTaxProfilePayload,
  type Item,
  type ItemGroup,
  type ItemTaxProfile,
  type UpdateItemPayload,
} from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import {
  createCurrency,
  createIncoterm,
  createSupplier,
  createTransportMode,
  deleteCurrency,
  deleteIncoterm,
  deleteSupplier,
  deleteTransportMode,
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
  updateCurrency,
  updateIncoterm,
  updateSupplier,
  updateTransportMode,
  type Currency,
  type CurrencyPayload,
  type Incoterm,
  type IncotermPayload,
  type PaginatedResponse,
  type Supplier,
  type SupplierPayload,
  type TransportMode,
  type TransportModePayload,
} from '@shared/api/tradeMasterData';
import { useAuth } from '@shared/auth/useAuth';
import { EmptyState } from '@shared/components/EmptyState';
import { LIST_PAGE_SIZE, ListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';
import {
  getPartners,
  getPorts,
  savePartners,
  savePorts,
} from '@shared/api/masterDataService';
import type { PartnerRecord, PortRecord } from '@shared/model/masterData';
import { useMasterDataStore } from '@shared/stores/masterDataStore';

type SaveItemGroupInput = {
  id?: string;
  payload: {
    group_code?: string;
    group_name: string;
    description?: string;
    default_hs_code?: string;
  };
};

type SaveItemInput = {
  id?: string;
  payload: CreateItemPayload | UpdateItemPayload;
  taxProfileId?: string | null;
  taxPayload?: CreateItemTaxProfilePayload;
  shouldSaveTaxProfile: boolean;
};

type SaveCurrencyInput = {
  id?: string;
  payload: CurrencyPayload & {
    currency_code: string;
    currency_name: string;
  };
};

type SaveIncotermInput = {
  id?: string;
  payload: IncotermPayload & {
    incoterm_code: string;
    incoterm_name: string;
  };
};

type SaveTransportModeInput = {
  id?: string;
  payload: TransportModePayload & {
    mode_code: string;
    mode_name: string;
    mode_type: string;
  };
};

type SaveSupplierInput = {
  id?: string;
  payload: SupplierPayload & {
    supplier_code: string;
    supplier_name: string;
  };
};

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function formatRate(value: number | string | null | undefined) {
  const formatted = formatDecimal(value);
  return formatted === '-' ? formatted : `${formatted}%`;
}

function formatDateTime(value: string | null | undefined) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

function getPrimaryTaxProfile(profiles: ItemTaxProfile[]) {
  return profiles.find((profile) => profile.is_default) ?? profiles[0] ?? null;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text size="sm">{value || '-'}</Text>
      ) : (
        value
      )}
    </Stack>
  );
}

function TaxProfilesCell({
  isLoading,
  loadingLabel,
  preferentialLabel,
  profiles,
}: {
  isLoading: boolean;
  loadingLabel: string;
  preferentialLabel: string;
  profiles: ItemTaxProfile[];
}) {
  if (isLoading) {
    return (
      <Text size="xs" c="dimmed">
        {loadingLabel}
      </Text>
    );
  }

  if (profiles.length === 0) {
    return <Text c="dimmed">-</Text>;
  }

  return (
    <Stack gap={4}>
      {profiles.slice(0, 3).map((profile) => (
        <Stack key={profile.id} gap={2}>
          <Group gap={6} wrap="nowrap">
            <Badge color={profile.is_default ? 'teal' : 'gray'} variant="light">
              {profile.hs_code || 'HS -'}
            </Badge>
            <Text size="xs" c="dimmed">
              {formatRate(profile.import_duty_rate)} / {formatRate(profile.vat_rate)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {[profile.co_form, profile.customs_type, profile.co_tax_note, profile.customs_note]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {[profile.reference_doc_no, profile.location_code, profile.tax_note]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
          {profile.preferential_import_duty_rate !== null &&
          profile.preferential_import_duty_rate !== undefined ? (
            <Text size="xs" c="dimmed">
              {preferentialLabel}: {formatRate(profile.preferential_import_duty_rate)}
            </Text>
          ) : null}
        </Stack>
      ))}
      {profiles.length > 3 ? (
        <Text size="xs" c="dimmed">
          +{profiles.length - 3}
        </Text>
      ) : null}
    </Stack>
  );
}

type ReferenceColumn<T> = {
  key: string;
  label: string;
  width?: number | string;
  render: (record: T) => ReactNode;
};

function ReferenceDataPanel<T extends { id: string }>({
  addLabel,
  canManage,
  columns,
  emptyDescription,
  emptyTitle,
  fetcher,
  onAdd,
  onDelete,
  onEdit,
  queryKey,
  searchPlaceholder,
  title,
}: {
  addLabel: string;
  canManage: boolean;
  columns: Array<ReferenceColumn<T>>;
  emptyDescription: string;
  emptyTitle: string;
  fetcher: (params: { limit: number; page: number; search?: string }) => Promise<PaginatedResponse<T>>;
  onAdd: () => void;
  onDelete: (record: T) => void;
  onEdit: (record: T) => void;
  queryKey: (params: Record<string, unknown>) => readonly unknown[];
  searchPlaceholder: string;
  title: string;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params = useMemo(
    () => ({
      page,
      limit: LIST_PAGE_SIZE,
      search: optionalString(search),
    }),
    [page, search],
  );

  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => fetcher(params),
  });

  const records = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, query.data?.pagination.totalPages ?? 1);
  const pageStart = total === 0 ? 0 : (page - 1) * LIST_PAGE_SIZE + 1;
  const pageEnd = Math.min(total, page * LIST_PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end" gap="md">
        <TextInput
          label={title}
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1 }}
        />
        <Group gap="xs">
          {query.isFetching ? <Loader size="sm" /> : null}
          {canManage ? (
            <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
              {addLabel}
            </Button>
          ) : null}
          <Tooltip label={t('masterData.refresh')}>
            <ActionIcon
              aria-label={t('masterData.refresh')}
              variant="light"
              onClick={() => {
                void query.refetch();
              }}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {query.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(query.error)}
        </Alert>
      ) : null}

      <Paper withBorder p={0}>
        {query.isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('masterData.loadingReferenceData')}
            </Text>
          </Group>
        ) : records.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={1100} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {columns.map((column) => (
                    <Table.Th key={column.key} style={{ width: column.width }}>
                      {column.label}
                    </Table.Th>
                  ))}
                  {canManage ? (
                    <Table.Th style={{ width: 112 }}>
                      {t('masterData.actions')}
                    </Table.Th>
                  ) : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record) => (
                  <Table.Tr key={record.id}>
                    {columns.map((column) => (
                      <Table.Td key={column.key}>{column.render(record)}</Table.Td>
                    ))}
                    {canManage ? (
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip label={t('common.edit')}>
                            <ActionIcon
                              aria-label={t('common.edit')}
                              variant="subtle"
                              onClick={() => onEdit(record)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t('common.delete')}>
                            <ActionIcon
                              aria-label={t('common.delete')}
                              color="red"
                              variant="subtle"
                              onClick={() => onDelete(record)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    ) : null}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={total}
        />
      </Paper>
    </Stack>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();

  return (
    <Badge color={active ? 'teal' : 'gray'} variant="light">
      {active ? t('masterData.activeStatus') : t('masterData.inactiveStatus')}
    </Badge>
  );
}

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
    partnerSearch,
    portSearch,
    setActiveTab,
    setItemGroupFilter,
    setItemGroupSearch,
    setItemPage,
    setItemSearch,
    setPartnerSearch,
    setPortSearch,
  } = useMasterDataStore();

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [ports, setPorts] = useState<PortRecord[]>([]);

  useEffect(() => {
    setPartners(getPartners());
    setPorts(getPorts());
  }, []);

  const [partnerModalOpened, partnerModalHandlers] = useDisclosure(false);
  const [portModalOpened, portModalHandlers] = useDisclosure(false);
  const [itemGroupModalOpened, itemGroupModalHandlers] = useDisclosure(false);
  const [itemModalOpened, itemModalHandlers] = useDisclosure(false);
  const [currencyModalOpened, currencyModalHandlers] = useDisclosure(false);
  const [incotermModalOpened, incotermModalHandlers] = useDisclosure(false);
  const [transportModeModalOpened, transportModeModalHandlers] = useDisclosure(false);
  const [supplierModalOpened, supplierModalHandlers] = useDisclosure(false);

  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [editingPort, setEditingPort] = useState<PortRecord | null>(null);
  const [editingItemGroup, setEditingItemGroup] = useState<ItemGroup | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingIncoterm, setEditingIncoterm] = useState<Incoterm | null>(null);
  const [editingTransportMode, setEditingTransportMode] = useState<TransportMode | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [partCode, setPartCode] = useState('');
  const [partName, setPartName] = useState('');
  const [partType, setPartType] = useState<string>('SUPPLIER');
  const [partTax, setPartTax] = useState('');
  const [partAddress, setPartAddress] = useState('');
  const [partEmail, setPartEmail] = useState('');

  const [portCode, setPortCode] = useState('');
  const [portName, setPortName] = useState('');
  const [portCountry, setPortCountry] = useState('');
  const [portType, setPortType] = useState<string>('SEA');

  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyName, setCurrencyName] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [currencyDecimalPlaces, setCurrencyDecimalPlaces] = useState('2');
  const [currencyIsActive, setCurrencyIsActive] = useState(true);

  const [incotermCode, setIncotermCode] = useState('');
  const [incotermName, setIncotermName] = useState('');
  const [incotermDescription, setIncotermDescription] = useState('');
  const [incotermIsActive, setIncotermIsActive] = useState(true);

  const [transportModeCode, setTransportModeCode] = useState('');
  const [transportModeName, setTransportModeName] = useState('');
  const [transportModeType, setTransportModeType] = useState('');
  const [transportModeDescription, setTransportModeDescription] = useState('');
  const [transportModeIsInternational, setTransportModeIsInternational] = useState(true);
  const [transportModeIsActive, setTransportModeIsActive] = useState(true);

  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierRoles, setSupplierRoles] = useState<string[]>(['SUPPLIER']);
  const [supplierCountry, setSupplierCountry] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierContactName, setSupplierContactName] = useState('');
  const [supplierContactEmail, setSupplierContactEmail] = useState('');
  const [supplierContactPhone, setSupplierContactPhone] = useState('');
  const [supplierPaymentTerm, setSupplierPaymentTerm] = useState('');
  const [supplierCurrencyId, setSupplierCurrencyId] = useState<string | null>(null);
  const [supplierIncotermId, setSupplierIncotermId] = useState<string | null>(null);
  const [supplierTransportModeIds, setSupplierTransportModeIds] = useState<string[]>([]);
  const [supplierDefaultTransportModeId, setSupplierDefaultTransportModeId] = useState<string | null>(null);
  const [supplierLeadTimeDays, setSupplierLeadTimeDays] = useState('');
  const [supplierIsActive, setSupplierIsActive] = useState(true);

  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupDefaultHsCode, setGroupDefaultHsCode] = useState('');

  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemGroupId, setItemGroupId] = useState<string | null>(null);
  const [itemUnit, setItemUnit] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemOriginCountry, setItemOriginCountry] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemModel, setItemModel] = useState('');
  const [itemIsNew, setItemIsNew] = useState(true);
  const [itemLeadTimeDays, setItemLeadTimeDays] = useState('');
  const [itemMoq, setItemMoq] = useState('');
  const [itemIsActive, setItemIsActive] = useState(true);

  const [editingTaxProfileId, setEditingTaxProfileId] = useState<string | null>(null);
  const [taxHsCode, setTaxHsCode] = useState('');
  const [taxImportDutyRate, setTaxImportDutyRate] = useState('');
  const [taxVatRate, setTaxVatRate] = useState('');
  const [taxCoForm, setTaxCoForm] = useState('');
  const [taxCoTaxNote, setTaxCoTaxNote] = useState('');
  const [taxCustomsType, setTaxCustomsType] = useState('');
  const [taxCustomsNote, setTaxCustomsNote] = useState('');
  const [taxReferenceDocNo, setTaxReferenceDocNo] = useState('');
  const [taxLocationCode, setTaxLocationCode] = useState('');
  const [taxTaxNote, setTaxTaxNote] = useState('');
  const [taxPreferentialImportDutyRate, setTaxPreferentialImportDutyRate] = useState('');
  const [taxIsDefault, setTaxIsDefault] = useState(true);

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
  const supplierDefaultTransportModeOptions = useMemo(
    () => transportModeOptions.filter((option) => supplierTransportModeIds.includes(option.value)),
    [supplierTransportModeIds, transportModeOptions],
  );

  const taxProfileQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: queryKeys.itemTaxProfiles(item.id),
      queryFn: () => fetchItemTaxProfiles(item.id),
      enabled: activeTab === 'items',
    })),
  });

  const taxProfilesByItemId = useMemo(() => {
    return new Map(
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

  const saveItemGroupMutation = useMutation({
    mutationFn: ({ id, payload }: SaveItemGroupInput) =>
      id ? updateItemGroup(id, payload) : createItemGroup(payload),
    onSuccess: () => {
      itemGroupModalHandlers.close();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemGroupLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
      ]);
    },
  });

  const deleteItemGroupMutation = useMutation({
    mutationFn: deleteItemGroup,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemGroupLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
      ]);
    },
  });

  const saveItemMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      shouldSaveTaxProfile,
      taxPayload,
      taxProfileId,
    }: SaveItemInput) => {
      const savedItem = id
        ? await updateItem(id, payload)
        : await createItem(payload as CreateItemPayload);
      const itemId = id ?? savedItem.id;

      if (shouldSaveTaxProfile && taxPayload) {
        if (taxProfileId) {
          await updateItemTaxProfile(taxProfileId, taxPayload);
        } else {
          await createItemTaxProfile(itemId, taxPayload);
        }
      }

      return savedItem;
    },
    onSuccess: (savedItem, variables) => {
      itemModalHandlers.close();
      const itemId = variables.id ?? savedItem.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemDetail(itemId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemTaxProfiles(itemId) }),
      ]);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.itemLists });
    },
  });

  const deleteTaxProfileMutation = useMutation({
    mutationFn: deleteItemTaxProfile,
    onSuccess: () => {
      resetTaxProfileForm();
      if (editingItem) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.itemDetail(editingItem.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
          queryClient.invalidateQueries({ queryKey: queryKeys.itemTaxProfiles(editingItem.id) }),
        ]);
      }
    },
  });

  const invalidateTradeMasterData = (queryKey: readonly unknown[]) => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
    ]);
  };

  const saveCurrencyMutation = useMutation({
    mutationFn: ({ id, payload }: SaveCurrencyInput) =>
      id ? updateCurrency(id, payload) : createCurrency(payload),
    onSuccess: () => {
      currencyModalHandlers.close();
      invalidateTradeMasterData(queryKeys.currencyLists);
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: deleteCurrency,
    onSuccess: () => {
      invalidateTradeMasterData(queryKeys.currencyLists);
    },
  });

  const saveIncotermMutation = useMutation({
    mutationFn: ({ id, payload }: SaveIncotermInput) =>
      id ? updateIncoterm(id, payload) : createIncoterm(payload),
    onSuccess: () => {
      incotermModalHandlers.close();
      invalidateTradeMasterData(queryKeys.incotermLists);
    },
  });

  const deleteIncotermMutation = useMutation({
    mutationFn: deleteIncoterm,
    onSuccess: () => {
      invalidateTradeMasterData(queryKeys.incotermLists);
    },
  });

  const saveTransportModeMutation = useMutation({
    mutationFn: ({ id, payload }: SaveTransportModeInput) =>
      id ? updateTransportMode(id, payload) : createTransportMode(payload),
    onSuccess: () => {
      transportModeModalHandlers.close();
      invalidateTradeMasterData(queryKeys.transportModeLists);
    },
  });

  const deleteTransportModeMutation = useMutation({
    mutationFn: deleteTransportMode,
    onSuccess: () => {
      invalidateTradeMasterData(queryKeys.transportModeLists);
    },
  });

  const saveSupplierMutation = useMutation({
    mutationFn: ({ id, payload }: SaveSupplierInput) =>
      id ? updateSupplier(id, payload) : createSupplier(payload),
    onSuccess: () => {
      supplierModalHandlers.close();
      invalidateTradeMasterData(queryKeys.supplierLists);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      invalidateTradeMasterData(queryKeys.supplierLists);
    },
  });

  const filteredPartners = useMemo(() => {
    const q = partnerSearch.toLowerCase().trim();
    return partners.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.tax_code.includes(q),
    );
  }, [partners, partnerSearch]);

  const filteredPorts = useMemo(() => {
    const q = portSearch.toLowerCase().trim();
    return ports.filter(
      (p) =>
        p.port_code.toLowerCase().includes(q) ||
        p.port_name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q),
    );
  }, [ports, portSearch]);

  const itemFormReadOnly = Boolean(editingItem) && !canManageMasterData;
  const selectedItemProfiles = useMemo(() => {
    if (!editingItem) return [];

    const queriedProfiles = taxProfilesByItemId.get(editingItem.id) ?? [];
    return queriedProfiles.length > 0 ? queriedProfiles : editingItem.customs_profiles ?? [];
  }, [editingItem, taxProfilesByItemId]);

  function resetTaxProfileForm(profile: ItemTaxProfile | null = null) {
    setEditingTaxProfileId(profile?.id ?? null);
    setTaxHsCode(profile?.hs_code ?? '');
    setTaxImportDutyRate(
      profile?.import_duty_rate !== null && profile?.import_duty_rate !== undefined
        ? String(profile.import_duty_rate)
        : '',
    );
    setTaxVatRate(
      profile?.vat_rate !== null && profile?.vat_rate !== undefined
        ? String(profile.vat_rate)
        : '',
    );
    setTaxCoForm(profile?.co_form ?? '');
    setTaxCoTaxNote(profile?.co_tax_note ?? '');
    setTaxCustomsType(profile?.customs_type ?? '');
    setTaxCustomsNote(profile?.customs_note ?? '');
    setTaxReferenceDocNo(profile?.reference_doc_no ?? '');
    setTaxLocationCode(profile?.location_code ?? '');
    setTaxTaxNote(profile?.tax_note ?? '');
    setTaxPreferentialImportDutyRate(
      profile?.preferential_import_duty_rate !== null &&
        profile?.preferential_import_duty_rate !== undefined
        ? String(profile.preferential_import_duty_rate)
        : '',
    );
    setTaxIsDefault(profile?.is_default ?? true);
  }

  function fillItemForm(item: Item, profiles: ItemTaxProfile[] = []) {
    const fallbackProfiles = profiles.length > 0
      ? profiles
      : taxProfilesByItemId.get(item.id) ?? item.customs_profiles ?? [];

    setEditingItem({ ...item, customs_profiles: fallbackProfiles });
    setItemCode(item.item_code);
    setItemName(item.item_name);
    setItemDescription(item.item_description ?? '');
    setItemGroupId(item.item_group_id ?? null);
    setItemUnit(item.unit ?? '');
    setItemType(item.item_type ?? '');
    setItemOriginCountry(item.origin_country ?? '');
    setItemBrand(item.brand ?? '');
    setItemModel(item.model ?? '');
    setItemIsNew(item.is_new ?? true);
    setItemLeadTimeDays(
      item.lead_time_days !== null && item.lead_time_days !== undefined
        ? String(item.lead_time_days)
        : '',
    );
    setItemMoq(item.moq !== null && item.moq !== undefined ? String(item.moq) : '');
    setItemIsActive(item.is_active ?? true);
    resetTaxProfileForm(getPrimaryTaxProfile(fallbackProfiles));
  }

  const openAddPartner = () => {
    setEditingPartner(null);
    setPartCode('');
    setPartName('');
    setPartType('SUPPLIER');
    setPartTax('');
    setPartAddress('');
    setPartEmail('');
    partnerModalHandlers.open();
  };

  const openAddPort = () => {
    setEditingPort(null);
    setPortCode('');
    setPortName('');
    setPortCountry('');
    setPortType('SEA');
    portModalHandlers.open();
  };

  const openAddCurrency = () => {
    setEditingCurrency(null);
    setCurrencyCode('');
    setCurrencyName('');
    setCurrencySymbol('');
    setCurrencyDecimalPlaces('2');
    setCurrencyIsActive(true);
    currencyModalHandlers.open();
  };

  const openAddIncoterm = () => {
    setEditingIncoterm(null);
    setIncotermCode('');
    setIncotermName('');
    setIncotermDescription('');
    setIncotermIsActive(true);
    incotermModalHandlers.open();
  };

  const openAddTransportMode = () => {
    setEditingTransportMode(null);
    setTransportModeCode('');
    setTransportModeName('');
    setTransportModeType('SEA');
    setTransportModeDescription('');
    setTransportModeIsInternational(true);
    setTransportModeIsActive(true);
    transportModeModalHandlers.open();
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierCode('');
    setSupplierName('');
    setSupplierRoles(['SUPPLIER']);
    setSupplierCountry('');
    setSupplierAddress('');
    setSupplierContactName('');
    setSupplierContactEmail('');
    setSupplierContactPhone('');
    setSupplierPaymentTerm('');
    setSupplierCurrencyId(null);
    setSupplierIncotermId(null);
    setSupplierTransportModeIds([]);
    setSupplierDefaultTransportModeId(null);
    setSupplierLeadTimeDays('');
    setSupplierIsActive(true);
    supplierModalHandlers.open();
  };

  const openAddItemGroup = () => {
    setEditingItemGroup(null);
    setGroupCode('');
    setGroupName('');
    setGroupDescription('');
    setGroupDefaultHsCode('');
    itemGroupModalHandlers.open();
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemCode('');
    setItemName('');
    setItemDescription('');
    setItemGroupId(itemGroupFilter);
    setItemUnit('');
    setItemType('');
    setItemOriginCountry('');
    setItemBrand('');
    setItemModel('');
    setItemIsNew(true);
    setItemLeadTimeDays('');
    setItemMoq('');
    setItemIsActive(true);
    resetTaxProfileForm();
    itemModalHandlers.open();
  };

  const openEditPartner = (p: PartnerRecord) => {
    setEditingPartner(p);
    setPartCode(p.code);
    setPartName(p.name);
    setPartType(p.type);
    setPartTax(p.tax_code);
    setPartAddress(p.address);
    setPartEmail(p.contact_email);
    partnerModalHandlers.open();
  };

  const openEditPort = (p: PortRecord) => {
    setEditingPort(p);
    setPortCode(p.port_code);
    setPortName(p.port_name);
    setPortCountry(p.country);
    setPortType(p.type);
    portModalHandlers.open();
  };

  const openEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyCode(currency.currency_code);
    setCurrencyName(currency.currency_name);
    setCurrencySymbol(currency.symbol ?? '');
    setCurrencyDecimalPlaces(String(currency.decimal_places));
    setCurrencyIsActive(currency.is_active);
    currencyModalHandlers.open();
  };

  const openEditIncoterm = (incoterm: Incoterm) => {
    setEditingIncoterm(incoterm);
    setIncotermCode(incoterm.incoterm_code);
    setIncotermName(incoterm.incoterm_name);
    setIncotermDescription(incoterm.description ?? '');
    setIncotermIsActive(incoterm.is_active);
    incotermModalHandlers.open();
  };

  const openEditTransportMode = (mode: TransportMode) => {
    setEditingTransportMode(mode);
    setTransportModeCode(mode.mode_code);
    setTransportModeName(mode.mode_name);
    setTransportModeType(mode.mode_type);
    setTransportModeDescription(mode.description ?? '');
    setTransportModeIsInternational(mode.is_international);
    setTransportModeIsActive(mode.is_active);
    transportModeModalHandlers.open();
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierCode(supplier.supplier_code);
    setSupplierName(supplier.supplier_name);
    setSupplierRoles(supplier.supplier_roles.length > 0 ? supplier.supplier_roles : ['SUPPLIER']);
    setSupplierCountry(supplier.country ?? '');
    setSupplierAddress(supplier.address ?? '');
    setSupplierContactName(supplier.contact_name ?? '');
    setSupplierContactEmail(supplier.contact_email ?? '');
    setSupplierContactPhone(supplier.contact_phone ?? '');
    setSupplierPaymentTerm(supplier.payment_term ?? '');
    setSupplierCurrencyId(supplier.default_currency_id ?? supplier.default_currency?.id ?? null);
    setSupplierIncotermId(supplier.default_incoterm_id ?? supplier.default_incoterm?.id ?? null);
    const supplierTransportModes = supplier.supplier_transport_modes ?? [];
    setSupplierTransportModeIds(supplierTransportModes.map((mode) => mode.transport_mode_id));
    setSupplierDefaultTransportModeId(
      supplierTransportModes.find((mode) => mode.is_default)?.transport_mode_id ?? null,
    );
    setSupplierLeadTimeDays(
      supplier.lead_time_days !== null && supplier.lead_time_days !== undefined
        ? String(supplier.lead_time_days)
        : '',
    );
    setSupplierIsActive(supplier.is_active);
    supplierModalHandlers.open();
  };

  const openEditItemGroup = (group: ItemGroup) => {
    setEditingItemGroup(group);
    setGroupCode(group.group_code ?? '');
    setGroupName(group.group_name);
    setGroupDescription(group.description ?? '');
    setGroupDefaultHsCode(group.default_hs_code ?? '');
    itemGroupModalHandlers.open();
  };

  const openEditItem = (item: Item) => {
    fillItemForm(item);
    itemModalHandlers.open();

    void Promise.all([
      queryClient.fetchQuery({
        queryKey: queryKeys.itemDetail(item.id),
        queryFn: () => fetchItem(item.id),
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.itemTaxProfiles(item.id),
        queryFn: () => fetchItemTaxProfiles(item.id),
      }),
    ])
      .then(([detail, profiles]) => fillItemForm(detail, profiles))
      .catch(() => undefined);
  };

  const handleSavePartner = () => {
    if (!partCode || !partName) return;
    let updated: PartnerRecord[];
    if (editingPartner) {
      updated = partners.map((p) =>
        p.id === editingPartner.id
          ? {
              ...p,
              code: partCode,
              name: partName,
              type: partType as PartnerRecord['type'],
              tax_code: partTax,
              address: partAddress,
              contact_email: partEmail,
            }
          : p,
      );
    } else {
      const newPart: PartnerRecord = {
        id: `part-${Date.now()}`,
        code: partCode,
        name: partName,
        type: partType as PartnerRecord['type'],
        tax_code: partTax,
        address: partAddress,
        contact_email: partEmail,
      };
      updated = [...partners, newPart];
    }
    setPartners(updated);
    savePartners(updated);
    partnerModalHandlers.close();
  };

  const handleSavePort = () => {
    if (!portCode || !portName) return;
    let updated: PortRecord[];
    if (editingPort) {
      updated = ports.map((p) =>
        p.id === editingPort.id
          ? {
              ...p,
              port_code: portCode.toUpperCase(),
              port_name: portName,
              country: portCountry,
              type: portType as PortRecord['type'],
            }
          : p,
      );
    } else {
      const newPort: PortRecord = {
        id: `port-${Date.now()}`,
        port_code: portCode.toUpperCase(),
        port_name: portName,
        country: portCountry,
        type: portType as PortRecord['type'],
      };
      updated = [...ports, newPort];
    }
    setPorts(updated);
    savePorts(updated);
    portModalHandlers.close();
  };

  const handleSaveItemGroup = () => {
    if (!groupName.trim()) return;
    saveItemGroupMutation.mutate({
      id: editingItemGroup?.id,
      payload: {
        group_code: optionalString(groupCode),
        group_name: groupName.trim(),
        description: optionalString(groupDescription),
        default_hs_code: optionalString(groupDefaultHsCode),
      },
    });
  };

  const handleSaveItem = () => {
    if (!canManageMasterData) return;
    if (!itemCode.trim() || !itemName.trim()) return;

    const payload: CreateItemPayload = {
      item_code: itemCode.trim(),
      item_name: itemName.trim(),
      item_description: optionalString(itemDescription),
      item_group_id: itemGroupId || undefined,
      unit: optionalString(itemUnit),
      item_type: optionalString(itemType),
      origin_country: optionalString(itemOriginCountry),
      brand: optionalString(itemBrand),
      model: optionalString(itemModel),
      is_new: itemIsNew,
      lead_time_days: optionalNumber(itemLeadTimeDays),
      moq: optionalNumber(itemMoq),
      is_active: itemIsActive,
    };

    const taxPayload: CreateItemTaxProfilePayload = {
      hs_code: optionalString(taxHsCode),
      import_duty_rate: optionalNumber(taxImportDutyRate),
      vat_rate: optionalNumber(taxVatRate),
      co_form: optionalString(taxCoForm),
      co_tax_note: optionalString(taxCoTaxNote),
      customs_type: optionalString(taxCustomsType),
      customs_note: optionalString(taxCustomsNote),
      reference_doc_no: optionalString(taxReferenceDocNo),
      location_code: optionalString(taxLocationCode),
      tax_note: optionalString(taxTaxNote),
      preferential_import_duty_rate: optionalNumber(taxPreferentialImportDutyRate),
      is_default: taxIsDefault,
    };

    const hasTaxProfileContent = [
      taxPayload.hs_code,
      taxPayload.import_duty_rate,
      taxPayload.vat_rate,
      taxPayload.co_form,
      taxPayload.co_tax_note,
      taxPayload.customs_type,
      taxPayload.customs_note,
      taxPayload.reference_doc_no,
      taxPayload.location_code,
      taxPayload.tax_note,
      taxPayload.preferential_import_duty_rate,
    ].some((value) => value !== undefined);

    saveItemMutation.mutate({
      id: editingItem?.id,
      payload,
      taxProfileId: editingTaxProfileId,
      taxPayload,
      shouldSaveTaxProfile: Boolean(editingTaxProfileId) || hasTaxProfileContent,
    });
  };

  const handleSaveCurrency = () => {
    if (!currencyCode.trim() || !currencyName.trim()) return;

    saveCurrencyMutation.mutate({
      id: editingCurrency?.id,
      payload: {
        currency_code: currencyCode.trim().toUpperCase(),
        currency_name: currencyName.trim(),
        symbol: optionalString(currencySymbol),
        decimal_places: optionalNumber(currencyDecimalPlaces) ?? 2,
        is_active: currencyIsActive,
      },
    });
  };

  const handleSaveIncoterm = () => {
    if (!incotermCode.trim() || !incotermName.trim()) return;

    saveIncotermMutation.mutate({
      id: editingIncoterm?.id,
      payload: {
        incoterm_code: incotermCode.trim().toUpperCase(),
        incoterm_name: incotermName.trim(),
        description: optionalString(incotermDescription),
        is_active: incotermIsActive,
      },
    });
  };

  const handleSaveTransportMode = () => {
    if (!transportModeCode.trim() || !transportModeName.trim() || !transportModeType.trim()) return;

    saveTransportModeMutation.mutate({
      id: editingTransportMode?.id,
      payload: {
        mode_code: transportModeCode.trim().toUpperCase(),
        mode_name: transportModeName.trim(),
        mode_type: transportModeType.trim().toUpperCase(),
        description: optionalString(transportModeDescription),
        is_international: transportModeIsInternational,
        is_active: transportModeIsActive,
      },
    });
  };

  const handleSaveSupplier = () => {
    if (!supplierCode.trim() || !supplierName.trim()) return;

    saveSupplierMutation.mutate({
      id: editingSupplier?.id,
      payload: {
        supplier_code: supplierCode.trim().toUpperCase(),
        supplier_name: supplierName.trim(),
        supplier_roles: supplierRoles.length > 0 ? supplierRoles : ['SUPPLIER'],
        country: optionalString(supplierCountry),
        address: optionalString(supplierAddress),
        contact_name: optionalString(supplierContactName),
        contact_email: optionalString(supplierContactEmail),
        contact_phone: optionalString(supplierContactPhone),
        payment_term: optionalString(supplierPaymentTerm),
        default_currency_id: supplierCurrencyId || null,
        default_incoterm_id: supplierIncotermId || null,
        transport_mode_ids: supplierTransportModeIds,
        default_transport_mode_id: supplierDefaultTransportModeId || null,
        lead_time_days: optionalNumber(supplierLeadTimeDays),
        is_active: supplierIsActive,
      },
    });
  };

  const handleDeletePartner = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeletePartner'))) return;
    const updated = partners.filter((p) => p.id !== id);
    setPartners(updated);
    savePartners(updated);
  };

  const handleDeletePort = (id: string) => {
    if (!window.confirm(t('masterData.confirmDeletePort'))) return;
    const updated = ports.filter((p) => p.id !== id);
    setPorts(updated);
    savePorts(updated);
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

  const currencyColumns = useMemo<Array<ReferenceColumn<Currency>>>(
    () => [
      {
        key: 'code',
        label: t('masterData.currencyCode'),
        render: (currency) => (
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{currency.currency_code}</Badge>
            <Text fw={600}>{currency.currency_name}</Text>
          </Group>
        ),
      },
      {
        key: 'symbol',
        label: t('masterData.currencySymbol'),
        width: 110,
        render: (currency) => currency.symbol || '-',
      },
      {
        key: 'decimal_places',
        label: t('masterData.decimalPlaces'),
        width: 140,
        render: (currency) => currency.decimal_places,
      },
      {
        key: 'status',
        label: t('common.status'),
        width: 140,
        render: (currency) => <ActiveBadge active={currency.is_active} />,
      },
      {
        key: 'updated',
        label: t('masterData.updatedAt'),
        width: 170,
        render: (currency) => formatDateTime(currency.update_at),
      },
    ],
    [t],
  );

  const incotermColumns = useMemo<Array<ReferenceColumn<Incoterm>>>(
    () => [
      {
        key: 'code',
        label: t('masterData.incotermCode'),
        width: 150,
        render: (incoterm) => <Badge variant="light">{incoterm.incoterm_code}</Badge>,
      },
      {
        key: 'name',
        label: t('masterData.incotermName'),
        render: (incoterm) => <Text fw={600}>{incoterm.incoterm_name}</Text>,
      },
      {
        key: 'description',
        label: t('masterData.description'),
        render: (incoterm) => (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {incoterm.description || '-'}
          </Text>
        ),
      },
      {
        key: 'status',
        label: t('common.status'),
        width: 140,
        render: (incoterm) => <ActiveBadge active={incoterm.is_active} />,
      },
      {
        key: 'updated',
        label: t('masterData.updatedAt'),
        width: 170,
        render: (incoterm) => formatDateTime(incoterm.update_at),
      },
    ],
    [t],
  );

  const transportModeColumns = useMemo<Array<ReferenceColumn<TransportMode>>>(
    () => [
      {
        key: 'code',
        label: t('masterData.transportModeCode'),
        render: (mode) => (
          <Stack gap={2}>
            <Badge variant="light">{mode.mode_code}</Badge>
            <Text fw={600}>{mode.mode_name}</Text>
          </Stack>
        ),
      },
      {
        key: 'type',
        label: t('masterData.transportModeType'),
        width: 150,
        render: (mode) => <Badge color="blue" variant="outline">{mode.mode_type}</Badge>,
      },
      {
        key: 'scope',
        label: t('masterData.transportScope'),
        width: 160,
        render: (mode) => (
          <Badge color={mode.is_international ? 'teal' : 'gray'} variant="light">
            {mode.is_international ? t('masterData.international') : t('masterData.domestic')}
          </Badge>
        ),
      },
      {
        key: 'description',
        label: t('masterData.description'),
        render: (mode) => (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {mode.description || '-'}
          </Text>
        ),
      },
      {
        key: 'status',
        label: t('common.status'),
        width: 140,
        render: (mode) => <ActiveBadge active={mode.is_active} />,
      },
    ],
    [t],
  );

  const supplierColumns = useMemo<Array<ReferenceColumn<Supplier>>>(
    () => [
      {
        key: 'identity',
        label: t('masterData.supplier'),
        render: (supplier) => (
          <Stack gap={4}>
            <Group gap="xs" wrap="nowrap">
              <Badge variant="light">{supplier.supplier_code}</Badge>
              <Text fw={700} lineClamp={1} title={supplier.supplier_name}>
                {supplier.supplier_name}
              </Text>
            </Group>
            <Group gap={4}>
              {supplier.supplier_roles.map((role) => (
                <Badge key={role} size="xs" color="gray" variant="outline">
                  {role}
                </Badge>
              ))}
            </Group>
          </Stack>
        ),
      },
      {
        key: 'country',
        label: t('masterData.country'),
        width: 130,
        render: (supplier) => supplier.country || '-',
      },
      {
        key: 'contact',
        label: t('masterData.contact'),
        render: (supplier) => (
          <Stack gap={2}>
            <Text size="sm">{supplier.contact_name || '-'}</Text>
            <Text size="xs" c="dimmed">
              {[supplier.contact_email, supplier.contact_phone].filter(Boolean).join(' | ') || '-'}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'terms',
        label: t('masterData.defaultTerms'),
        render: (supplier) => (
          <Stack gap={2}>
            <Text size="sm">
              {supplier.default_currency?.currency_code || supplier.default_currency_code || '-'} /{' '}
              {supplier.default_incoterm?.incoterm_code || supplier.default_incoterm_code || '-'}
            </Text>
            <Text size="xs" c="dimmed">
              {supplier.payment_term || '-'}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'transport_modes',
        label: t('masterData.supplierTransportModes'),
        render: (supplier) => {
          const modes = supplier.supplier_transport_modes ?? [];

          if (modes.length === 0) {
            return <Text c="dimmed">-</Text>;
          }

          return (
            <Group gap={4}>
              {modes.slice(0, 3).map((mode) => (
                <Badge key={mode.id} color={mode.is_default ? 'teal' : 'gray'} variant="light">
                  {mode.transport_mode?.mode_code ?? mode.transport_mode_id}
                  {mode.is_default ? ` ${t('masterData.defaultShort')}` : ''}
                </Badge>
              ))}
              {modes.length > 3 ? (
                <Text size="xs" c="dimmed">
                  +{modes.length - 3}
                </Text>
              ) : null}
            </Group>
          );
        },
      },
      {
        key: 'lead_time',
        label: t('masterData.leadTimeDays'),
        width: 150,
        render: (supplier) => supplier.lead_time_days ?? '-',
      },
      {
        key: 'status',
        label: t('common.status'),
        width: 140,
        render: (supplier) => <ActiveBadge active={supplier.is_active} />,
      },
    ],
    [t],
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
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

      <Tabs value={activeTab} onChange={(val) => setActiveTab((val || 'partners') as typeof activeTab)}>
        <Tabs.List>
          <Tabs.Tab value="suppliers" leftSection={<IconTruckDelivery size={16} />}>
            {t('masterData.tabSuppliers')}
          </Tabs.Tab>
          <Tabs.Tab value="currencies" leftSection={<IconCash size={16} />}>
            {t('masterData.tabCurrencies')}
          </Tabs.Tab>
          <Tabs.Tab value="incoterms" leftSection={<IconRoute size={16} />}>
            {t('masterData.tabIncoterms')}
          </Tabs.Tab>
          <Tabs.Tab value="transportModes" leftSection={<IconMapPin size={16} />}>
            {t('masterData.tabTransportModes')}
          </Tabs.Tab>
          <Tabs.Tab value="partners" leftSection={<IconBuilding size={16} />}>
            {t('masterData.tabPartners')}
          </Tabs.Tab>
          <Tabs.Tab value="ports" leftSection={<IconMapPin size={16} />}>
            {t('masterData.tabPorts')}
          </Tabs.Tab>
          <Tabs.Tab value="items" leftSection={<IconFileCode size={16} />}>
            {t('masterData.tabHsCode')}
          </Tabs.Tab>
        </Tabs.List>

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

        <Tabs.Panel value="partners" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder={t('masterData.searchPartners')}
                leftSection={<IconSearch size={16} />}
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {canManageMasterData && (
                <Button onClick={openAddPartner} leftSection={<IconPlus size={16} />}>
                  {t('masterData.addPartner')}
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('masterData.partnerCode')}</Table.Th>
                      <Table.Th>{t('masterData.partnerName')}</Table.Th>
                      <Table.Th>{t('masterData.partnerType')}</Table.Th>
                      <Table.Th>{t('masterData.taxCode')}</Table.Th>
                      <Table.Th>{t('masterData.address')}</Table.Th>
                      <Table.Th>{t('masterData.contactEmail')}</Table.Th>
                      {canManageMasterData && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredPartners.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td fw={700}>{p.code}</Table.Td>
                        <Table.Td fw={600}>{p.name}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              p.type === 'SUPPLIER'
                                ? 'blue'
                                : p.type === 'CARRIER'
                                  ? 'orange'
                                  : 'teal'
                            }
                            variant="light"
                          >
                            {p.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{p.tax_code || '-'}</Table.Td>
                        <Table.Td>{p.address || '-'}</Table.Td>
                        <Table.Td>{p.contact_email || '-'}</Table.Td>
                        {canManageMasterData && (
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEditPartner(p)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePartner(p.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ports" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <TextInput
                placeholder={t('masterData.searchPorts')}
                leftSection={<IconSearch size={16} />}
                value={portSearch}
                onChange={(e) => setPortSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              {canManageMasterData && (
                <Button onClick={openAddPort} leftSection={<IconPlus size={16} />}>
                  {t('masterData.addPort')}
                </Button>
              )}
            </Group>

            <Paper withBorder p={0}>
              <ScrollArea>
                <Table verticalSpacing="md" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('masterData.portCode')}</Table.Th>
                      <Table.Th>{t('masterData.portName')}</Table.Th>
                      <Table.Th>{t('masterData.portType')}</Table.Th>
                      <Table.Th>{t('masterData.country')}</Table.Th>
                      {canManageMasterData && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredPorts.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td fw={700}>{p.port_code}</Table.Td>
                        <Table.Td fw={600}>{p.port_name}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              p.type === 'SEA' ? 'cyan' : p.type === 'AIR' ? 'indigo' : 'green'
                            }
                            variant="light"
                          >
                            {p.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{p.country}</Table.Td>
                        {canManageMasterData && (
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="subtle" color="blue" onClick={() => openEditPort(p)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePort(p.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="items" pt="md">
          <Stack gap="md">
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={700}>{t('masterData.itemGroupsTitle')}</Text>
                    <Text size="sm" c="dimmed">
                      {t('common.records', { count: itemGroupsQuery.data?.total ?? 0 })}
                    </Text>
                  </div>
                  <Group gap="xs">
                    <Tooltip label={t('masterData.refresh')}>
                      <ActionIcon variant="light" onClick={handleRefreshItems} loading={itemGroupsQuery.isFetching}>
                        <IconRefresh size={16} />
                      </ActionIcon>
                    </Tooltip>
                    {canManageMasterData && (
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openAddItemGroup}>
                        {t('masterData.addItemGroup')}
                      </Button>
                    )}
                  </Group>
                </Group>
                <TextInput
                  placeholder={t('masterData.searchItemGroups')}
                  leftSection={<IconSearch size={16} />}
                  value={itemGroupSearch}
                  onChange={(e) => setItemGroupSearch(e.currentTarget.value)}
                />

                {itemGroupsQuery.isError ? (
                  <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    {getApiErrorMessage(itemGroupsQuery.error)}
                  </Alert>
                ) : itemGroupsQuery.isLoading ? (
                  <Group justify="center" p="md">
                    <Loader size="sm" />
                  </Group>
                ) : filteredItemGroups.length === 0 ? (
                  <EmptyState
                    title={t('masterData.noItemGroups')}
                    description={t('masterData.noItemGroupsDescription')}
                    action={canManageMasterData ? { label: t('masterData.addItemGroup'), onClick: openAddItemGroup } : undefined}
                  />
                ) : (
                  <ScrollArea>
                    <Table verticalSpacing="sm" highlightOnHover>
                      <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('masterData.groupCode')}</Table.Th>
                            <Table.Th>{t('masterData.groupName')}</Table.Th>
                            <Table.Th>{t('masterData.defaultHsCode')}</Table.Th>
                            <Table.Th>{t('masterData.groupDescription')}</Table.Th>
                            {canManageMasterData && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
                          </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredItemGroups.map((group) => (
                          <Table.Tr key={group.id}>
                            <Table.Td fw={700}>{group.group_code || '-'}</Table.Td>
                            <Table.Td fw={600}>{group.group_name}</Table.Td>
                            <Table.Td>{group.default_hs_code || '-'}</Table.Td>
                            <Table.Td>{group.description || '-'}</Table.Td>
                            {canManageMasterData && (
                              <Table.Td>
                                <Group gap={4} wrap="nowrap">
                                  <ActionIcon variant="subtle" color="blue" onClick={() => openEditItemGroup(group)}>
                                    <IconPencil size={16} />
                                  </ActionIcon>
                                  <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteItemGroup(group.id)}>
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Group>
                              </Table.Td>
                            )}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between" align="end">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} style={{ flex: 1 }}>
                    <TextInput
                      label={t('masterData.itemCatalogTitle')}
                      placeholder={t('masterData.searchItems')}
                      leftSection={<IconSearch size={16} />}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.currentTarget.value)}
                    />
                    <Select
                      label={t('masterData.itemGroup')}
                      placeholder={t('masterData.allItemGroups')}
                      data={groupOptions}
                      value={itemGroupFilter}
                      onChange={setItemGroupFilter}
                      clearable
                      searchable
                    />
                  </SimpleGrid>
                  {canManageMasterData && (
                    <Button onClick={openAddItem} leftSection={<IconPlus size={16} />}>
                      {t('masterData.addItem')}
                    </Button>
                  )}
                </Group>

                {itemsQuery.isError ? (
                  <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    {getApiErrorMessage(itemsQuery.error)}
                  </Alert>
                ) : itemsQuery.isLoading ? (
                  <Group justify="center" p="xl">
                    <Loader />
                  </Group>
                ) : items.length === 0 ? (
                  <EmptyState
                    title={t('masterData.noItems')}
                    description={t('masterData.noItemsDescription')}
                    action={canManageMasterData ? { label: t('masterData.addItem'), onClick: openAddItem } : undefined}
                  />
                ) : (
                  <Paper withBorder p={0}>
                    <ScrollArea>
                      <Table miw={1120} verticalSpacing="md" highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('masterData.itemName')}</Table.Th>
                            <Table.Th>{t('masterData.itemGroup')}</Table.Th>
                            <Table.Th>{t('masterData.commercialInfo')}</Table.Th>
                            <Table.Th>{t('masterData.logisticsInfo')}</Table.Th>
                            <Table.Th>{t('masterData.taxProfiles')}</Table.Th>
                            <Table.Th>{t('common.status')}</Table.Th>
                            <Table.Th>{t('masterData.updatedAt')}</Table.Th>
                            <Table.Th style={{ width: canManageMasterData ? 132 : 52 }}>{t('masterData.actions')}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {items.map((item, index) => {
                            const profiles = taxProfilesByItemId.get(item.id) ?? [];
                            const profileQuery = taxProfileQueries[index];

                            return (
                              <Table.Tr key={item.id}>
                                <Table.Td className="table-cell-truncate" style={{ maxWidth: '26rem' }}>
                                  <Group gap={8} mb={4} wrap="nowrap">
                                    <Text size="sm" fw={700}>
                                      {item.item_code}
                                    </Text>
                                    <Badge color={item.is_new === false ? 'gray' : 'blue'} variant="light">
                                      {item.is_new === false
                                        ? t('masterData.usedStatus')
                                        : t('masterData.newStatus')}
                                    </Badge>
                                  </Group>
                                  <Text size="sm" fw={600} lineClamp={2} title={item.item_name}>
                                    {item.item_name}
                                  </Text>
                                  <Text size="xs" c="dimmed" lineClamp={2}>
                                    {item.item_description || '-'}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ minWidth: '12rem' }}>
                                  <Text size="sm" fw={600}>
                                    {item.item_group?.group_name || '-'}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {item.item_group?.group_code || item.item_group_id || ''}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {t('masterData.defaultHsCode')}: {item.item_group?.default_hs_code || '-'}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ minWidth: '11rem' }}>
                                  <Text size="sm" fw={600}>
                                    {[item.brand, item.model].filter(Boolean).join(' / ') || '-'}
                                  </Text>
                                  <Text size="xs" c="dimmed" lineClamp={2}>
                                    {[item.unit, item.item_type].filter(Boolean).join(' | ') || '-'}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ minWidth: '9rem' }}>
                                  <Text size="sm">{item.origin_country || '-'}</Text>
                                  <Text size="xs" c="dimmed">
                                    {t('masterData.leadTimeDays')}: {item.lead_time_days ?? '-'} | {t('masterData.moq')}:{' '}
                                    {formatDecimal(item.moq)}
                                  </Text>
                                </Table.Td>
                                <Table.Td style={{ minWidth: '10rem' }}>
                                  <TaxProfilesCell
                                    profiles={profiles}
                                    isLoading={profiles.length === 0 && Boolean(profileQuery?.isLoading)}
                                    loadingLabel={t('masterData.taxProfileLoading')}
                                    preferentialLabel={t('masterData.preferentialShort')}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <Badge color={item.is_active === false ? 'gray' : 'teal'} variant="light">
                                    {item.is_active === false
                                      ? t('masterData.inactiveStatus')
                                      : t('masterData.activeStatus')}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>{formatDateTime(item.update_at)}</Table.Td>
                                <Table.Td>
                                  <Group gap={4} wrap="nowrap">
                                    <Tooltip label={canManageMasterData ? t('common.edit') : t('masterData.viewItem')}>
                                      <ActionIcon
                                        variant="subtle"
                                        color={canManageMasterData ? 'blue' : 'gray'}
                                        aria-label={canManageMasterData ? t('common.edit') : t('masterData.viewItem')}
                                        onClick={() => openEditItem(item)}
                                      >
                                        {canManageMasterData ? <IconPencil size={16} /> : <IconEye size={16} />}
                                      </ActionIcon>
                                    </Tooltip>
                                    {canManageMasterData && (
                                      <Tooltip label={t('common.delete')}>
                                        <ActionIcon
                                          variant="subtle"
                                          color="red"
                                          loading={deleteItemMutation.isPending}
                                          onClick={() => handleDeleteItem(item.id)}
                                        >
                                          <IconTrash size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                    <ListPagination
                      page={itemPage}
                      pageCount={itemPageCount}
                      pageEnd={itemPageEnd}
                      pageStart={itemPageStart}
                      setPage={setItemPage}
                      total={itemTotal}
                    />
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={currencyModalOpened}
        onClose={currencyModalHandlers.close}
        title={editingCurrency ? t('masterData.editCurrency') : t('masterData.createCurrency')}
      >
        <Stack gap="md">
          {saveCurrencyMutation.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {getApiErrorMessage(saveCurrencyMutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.currencyCode')}
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.currencyName')}
              value={currencyName}
              onChange={(event) => setCurrencyName(event.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.currencySymbol')}
              value={currencySymbol}
              onChange={(event) => setCurrencySymbol(event.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.decimalPlaces')}
              type="number"
              value={currencyDecimalPlaces}
              onChange={(event) => setCurrencyDecimalPlaces(event.currentTarget.value)}
            />
          </SimpleGrid>
          <Switch
            label={t('masterData.active')}
            checked={currencyIsActive}
            onChange={(event) => setCurrencyIsActive(event.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={currencyModalHandlers.close}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveCurrency}
              loading={saveCurrencyMutation.isPending}
              disabled={!currencyCode.trim() || !currencyName.trim()}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={incotermModalOpened}
        onClose={incotermModalHandlers.close}
        title={editingIncoterm ? t('masterData.editIncoterm') : t('masterData.createIncoterm')}
      >
        <Stack gap="md">
          {saveIncotermMutation.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {getApiErrorMessage(saveIncotermMutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.incotermCode')}
              value={incotermCode}
              onChange={(event) => setIncotermCode(event.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.incotermName')}
              value={incotermName}
              onChange={(event) => setIncotermName(event.currentTarget.value)}
              required
            />
          </SimpleGrid>
          <Textarea
            label={t('masterData.description')}
            value={incotermDescription}
            onChange={(event) => setIncotermDescription(event.currentTarget.value)}
            autosize
            minRows={3}
          />
          <Switch
            label={t('masterData.active')}
            checked={incotermIsActive}
            onChange={(event) => setIncotermIsActive(event.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={incotermModalHandlers.close}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveIncoterm}
              loading={saveIncotermMutation.isPending}
              disabled={!incotermCode.trim() || !incotermName.trim()}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={transportModeModalOpened}
        onClose={transportModeModalHandlers.close}
        title={
          editingTransportMode
            ? t('masterData.editTransportMode')
            : t('masterData.createTransportMode')
        }
      >
        <Stack gap="md">
          {saveTransportModeMutation.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {getApiErrorMessage(saveTransportModeMutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.transportModeCode')}
              value={transportModeCode}
              onChange={(event) => setTransportModeCode(event.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.transportModeName')}
              value={transportModeName}
              onChange={(event) => setTransportModeName(event.currentTarget.value)}
              required
            />
            <Select
              label={t('masterData.transportModeType')}
              value={transportModeType}
              onChange={(value) => setTransportModeType(value || 'SEA')}
              data={['SEA', 'AIR', 'ROAD', 'RAIL', 'MULTIMODAL', 'FCL', 'LCL']}
              searchable
              required
            />
          </SimpleGrid>
          <Textarea
            label={t('masterData.description')}
            value={transportModeDescription}
            onChange={(event) => setTransportModeDescription(event.currentTarget.value)}
            autosize
            minRows={3}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Switch
              label={t('masterData.international')}
              checked={transportModeIsInternational}
              onChange={(event) => setTransportModeIsInternational(event.currentTarget.checked)}
            />
            <Switch
              label={t('masterData.active')}
              checked={transportModeIsActive}
              onChange={(event) => setTransportModeIsActive(event.currentTarget.checked)}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={transportModeModalHandlers.close}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveTransportMode}
              loading={saveTransportModeMutation.isPending}
              disabled={
                !transportModeCode.trim() ||
                !transportModeName.trim() ||
                !transportModeType.trim()
              }
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={supplierModalOpened}
        onClose={supplierModalHandlers.close}
        size="xl"
        title={editingSupplier ? t('masterData.editSupplier') : t('masterData.createSupplier')}
      >
        <Stack gap="md">
          {saveSupplierMutation.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {getApiErrorMessage(saveSupplierMutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.supplierCode')}
              value={supplierCode}
              onChange={(event) => setSupplierCode(event.currentTarget.value)}
              required
            />
            <TextInput
              label={t('masterData.supplierName')}
              value={supplierName}
              onChange={(event) => setSupplierName(event.currentTarget.value)}
              required
            />
            <MultiSelect
              label={t('masterData.supplierRoles')}
              value={supplierRoles}
              onChange={setSupplierRoles}
              data={[
                'SUPPLIER',
                'SHIPPER',
                'VENDOR',
                'FORWARDER',
                'TRUCKING_VENDOR',
                'CUSTOMS_BROKER',
              ]}
              searchable
              required
            />
            <TextInput
              label={t('masterData.country')}
              value={supplierCountry}
              onChange={(event) => setSupplierCountry(event.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.contactName')}
              value={supplierContactName}
              onChange={(event) => setSupplierContactName(event.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.contactEmail')}
              value={supplierContactEmail}
              onChange={(event) => setSupplierContactEmail(event.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.contactPhone')}
              value={supplierContactPhone}
              onChange={(event) => setSupplierContactPhone(event.currentTarget.value)}
            />
            <TextInput
              label={t('masterData.paymentTerm')}
              value={supplierPaymentTerm}
              onChange={(event) => setSupplierPaymentTerm(event.currentTarget.value)}
            />
            <Select
              label={t('masterData.defaultCurrency')}
              value={supplierCurrencyId}
              onChange={setSupplierCurrencyId}
              data={currencyOptions}
              searchable
              clearable
            />
            <Select
              label={t('masterData.defaultIncoterm')}
              value={supplierIncotermId}
              onChange={setSupplierIncotermId}
              data={incotermOptions}
              searchable
              clearable
            />
            <MultiSelect
              label={t('masterData.supplierTransportModes')}
              value={supplierTransportModeIds}
              onChange={(values) => {
                setSupplierTransportModeIds(values);
                if (supplierDefaultTransportModeId && !values.includes(supplierDefaultTransportModeId)) {
                  setSupplierDefaultTransportModeId(null);
                }
              }}
              data={transportModeOptions}
              searchable
              clearable
            />
            <Select
              label={t('masterData.defaultTransportMode')}
              value={supplierDefaultTransportModeId}
              onChange={setSupplierDefaultTransportModeId}
              data={supplierDefaultTransportModeOptions}
              searchable
              clearable
              disabled={supplierTransportModeIds.length === 0}
            />
            <TextInput
              label={t('masterData.leadTimeDays')}
              type="number"
              value={supplierLeadTimeDays}
              onChange={(event) => setSupplierLeadTimeDays(event.currentTarget.value)}
            />
          </SimpleGrid>
          <Textarea
            label={t('masterData.address')}
            value={supplierAddress}
            onChange={(event) => setSupplierAddress(event.currentTarget.value)}
            autosize
            minRows={3}
          />
          <Switch
            label={t('masterData.active')}
            checked={supplierIsActive}
            onChange={(event) => setSupplierIsActive(event.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={supplierModalHandlers.close}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveSupplier}
              loading={saveSupplierMutation.isPending}
              disabled={!supplierCode.trim() || !supplierName.trim() || supplierRoles.length === 0}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={partnerModalOpened}
        onClose={partnerModalHandlers.close}
        title={editingPartner ? t('masterData.editPartner') : t('masterData.createPartner')}
      >
        <Stack gap="md">
          <TextInput
            label={t('masterData.partnerCode')}
            placeholder={t('masterData.partnerCodePlaceholder')}
            value={partCode}
            onChange={(e) => setPartCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPartner)}
          />
          <TextInput
            label={t('masterData.partnerName')}
            placeholder={t('masterData.partnerNamePlaceholder')}
            value={partName}
            onChange={(e) => setPartName(e.currentTarget.value)}
            required
          />
          <Select
            label={t('masterData.partnerType')}
            value={partType}
            onChange={(val) => setPartType(val || 'SUPPLIER')}
            data={[
              { label: t('masterData.supplierType'), value: 'SUPPLIER' },
              { label: t('masterData.carrierType'), value: 'CARRIER' },
              { label: t('masterData.forwarderType'), value: 'FORWARDER' },
            ]}
          />
          <TextInput
            label={t('masterData.taxCode')}
            placeholder={t('masterData.taxCodePlaceholder')}
            value={partTax}
            onChange={(e) => setPartTax(e.currentTarget.value)}
          />
          <TextInput
            label={t('masterData.address')}
            placeholder={t('masterData.addressPlaceholder')}
            value={partAddress}
            onChange={(e) => setPartAddress(e.currentTarget.value)}
          />
          <TextInput
            label={t('masterData.contactEmail')}
            placeholder={t('masterData.emailPlaceholder')}
            value={partEmail}
            onChange={(e) => setPartEmail(e.currentTarget.value)}
          />
          <Button onClick={handleSavePartner} fullWidth mt="md">
            {t('masterData.savePartner')}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={portModalOpened}
        onClose={portModalHandlers.close}
        title={editingPort ? t('masterData.editPort') : t('masterData.createPort')}
      >
        <Stack gap="md">
          <TextInput
            label={t('masterData.portCodeLabel')}
            placeholder={t('masterData.portCodePlaceholder')}
            value={portCode}
            onChange={(e) => setPortCode(e.currentTarget.value)}
            required
            disabled={Boolean(editingPort)}
          />
          <TextInput
            label={t('masterData.portName')}
            placeholder={t('masterData.portNamePlaceholder')}
            value={portName}
            onChange={(e) => setPortName(e.currentTarget.value)}
            required
          />
          <TextInput
            label={t('masterData.country')}
            placeholder={t('masterData.countryPlaceholder')}
            value={portCountry}
            onChange={(e) => setPortCountry(e.currentTarget.value)}
            required
          />
          <Select
            label={t('masterData.portType')}
            value={portType}
            onChange={(val) => setPortType(val || 'SEA')}
            data={[
              { label: t('masterData.seaPortLabel'), value: 'SEA' },
              { label: t('masterData.airPortLabel'), value: 'AIR' },
              { label: t('masterData.borderPortLabel'), value: 'BORDER' },
            ]}
          />
          <Button onClick={handleSavePort} fullWidth mt="md">
            {t('masterData.savePort')}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={itemGroupModalOpened}
        onClose={itemGroupModalHandlers.close}
        size="lg"
        title={
          <Group gap="sm" wrap="nowrap">
            <Badge variant="light" size="lg" radius="sm" leftSection={<IconFileCode size={14} />}>
              {editingItemGroup ? t('common.update') : t('common.add')}
            </Badge>
            <Text fw={700}>
              {editingItemGroup ? t('masterData.editItemGroup') : t('masterData.createItemGroup')}
            </Text>
          </Group>
        }
      >
        <Stack gap="md">
          {saveItemGroupMutation.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {getApiErrorMessage(saveItemGroupMutation.error)}
            </Alert>
          ) : null}

          {editingItemGroup ? (
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" align="center" gap="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('masterData.itemGroup')}
                  </Text>
                  <Text fw={700}>{editingItemGroup.group_name}</Text>
                </div>
                <Badge variant="light">{editingItemGroup.group_code || editingItemGroup.id}</Badge>
              </Group>
            </Paper>
          ) : null}

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Group gap="xs">
                <IconFileCode size={18} />
                <Text fw={700}>{t('masterData.itemGroup')}</Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t('masterData.groupCode')}
                  placeholder="GRP001"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.currentTarget.value)}
                />
                <TextInput
                  data-autofocus
                  label={t('masterData.groupName')}
                  placeholder="Hardware"
                  value={groupName}
                  onChange={(e) => setGroupName(e.currentTarget.value)}
                  required
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Group gap="xs">
                <IconSearch size={18} />
                <Text fw={700}>{t('masterData.defaultHsCode')}</Text>
              </Group>
              <TextInput
                label={t('masterData.defaultHsCode')}
                placeholder={t('masterData.hsCodePlaceholder')}
                value={groupDefaultHsCode}
                onChange={(e) => setGroupDefaultHsCode(e.currentTarget.value)}
              />
              <Textarea
                label={t('masterData.groupDescription')}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.currentTarget.value)}
                autosize
                minRows={4}
              />
            </Stack>
          </Paper>

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={itemGroupModalHandlers.close}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveItemGroup}
              loading={saveItemGroupMutation.isPending}
              disabled={!groupName.trim()}
              leftSection={editingItemGroup ? <IconPencil size={16} /> : <IconPlus size={16} />}
            >
              {t('masterData.saveItemGroup')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={itemModalOpened}
        onClose={itemModalHandlers.close}
        size="xl"
        title={
          editingItem
            ? canManageMasterData
              ? t('masterData.editItem')
              : t('masterData.itemDetail')
            : t('masterData.createItem')
        }
      >
        <Stack gap="md">
          {saveItemMutation.isError ? (
            <Alert color="red">{getApiErrorMessage(saveItemMutation.error)}</Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t('masterData.itemCodeLabel')}
              placeholder={t('masterData.itemCodePlaceholder')}
              value={itemCode}
              onChange={(e) => setItemCode(e.currentTarget.value)}
              required
              disabled={Boolean(editingItem) || itemFormReadOnly}
            />
            <Select
              label={t('masterData.itemGroup')}
              placeholder={t('masterData.allItemGroups')}
              data={groupOptions}
              value={itemGroupId}
              onChange={setItemGroupId}
              clearable
              searchable
              disabled={itemFormReadOnly}
            />
          </SimpleGrid>

          <TextInput
            label={t('masterData.itemNameLabel')}
            placeholder={t('masterData.itemNamePlaceholder')}
            value={itemName}
            onChange={(e) => setItemName(e.currentTarget.value)}
            required
            disabled={itemFormReadOnly}
          />
          <Textarea
            label={t('masterData.itemDescription')}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            disabled={itemFormReadOnly}
          />

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label={t('masterData.unit')}
              value={itemUnit}
              onChange={(e) => setItemUnit(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.itemType')}
              value={itemType}
              onChange={(e) => setItemType(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.originCountry')}
              value={itemOriginCountry}
              onChange={(e) => setItemOriginCountry(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.brand')}
              value={itemBrand}
              onChange={(e) => setItemBrand(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.model')}
              value={itemModel}
              onChange={(e) => setItemModel(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.leadTimeDays')}
              type="number"
              value={itemLeadTimeDays}
              onChange={(e) => setItemLeadTimeDays(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <TextInput
              label={t('masterData.moq')}
              type="number"
              value={itemMoq}
              onChange={(e) => setItemMoq(e.currentTarget.value)}
              disabled={itemFormReadOnly}
            />
            <Switch
              label={t('masterData.newItem')}
              checked={itemIsNew}
              onChange={(event) => setItemIsNew(event.currentTarget.checked)}
              mt="xl"
              disabled={itemFormReadOnly}
            />
            <Switch
              label={t('masterData.active')}
              checked={itemIsActive}
              onChange={(event) => setItemIsActive(event.currentTarget.checked)}
              mt="xl"
              disabled={itemFormReadOnly}
            />
          </SimpleGrid>

          {editingItem ? (
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text fw={700}>{t('masterData.taxProfiles')}</Text>
                  <Badge variant="light">{selectedItemProfiles.length}</Badge>
                </Group>
                {selectedItemProfiles.length === 0 ? (
                  <Text c="dimmed">-</Text>
                ) : (
                  <Stack gap="md">
                    {selectedItemProfiles.map((profile, index) => (
                      <Paper key={profile.id} withBorder p="sm">
                        <Stack gap="sm">
                          <Group justify="space-between" align="center">
                            <Group gap="xs">
                              <Badge color={profile.is_default ? 'teal' : 'gray'} variant="light">
                                {profile.hs_code || 'HS -'}
                              </Badge>
                              {profile.is_default ? (
                                <Badge color="teal" variant="outline">
                                  {t('masterData.defaultProfile')}
                                </Badge>
                              ) : null}
                            </Group>
                            <Text size="xs" c="dimmed">
                              #{index + 1}
                            </Text>
                          </Group>
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <DetailField label={t('masterData.dutyRate')} value={formatRate(profile.import_duty_rate)} />
                            <DetailField label={t('masterData.vatRate')} value={formatRate(profile.vat_rate)} />
                            <DetailField
                              label={t('masterData.preferentialImportDutyRate')}
                              value={formatRate(profile.preferential_import_duty_rate)}
                            />
                            <DetailField label={t('masterData.coForm')} value={profile.co_form || '-'} />
                            <DetailField label={t('masterData.customsType')} value={profile.customs_type || '-'} />
                            <DetailField label={t('masterData.referenceDocNo')} value={profile.reference_doc_no || '-'} />
                            <DetailField label={t('masterData.locationCode')} value={profile.location_code || '-'} />
                          </SimpleGrid>
                          <Divider />
                          <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <DetailField label={t('masterData.coTaxNote')} value={profile.co_tax_note || '-'} />
                            <DetailField label={t('masterData.customsNote')} value={profile.customs_note || '-'} />
                            <DetailField label={t('masterData.taxNote')} value={profile.tax_note || '-'} />
                          </SimpleGrid>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          ) : null}

          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={700}>{t('masterData.itemFormTaxProfileTitle')}</Text>
                  <Text size="sm" c="dimmed">
                    {t('masterData.itemFormTaxProfileDescription')}
                  </Text>
                </div>
                {editingTaxProfileId && !itemFormReadOnly ? (
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    loading={deleteTaxProfileMutation.isPending}
                    onClick={() => deleteTaxProfileMutation.mutate(editingTaxProfileId)}
                  >
                    {t('masterData.deleteTaxProfile')}
                  </Button>
                ) : null}
              </Group>
              {deleteTaxProfileMutation.isError ? (
                <Alert color="red">{getApiErrorMessage(deleteTaxProfileMutation.error)}</Alert>
              ) : null}
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput
                  label={t('masterData.hsCode')}
                  placeholder={t('masterData.hsCodePlaceholder')}
                  value={taxHsCode}
                  onChange={(e) => setTaxHsCode(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.dutyRateLabel')}
                  type="number"
                  value={taxImportDutyRate}
                  onChange={(e) => setTaxImportDutyRate(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.vatRateLabel')}
                  type="number"
                  value={taxVatRate}
                  onChange={(e) => setTaxVatRate(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.preferentialImportDutyRate')}
                  type="number"
                  value={taxPreferentialImportDutyRate}
                  onChange={(e) => setTaxPreferentialImportDutyRate(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label={t('masterData.coForm')}
                  value={taxCoForm}
                  onChange={(e) => setTaxCoForm(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.customsType')}
                  value={taxCustomsType}
                  onChange={(e) => setTaxCustomsType(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.referenceDocNo')}
                  value={taxReferenceDocNo}
                  onChange={(e) => setTaxReferenceDocNo(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <TextInput
                  label={t('masterData.locationCode')}
                  value={taxLocationCode}
                  onChange={(e) => setTaxLocationCode(e.currentTarget.value)}
                  disabled={itemFormReadOnly}
                />
                <Textarea
                  label={t('masterData.coTaxNote')}
                  value={taxCoTaxNote}
                  onChange={(e) => setTaxCoTaxNote(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  disabled={itemFormReadOnly}
                />
                <Textarea
                  label={t('masterData.customsNote')}
                  value={taxCustomsNote}
                  onChange={(e) => setTaxCustomsNote(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  disabled={itemFormReadOnly}
                />
                <Textarea
                  label={t('masterData.taxNote')}
                  value={taxTaxNote}
                  onChange={(e) => setTaxTaxNote(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  disabled={itemFormReadOnly}
                />
              </SimpleGrid>
              <Switch
                label={t('masterData.defaultProfile')}
                checked={taxIsDefault}
                onChange={(event) => setTaxIsDefault(event.currentTarget.checked)}
                disabled={itemFormReadOnly}
              />
            </Stack>
          </Paper>

          {canManageMasterData ? (
            <Button onClick={handleSaveItem} fullWidth mt="md" loading={saveItemMutation.isPending}>
              {t('masterData.saveItem')}
            </Button>
          ) : null}
        </Stack>
      </Modal>
    </Stack>
  );
}
