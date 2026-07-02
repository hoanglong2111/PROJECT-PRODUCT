import {
  Alert,
  Select,
  SimpleGrid,
  Switch,
  Textarea,
  TextInput,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import {
  createItem,
  fetchItem,
  updateItem,
  type CreateItemPayload,
  type Item,
} from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalNumber, optionalString } from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type ItemFormValues = {
  code: string;
  name: string;
  nameEn: string;
  category: string | null;
  type: string | null;
  baseUom: string;
  purchaseUom: string;
  uomConversion: string;
  hsCode: string;
  countryOfOrigin: string;
  unitPriceUsd: string;
  barcode: string;
  note: string;
  isActive: boolean;
};

const emptyValues: ItemFormValues = {
  code: '',
  name: '',
  nameEn: '',
  category: null,
  type: null,
  baseUom: '',
  purchaseUom: '',
  uomConversion: '1',
  hsCode: '',
  countryOfOrigin: '',
  unitPriceUsd: '',
  barcode: '',
  note: '',
  isActive: true,
};

const itemCategoryOptions = [
  { label: 'NVL', value: 'NVL' },
  { label: 'BTP', value: 'BTP' },
  { label: 'TP', value: 'TP' },
  { label: 'CCDC', value: 'CCDC' },
  { label: 'DONG_GOI', value: 'DONG_GOI' },
];

const itemTypeOptions = [
  { label: 'RAW', value: 'RAW' },
  { label: 'SEMI', value: 'SEMI' },
  { label: 'FG', value: 'FG' },
  { label: 'CONSUMABLE', value: 'CONSUMABLE' },
  { label: 'PACKAGING', value: 'PACKAGING' },
];

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

function itemValuesToForm(item: Item): ItemFormValues {
  return {
    code: item.item_code,
    name: item.item_name,
    nameEn: item.item_name_en ?? '',
    category: item.item_category ?? null,
    type: item.item_type ?? null,
    baseUom: item.base_uom ?? '',
    purchaseUom: item.purchase_uom ?? '',
    uomConversion: numberToString(item.uom_conversion ?? 1),
    hsCode: item.hs_code ?? '',
    countryOfOrigin: item.country_of_origin ?? '',
    unitPriceUsd: numberToString(item.unit_price_usd),
    barcode: item.barcode ?? '',
    note: item.note ?? '',
    isActive: item.is_active ?? true,
  };
}

export function ItemModal({
  canManage,
  editing,
  onClose,
  opened,
  uomOptions,
}: {
  canManage: boolean;
  editing: Item | null;
  onClose: () => void;
  opened: boolean;
  uomOptions: Array<{ label: string; value: string }>;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ItemFormValues>({ initialValues: emptyValues });

  const itemFormReadOnly = Boolean(editing) && !canManage;
  const resolvedUomOptions = useMemo(() => {
    const options = [...uomOptions];
    for (const value of [form.values.baseUom, form.values.purchaseUom]) {
      if (value && !options.some((option) => option.value === value)) {
        options.push({ label: value, value });
      }
    }
    return options;
  }, [form.values.baseUom, form.values.purchaseUom, uomOptions]);

  useEffect(() => {
    if (!opened) return;
    if (!editing) {
      form.setValues(emptyValues);
      return;
    }
    form.setValues(itemValuesToForm(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const detailQuery = useQuery({
    enabled: opened && Boolean(editing),
    queryKey: editing ? queryKeys.itemDetail(editing.id) : queryKeys.itemDetail('idle'),
    queryFn: () => fetchItem(editing?.id ?? ''),
  });

  useEffect(() => {
    if (!opened || !editing || !detailQuery.data) return;
    form.setValues(itemValuesToForm(detailQuery.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data, opened, editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = editing?.id;
      const payload: CreateItemPayload = {
        item_code: form.values.code.trim(),
        item_name: form.values.name.trim(),
        item_name_en: optionalString(form.values.nameEn),
        item_category: optionalString(form.values.category ?? ''),
        item_type: optionalString(form.values.type ?? ''),
        base_uom: optionalString(form.values.baseUom),
        purchase_uom: optionalString(form.values.purchaseUom),
        uom_conversion: optionalNumber(form.values.uomConversion),
        hs_code: optionalString(form.values.hsCode),
        country_of_origin: optionalString(form.values.countryOfOrigin),
        unit_price_usd: optionalNumber(form.values.unitPriceUsd),
        barcode: optionalString(form.values.barcode),
        note: optionalString(form.values.note),
        is_active: form.values.isActive,
      };
      return id ? updateItem(id, payload) : createItem(payload);
    },
    onSuccess: (savedItem) => {
      onClose();
      const itemId = editing?.id ?? savedItem.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemDetail(itemId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
      ]);
    },
  });

  const isSaveDisabled =
    !form.values.code.trim() ||
    !form.values.name.trim() ||
    !form.values.nameEn.trim() ||
    !form.values.category ||
    !form.values.type ||
    !form.values.baseUom.trim() ||
    !form.values.hsCode.trim();

  const handleSave = () => {
    if (!canManage || isSaveDisabled) return;
    saveMutation.mutate();
  };

  return (
    <MasterDataFormModal
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
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={saveMutation.isPending}
          disabled={isSaveDisabled}
          saveLabel={t('masterData.saveItem')}
          showSave={canManage}
          cancelLabel={canManage ? undefined : t('common.close')}
        />
      )}
    >
      {saveMutation.isError ? (
        <Alert color="red">{getApiErrorMessage(saveMutation.error)}</Alert>
      ) : null}

      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('masterData.itemCodeLabel')}
            placeholder={t('masterData.itemCodePlaceholder')}
            required
            disabled={Boolean(editing) || itemFormReadOnly}
            {...form.getInputProps('code')}
          />
          <TextInput
            label={t('masterData.itemNameLabel')}
            placeholder={t('masterData.itemNamePlaceholder')}
            required
            disabled={itemFormReadOnly}
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('masterData.itemNameEn')}
            placeholder={t('masterData.itemNameEnPlaceholder')}
            required
            disabled={itemFormReadOnly}
            {...form.getInputProps('nameEn')}
          />
        </SimpleGrid>
      </MasterDataFormSection>

      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Select
            label={t('masterData.itemCategory')}
            data={itemCategoryOptions}
            required
            searchable
            disabled={itemFormReadOnly}
            {...form.getInputProps('category')}
          />
          <Select
            label={t('masterData.itemType')}
            data={itemTypeOptions}
            required
            searchable
            disabled={itemFormReadOnly}
            {...form.getInputProps('type')}
          />
          <Select
            label={t('masterData.baseUom')}
            placeholder={t('masterData.baseUomPlaceholder')}
            data={resolvedUomOptions}
            value={form.values.baseUom || null}
            onChange={(value) => form.setFieldValue('baseUom', value || '')}
            searchable
            required
            disabled={itemFormReadOnly}
          />
          <Select
            label={t('masterData.purchaseUom')}
            placeholder={t('masterData.purchaseUomPlaceholder')}
            data={resolvedUomOptions}
            value={form.values.purchaseUom || null}
            onChange={(value) => form.setFieldValue('purchaseUom', value || '')}
            searchable
            clearable
            disabled={itemFormReadOnly}
          />
          <TextInput
            label={t('masterData.uomConversion')}
            type="number"
            disabled={itemFormReadOnly}
            {...form.getInputProps('uomConversion')}
          />
          <TextInput
            label={hintedLabel(t('masterData.hsCode'), t('glossary.hsCode'))}
            placeholder={t('masterData.hsCodePlaceholder')}
            required
            disabled={itemFormReadOnly}
            {...form.getInputProps('hsCode')}
          />
          <TextInput
            label={t('masterData.countryOfOrigin')}
            placeholder={t('masterData.countryOfOriginPlaceholder')}
            disabled={itemFormReadOnly}
            {...form.getInputProps('countryOfOrigin')}
          />
          <TextInput
            label={t('masterData.unitPriceUsd')}
            type="number"
            disabled={itemFormReadOnly}
            {...form.getInputProps('unitPriceUsd')}
          />
          <TextInput
            label={t('masterData.barcode')}
            disabled={itemFormReadOnly}
            {...form.getInputProps('barcode')}
          />
        </SimpleGrid>
      </MasterDataFormSection>

      <MasterDataFormSection>
        <Textarea
          label={t('masterData.note')}
          autosize
          minRows={2}
          disabled={itemFormReadOnly}
          {...form.getInputProps('note')}
        />
      </MasterDataFormSection>
      <MasterDataFormSection compact>
        <Switch
          label={t('masterData.active')}
          disabled={itemFormReadOnly}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
