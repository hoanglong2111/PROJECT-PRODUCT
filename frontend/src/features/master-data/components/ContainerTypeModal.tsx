import { Alert, NumberInput, Select, SimpleGrid, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createContainerType,
  updateContainerType,
  type ContainerType,
} from '@shared/api/containerTypes';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type ContainerTypeFormValues = {
  code: string;
  isoCode: string;
  nameEn: string;
  nameVn: string;
  category: string | null;
  sizeFt: number | string;
  teu: number | string;
  tareKg: number | string;
  payloadKg: number | string;
  grossKg: number | string;
  capacityCbm: number | string;
  isActive: boolean;
};

const emptyValues: ContainerTypeFormValues = {
  code: '',
  isoCode: '',
  nameEn: '',
  nameVn: '',
  category: 'Dry',
  sizeFt: '',
  teu: '',
  tareKg: '',
  payloadKg: '',
  grossKg: '',
  capacityCbm: '',
  isActive: true,
};

const CATEGORY_OPTIONS = ['Dry', 'Reefer', 'Open Top', 'Flat Rack', 'Tank', 'Ventilated'].map((value) => ({
  label: value,
  value,
}));

function numberOrNull(value: number | string) {
  if (value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formNumber(value: number | null | undefined) {
  return value ?? '';
}

export function ContainerTypeModal({
  editing,
  onClose,
  opened,
}: {
  editing: ContainerType | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ContainerTypeFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
          code: editing.cont_code,
          isoCode: editing.iso_code,
          nameEn: editing.name_en,
          nameVn: editing.name_vn ?? '',
          category: editing.category,
          sizeFt: formNumber(editing.size_ft),
          teu: formNumber(editing.teu),
          tareKg: formNumber(editing.tare_kg),
          payloadKg: formNumber(editing.payload_kg),
          grossKg: formNumber(editing.gross_kg),
          capacityCbm: formNumber(editing.capacity_cbm),
          isActive: editing.is_active,
        }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        cont_code: form.values.code.trim().toUpperCase(),
        iso_code: form.values.isoCode.trim().toUpperCase(),
        name_en: form.values.nameEn.trim(),
        name_vn: form.values.nameVn.trim(),
        category: form.values.category ?? 'Dry',
        size_ft: numberOrNull(form.values.sizeFt),
        teu: numberOrNull(form.values.teu),
        tare_kg: numberOrNull(form.values.tareKg),
        payload_kg: numberOrNull(form.values.payloadKg),
        gross_kg: numberOrNull(form.values.grossKg),
        capacity_cbm: numberOrNull(form.values.capacityCbm),
        is_active: form.values.isActive,
      };
      return editing ? updateContainerType(editing.id, payload) : createContainerType(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.containerTypeLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
      ]);
    },
  });

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.nameEn.trim()) return;
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      title={editing ? t('masterData.editContainerType') : t('masterData.createContainerType')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={!form.values.code.trim() || !form.values.nameEn.trim()}
        />
      )}
    >
      {mutation.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.containerTypeCode')} required {...form.getInputProps('code')} />
          <TextInput label={t('masterData.containerTypeIsoCode')} {...form.getInputProps('isoCode')} />
          <TextInput label={t('masterData.containerTypeNameEn')} required {...form.getInputProps('nameEn')} />
          <TextInput label={t('masterData.containerTypeNameVn')} {...form.getInputProps('nameVn')} />
          <Select
            label={t('masterData.containerTypeCategory')}
            data={CATEGORY_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('category')}
          />
          <NumberInput label={t('masterData.containerTypeSizeFt')} min={0} {...form.getInputProps('sizeFt')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput label={t('masterData.containerTypeTeu')} min={0} decimalScale={2} {...form.getInputProps('teu')} />
          <NumberInput label={t('masterData.containerTypeTareKg')} min={0} {...form.getInputProps('tareKg')} />
          <NumberInput label={t('masterData.containerTypePayloadKg')} min={0} {...form.getInputProps('payloadKg')} />
          <NumberInput label={t('masterData.containerTypeGrossKg')} min={0} {...form.getInputProps('grossKg')} />
          <NumberInput label={t('masterData.containerTypeCapacityCbm')} min={0} decimalScale={2} {...form.getInputProps('capacityCbm')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection compact>
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
