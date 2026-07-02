import { Alert, Autocomplete, Group, Select, SimpleGrid, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@shared/api/queryKeys';
import { createSupplier, updateSupplier, type Supplier } from '@shared/api/tradeMasterData';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalNumber, optionalString } from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type SupplierFormValues = {
  code: string;
  name: string;
  nameEn: string;
  supplierType: string | null;
  country: string;
  city: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  paymentTerm: string;
  currencyCode: string;
  incotermCode: string;
  leadTimeProductionDays: string;
  bankInfo: string;
  note: string;
  isActive: boolean;
};

const emptyValues: SupplierFormValues = {
  code: '',
  name: '',
  nameEn: '',
  supplierType: null,
  country: '',
  city: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  paymentTerm: '',
  currencyCode: '',
  incotermCode: '',
  leadTimeProductionDays: '',
  bankInfo: '',
  note: '',
  isActive: true,
};

const supplierTypeOptions = [
  { label: 'OVERSEAS_SEA', value: 'OVERSEAS_SEA' },
  { label: 'OVERSEAS_AIR', value: 'OVERSEAS_AIR' },
  { label: 'DOMESTIC', value: 'DOMESTIC' },
];

const paymentTermOptions = [
  { label: 'NET30', value: 'NET30' },
  { label: 'NET45', value: 'NET45' },
  { label: 'NET60', value: 'NET60' },
  { label: 'TT_ADVANCE', value: 'TT_ADVANCE' },
  { label: 'LC', value: 'LC' },
];

const currencyCodeOptions = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'CNY', value: 'CNY' },
  { label: 'KRW', value: 'KRW' },
  { label: 'VND', value: 'VND' },
];

const incotermCodeOptions = [
  { label: 'EXW', value: 'EXW' },
  { label: 'FCA', value: 'FCA' },
  { label: 'FOB', value: 'FOB' },
  { label: 'CFR', value: 'CFR' },
  { label: 'CIF', value: 'CIF' },
  { label: 'DDP', value: 'DDP' },
];

function hintedLabel(label: string, hint: string) {
  return (
    <Group gap={4} component="span" wrap="nowrap">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  );
}

export function SupplierModal({
  editing,
  onClose,
  opened,
}: {
  editing: Supplier | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<SupplierFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    if (!editing) {
      form.setValues(emptyValues);
      return;
    }
    form.setValues({
      code: editing.supplier_code,
      name: editing.supplier_name,
      nameEn: editing.supplier_name_en ?? '',
      supplierType: editing.supplier_type ?? null,
      country: editing.country ?? '',
      city: editing.city ?? '',
      contactPerson: editing.contact_person ?? editing.contact_name ?? '',
      contactEmail: editing.contact_email ?? '',
      contactPhone: editing.contact_phone ?? '',
      paymentTerm: editing.payment_term ?? '',
      currencyCode: editing.default_currency_code ?? '',
      incotermCode: editing.default_incoterm_code ?? '',
      leadTimeProductionDays:
        editing.lead_time_production_days !== null && editing.lead_time_production_days !== undefined
          ? String(editing.lead_time_production_days)
          : '',
      bankInfo: editing.bank_info ?? '',
      note: editing.note ?? '',
      isActive: editing.is_active,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        supplier_code: form.values.code.trim().toUpperCase(),
        supplier_name: form.values.name.trim(),
        supplier_name_en: optionalString(form.values.nameEn),
        supplier_type: form.values.supplierType,
        country: optionalString(form.values.country),
        city: optionalString(form.values.city),
        contact_person: optionalString(form.values.contactPerson),
        contact_email: optionalString(form.values.contactEmail),
        contact_phone: optionalString(form.values.contactPhone),
        payment_term: form.values.paymentTerm || null,
        default_currency_code: form.values.currencyCode || null,
        default_incoterm_code: form.values.incotermCode || null,
        lead_time_production_days: optionalNumber(form.values.leadTimeProductionDays),
        bank_info: optionalString(form.values.bankInfo),
        note: optionalString(form.values.note),
        is_active: form.values.isActive,
      };
      return editing ? updateSupplier(editing.id, payload) : createSupplier(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
      ]);
    },
  });

  const isSaveDisabled =
    !form.values.code.trim() ||
    !form.values.name.trim() ||
    !form.values.supplierType ||
    !form.values.contactPerson.trim() ||
    !form.values.contactEmail.trim() ||
    !form.values.paymentTerm.trim() ||
    !form.values.currencyCode.trim() ||
    !form.values.incotermCode.trim() ||
    !form.values.leadTimeProductionDays.trim();

  const handleSave = () => {
    if (isSaveDisabled) return;
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={editing ? t('masterData.editSupplier') : t('masterData.createSupplier')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={isSaveDisabled}
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
          <TextInput
            label={t('masterData.supplierCode')}
            placeholder={t('masterData.supplierCodePlaceholder')}
            required
            {...form.getInputProps('code')}
          />
          <TextInput
            label={t('masterData.supplierName')}
            placeholder={t('masterData.supplierNamePlaceholder')}
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('masterData.supplierNameEn')}
            placeholder={t('masterData.supplierNameEnPlaceholder')}
            {...form.getInputProps('nameEn')}
          />
          <Select
            label={t('masterData.supplierType')}
            data={supplierTypeOptions}
            searchable
            required
            {...form.getInputProps('supplierType')}
          />
          <TextInput label={t('masterData.country')} required {...form.getInputProps('country')} />
          <TextInput label={t('masterData.city')} {...form.getInputProps('city')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.contactPerson')} required {...form.getInputProps('contactPerson')} />
          <TextInput label={t('masterData.contactEmail')} required {...form.getInputProps('contactEmail')} />
          <TextInput label={t('masterData.contactPhone')} {...form.getInputProps('contactPhone')} />
          <Autocomplete
            label={hintedLabel(t('masterData.paymentTerm'), t('glossary.paymentTerm'))}
            data={paymentTermOptions.map((o) => o.value)}
            required
            {...form.getInputProps('paymentTerm')}
          />
          <Autocomplete
            label={t('masterData.defaultCurrency')}
            data={currencyCodeOptions.map((o) => o.value)}
            required
            {...form.getInputProps('currencyCode')}
          />
          <Autocomplete
            label={hintedLabel(t('masterData.defaultIncoterm'), t('glossary.incoterm'))}
            data={incotermCodeOptions.map((o) => o.value)}
            required
            {...form.getInputProps('incotermCode')}
          />
          <TextInput
            label={hintedLabel(t('masterData.leadTimeProductionDays'), t('glossary.leadTimeDays'))}
            type="number"
            required
            {...form.getInputProps('leadTimeProductionDays')}
          />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea label={t('masterData.bankInfo')} autosize minRows={3} {...form.getInputProps('bankInfo')} />
          <Textarea label={t('masterData.note')} autosize minRows={3} {...form.getInputProps('note')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection compact>
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
