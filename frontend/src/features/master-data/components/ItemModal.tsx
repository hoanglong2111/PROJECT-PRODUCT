import { Alert, Badge, Button, Divider, Group, Modal, Paper, Select, SimpleGrid, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  createItem,
  createItemTaxProfile,
  deleteItemTaxProfile,
  fetchItem,
  fetchItemTaxProfiles,
  updateItem,
  updateItemTaxProfile,
  type CreateItemPayload,
  type CreateItemTaxProfilePayload,
  type Item,
  type ItemTaxProfile,
} from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { formatRate, getPrimaryTaxProfile, optionalNumber, optionalString } from '../model/masterDataModel';
import { DetailField } from './DetailField';

type ItemFormValues = {
  code: string;
  name: string;
  description: string;
  groupId: string | null;
  unit: string;
  type: string;
  originCountry: string;
  brand: string;
  model: string;
  isNew: boolean;
  leadTimeDays: string;
  moq: string;
  isActive: boolean;
  taxHsCode: string;
  taxImportDutyRate: string;
  taxVatRate: string;
  taxCoForm: string;
  taxCoTaxNote: string;
  taxCustomsType: string;
  taxCustomsNote: string;
  taxReferenceDocNo: string;
  taxLocationCode: string;
  taxTaxNote: string;
  taxPreferentialImportDutyRate: string;
  taxIsDefault: boolean;
};

const emptyTaxValues = {
  taxHsCode: '',
  taxImportDutyRate: '',
  taxVatRate: '',
  taxCoForm: '',
  taxCoTaxNote: '',
  taxCustomsType: '',
  taxCustomsNote: '',
  taxReferenceDocNo: '',
  taxLocationCode: '',
  taxTaxNote: '',
  taxPreferentialImportDutyRate: '',
  taxIsDefault: true,
};

const emptyValues: ItemFormValues = {
  code: '',
  name: '',
  description: '',
  groupId: null,
  unit: '',
  type: '',
  originCountry: '',
  brand: '',
  model: '',
  isNew: true,
  leadTimeDays: '',
  moq: '',
  isActive: true,
  ...emptyTaxValues,
};

function hintedLabel(label: string, hint: string) {
  return (
    <Group gap={4} component="span" wrap="nowrap">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  );
}

function numberToString(value: number | string | null | undefined) {
  return value !== null && value !== undefined ? String(value) : '';
}

function taxValuesFromProfile(profile: ItemTaxProfile | null) {
  if (!profile) return { ...emptyTaxValues };
  return {
    taxHsCode: profile.hs_code ?? '',
    taxImportDutyRate: numberToString(profile.import_duty_rate),
    taxVatRate: numberToString(profile.vat_rate),
    taxCoForm: profile.co_form ?? '',
    taxCoTaxNote: profile.co_tax_note ?? '',
    taxCustomsType: profile.customs_type ?? '',
    taxCustomsNote: profile.customs_note ?? '',
    taxReferenceDocNo: profile.reference_doc_no ?? '',
    taxLocationCode: profile.location_code ?? '',
    taxTaxNote: profile.tax_note ?? '',
    taxPreferentialImportDutyRate: numberToString(profile.preferential_import_duty_rate),
    taxIsDefault: profile.is_default ?? true,
  };
}

function itemValuesFromItem(item: Item): Omit<ItemFormValues, keyof typeof emptyTaxValues> {
  return {
    code: item.item_code,
    name: item.item_name,
    description: item.item_description ?? '',
    groupId: item.item_group_id ?? null,
    unit: item.unit ?? '',
    type: item.item_type ?? '',
    originCountry: item.origin_country ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    isNew: item.is_new ?? true,
    leadTimeDays: numberToString(item.lead_time_days),
    moq: numberToString(item.moq),
    isActive: item.is_active ?? true,
  };
}

export function ItemModal({
  canManage,
  defaultGroupId,
  editing,
  groupOptions,
  onClose,
  opened,
}: {
  canManage: boolean;
  defaultGroupId: string | null;
  editing: Item | null;
  groupOptions: Array<{ label: string; value: string }>;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ItemFormValues>({ initialValues: emptyValues });
  const [editingTaxProfileId, setEditingTaxProfileId] = useState<string | null>(null);
  const [loadedProfiles, setLoadedProfiles] = useState<ItemTaxProfile[]>([]);

  const itemFormReadOnly = Boolean(editing) && !canManage;

  const applyItemToForm = (item: Item, profiles: ItemTaxProfile[]) => {
    const fallbackProfiles = profiles.length > 0 ? profiles : item.customs_profiles ?? [];
    setLoadedProfiles(fallbackProfiles);
    const primary = getPrimaryTaxProfile(fallbackProfiles);
    setEditingTaxProfileId(primary?.id ?? null);
    form.setValues({ ...itemValuesFromItem(item), ...taxValuesFromProfile(primary) });
  };

  useEffect(() => {
    if (!opened) return;
    if (!editing) {
      form.setValues({ ...emptyValues, groupId: defaultGroupId });
      setLoadedProfiles([]);
      setEditingTaxProfileId(null);
      return;
    }
    applyItemToForm(editing, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const detailQuery = useQuery({
    enabled: opened && Boolean(editing),
    queryKey: editing ? queryKeys.itemDetail(editing.id) : queryKeys.itemDetail('idle'),
    queryFn: () => fetchItem(editing?.id ?? ''),
  });
  const profilesQuery = useQuery({
    enabled: opened && Boolean(editing),
    queryKey: editing ? queryKeys.itemTaxProfiles(editing.id) : queryKeys.itemTaxProfiles('idle'),
    queryFn: () => fetchItemTaxProfiles(editing?.id ?? ''),
  });

  useEffect(() => {
    if (!opened || !editing) return;
    if (detailQuery.data && profilesQuery.data) {
      applyItemToForm(detailQuery.data, profilesQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data, profilesQuery.data, opened, editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = editing?.id;
      const payload: CreateItemPayload = {
        item_code: form.values.code.trim(),
        item_name: form.values.name.trim(),
        item_description: optionalString(form.values.description),
        item_group_id: form.values.groupId || undefined,
        unit: optionalString(form.values.unit),
        item_type: optionalString(form.values.type),
        origin_country: optionalString(form.values.originCountry),
        brand: optionalString(form.values.brand),
        model: optionalString(form.values.model),
        is_new: form.values.isNew,
        lead_time_days: optionalNumber(form.values.leadTimeDays),
        moq: optionalNumber(form.values.moq),
        is_active: form.values.isActive,
      };

      const taxPayload: CreateItemTaxProfilePayload = {
        hs_code: optionalString(form.values.taxHsCode),
        import_duty_rate: optionalNumber(form.values.taxImportDutyRate),
        vat_rate: optionalNumber(form.values.taxVatRate),
        co_form: optionalString(form.values.taxCoForm),
        co_tax_note: optionalString(form.values.taxCoTaxNote),
        customs_type: optionalString(form.values.taxCustomsType),
        customs_note: optionalString(form.values.taxCustomsNote),
        reference_doc_no: optionalString(form.values.taxReferenceDocNo),
        location_code: optionalString(form.values.taxLocationCode),
        tax_note: optionalString(form.values.taxTaxNote),
        preferential_import_duty_rate: optionalNumber(form.values.taxPreferentialImportDutyRate),
        is_default: form.values.taxIsDefault,
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

      const shouldSaveTaxProfile = Boolean(editingTaxProfileId) || hasTaxProfileContent;

      const savedItem = id ? await updateItem(id, payload) : await createItem(payload);
      const itemId = id ?? savedItem.id;

      if (shouldSaveTaxProfile) {
        if (editingTaxProfileId) {
          await updateItemTaxProfile(editingTaxProfileId, taxPayload);
        } else {
          await createItemTaxProfile(itemId, taxPayload);
        }
      }

      return savedItem;
    },
    onSuccess: (savedItem) => {
      onClose();
      const itemId = editing?.id ?? savedItem.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemDetail(itemId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemTaxProfiles(itemId) }),
      ]);
    },
  });

  const deleteTaxProfileMutation = useMutation({
    mutationFn: deleteItemTaxProfile,
    onSuccess: () => {
      setEditingTaxProfileId(null);
      form.setValues(emptyTaxValues);
      if (editing) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.itemDetail(editing.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
          queryClient.invalidateQueries({ queryKey: queryKeys.itemTaxProfiles(editing.id) }),
        ]);
      }
    },
  });

  const handleSave = () => {
    if (!canManage) return;
    if (!form.values.code.trim() || !form.values.name.trim()) return;
    saveMutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        editing
          ? canManage
            ? t('masterData.editItem')
            : t('masterData.itemDetail')
          : t('masterData.createItem')
      }
    >
      <Stack gap="md">
        {saveMutation.isError ? (
          <Alert color="red">{getApiErrorMessage(saveMutation.error)}</Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('masterData.itemCodeLabel')}
            placeholder={t('masterData.itemCodePlaceholder')}
            required
            disabled={Boolean(editing) || itemFormReadOnly}
            {...form.getInputProps('code')}
          />
          <Select
            label={t('masterData.itemGroup')}
            placeholder={t('masterData.allItemGroups')}
            data={groupOptions}
            clearable
            searchable
            disabled={itemFormReadOnly}
            {...form.getInputProps('groupId')}
          />
        </SimpleGrid>

        <TextInput
          label={t('masterData.itemNameLabel')}
          placeholder={t('masterData.itemNamePlaceholder')}
          required
          disabled={itemFormReadOnly}
          {...form.getInputProps('name')}
        />
        <Textarea
          label={t('masterData.itemDescription')}
          autosize
          minRows={2}
          disabled={itemFormReadOnly}
          {...form.getInputProps('description')}
        />

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label={t('masterData.unit')} disabled={itemFormReadOnly} {...form.getInputProps('unit')} />
          <TextInput label={t('masterData.itemType')} disabled={itemFormReadOnly} {...form.getInputProps('type')} />
          <TextInput label={t('masterData.originCountry')} disabled={itemFormReadOnly} {...form.getInputProps('originCountry')} />
          <TextInput label={t('masterData.brand')} disabled={itemFormReadOnly} {...form.getInputProps('brand')} />
          <TextInput label={t('masterData.model')} disabled={itemFormReadOnly} {...form.getInputProps('model')} />
          <TextInput
            label={hintedLabel(t('masterData.leadTimeDays'), t('glossary.leadTimeDays'))}
            type="number"
            disabled={itemFormReadOnly}
            {...form.getInputProps('leadTimeDays')}
          />
          <TextInput label={t('masterData.moq')} type="number" disabled={itemFormReadOnly} {...form.getInputProps('moq')} />
          <Switch label={t('masterData.newItem')} mt="xl" disabled={itemFormReadOnly} {...form.getInputProps('isNew', { type: 'checkbox' })} />
          <Switch label={t('masterData.active')} mt="xl" disabled={itemFormReadOnly} {...form.getInputProps('isActive', { type: 'checkbox' })} />
        </SimpleGrid>

        {editing ? (
          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Group gap={4} wrap="nowrap">
                  <Text fw={700}>{t('masterData.taxProfiles')}</Text>
                  <FieldHint label={t('glossary.taxProfiles')} />
                </Group>
                <Badge variant="light">{loadedProfiles.length}</Badge>
              </Group>
              {loadedProfiles.length === 0 ? (
                <Text c="dimmed">-</Text>
              ) : (
                <Stack gap="md">
                  {loadedProfiles.map((profile, index) => (
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
                <Group gap={4} wrap="nowrap">
                  <Text fw={700}>{t('masterData.itemFormTaxProfileTitle')}</Text>
                  <FieldHint label={t('glossary.taxProfiles')} />
                </Group>
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
                  onClick={() => {
                    if (editingTaxProfileId) deleteTaxProfileMutation.mutate(editingTaxProfileId);
                  }}
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
                label={hintedLabel(t('masterData.hsCode'), t('glossary.hsCode'))}
                placeholder={t('masterData.hsCodePlaceholder')}
                disabled={itemFormReadOnly}
                {...form.getInputProps('taxHsCode')}
              />
              <TextInput label={t('masterData.dutyRateLabel')} type="number" disabled={itemFormReadOnly} {...form.getInputProps('taxImportDutyRate')} />
              <TextInput label={t('masterData.vatRateLabel')} type="number" disabled={itemFormReadOnly} {...form.getInputProps('taxVatRate')} />
              <TextInput
                label={t('masterData.preferentialImportDutyRate')}
                type="number"
                disabled={itemFormReadOnly}
                {...form.getInputProps('taxPreferentialImportDutyRate')}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label={t('masterData.coForm')} disabled={itemFormReadOnly} {...form.getInputProps('taxCoForm')} />
              <TextInput label={t('masterData.customsType')} disabled={itemFormReadOnly} {...form.getInputProps('taxCustomsType')} />
              <TextInput label={t('masterData.referenceDocNo')} disabled={itemFormReadOnly} {...form.getInputProps('taxReferenceDocNo')} />
              <TextInput label={t('masterData.locationCode')} disabled={itemFormReadOnly} {...form.getInputProps('taxLocationCode')} />
              <Textarea label={t('masterData.coTaxNote')} autosize minRows={2} disabled={itemFormReadOnly} {...form.getInputProps('taxCoTaxNote')} />
              <Textarea label={t('masterData.customsNote')} autosize minRows={2} disabled={itemFormReadOnly} {...form.getInputProps('taxCustomsNote')} />
              <Textarea label={t('masterData.taxNote')} autosize minRows={2} disabled={itemFormReadOnly} {...form.getInputProps('taxTaxNote')} />
            </SimpleGrid>
            <Switch
              label={t('masterData.defaultProfile')}
              disabled={itemFormReadOnly}
              {...form.getInputProps('taxIsDefault', { type: 'checkbox' })}
            />
          </Stack>
        </Paper>

        {canManage ? (
          <Button onClick={handleSave} fullWidth mt="md" loading={saveMutation.isPending}>
            {t('masterData.saveItem')}
          </Button>
        ) : null}
      </Stack>
    </Modal>
  );
}
