import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
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
  IconEye,
  IconFileCode,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
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

  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [editingPort, setEditingPort] = useState<PortRecord | null>(null);
  const [editingItemGroup, setEditingItemGroup] = useState<ItemGroup | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

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

  const itemGroups = itemGroupsQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];

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
