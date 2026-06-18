import { Alert, Button, Group, Modal, MultiSelect, Select, SimpleGrid, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { queryKeys } from '@shared/api/queryKeys';
import { createSupplier, updateSupplier, type Supplier } from '@shared/api/tradeMasterData';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalNumber, optionalString } from '../model/masterDataModel';

type SupplierFormValues = {
  code: string;
  name: string;
  nameEn: string;
  supplierType: string | null;
  roles: string[];
  country: string;
  city: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  paymentTerm: string;
  currencyId: string | null;
  incotermId: string | null;
  transportModeIds: string[];
  defaultTransportModeId: string | null;
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
  roles: ['SUPPLIER'],
  country: '',
  city: '',
  address: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  paymentTerm: '',
  currencyId: null,
  incotermId: null,
  transportModeIds: [],
  defaultTransportModeId: null,
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

function hintedLabel(label: string, hint: string) {
  return (
    <Group gap={4} component="span" wrap="nowrap">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  );
}

export function SupplierModal({
  currencyOptions,
  editing,
  incotermOptions,
  onClose,
  opened,
  transportModeOptions,
}: {
  currencyOptions: Array<{ label: string; value: string }>;
  editing: Supplier | null;
  incotermOptions: Array<{ label: string; value: string }>;
  onClose: () => void;
  opened: boolean;
  transportModeOptions: Array<{ label: string; value: string }>;
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
    const supplierTransportModes = editing.supplier_transport_modes ?? [];
    form.setValues({
      code: editing.supplier_code,
      name: editing.supplier_name,
      nameEn: editing.supplier_name_en ?? '',
      supplierType: editing.supplier_type ?? null,
      roles: editing.supplier_roles.length > 0 ? editing.supplier_roles : ['SUPPLIER'],
      country: editing.country ?? '',
      city: editing.city ?? '',
      address: editing.address ?? '',
      contactPerson: editing.contact_person ?? editing.contact_name ?? '',
      contactEmail: editing.contact_email ?? '',
      contactPhone: editing.contact_phone ?? '',
      paymentTerm: editing.payment_term ?? '',
      currencyId: editing.default_currency_id ?? editing.default_currency?.id ?? null,
      incotermId: editing.default_incoterm_id ?? editing.default_incoterm?.id ?? null,
      transportModeIds: supplierTransportModes.map((mode) => mode.transport_mode_id),
      defaultTransportModeId: supplierTransportModes.find((mode) => mode.is_default)?.transport_mode_id ?? null,
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

  const defaultTransportModeOptions = useMemo(
    () => transportModeOptions.filter((option) => form.values.transportModeIds.includes(option.value)),
    [transportModeOptions, form.values.transportModeIds],
  );

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        supplier_code: form.values.code.trim().toUpperCase(),
        supplier_name: form.values.name.trim(),
        supplier_name_en: optionalString(form.values.nameEn),
        supplier_type: form.values.supplierType,
        supplier_roles: form.values.roles.length > 0 ? form.values.roles : ['SUPPLIER'],
        country: optionalString(form.values.country),
        city: optionalString(form.values.city),
        address: optionalString(form.values.address),
        contact_person: optionalString(form.values.contactPerson),
        contact_email: optionalString(form.values.contactEmail),
        contact_phone: optionalString(form.values.contactPhone),
        payment_term: optionalString(form.values.paymentTerm),
        default_currency_id: form.values.currencyId || null,
        default_incoterm_id: form.values.incotermId || null,
        transport_mode_ids: form.values.transportModeIds,
        default_transport_mode_id: form.values.defaultTransportModeId || null,
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

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.name.trim() || !form.values.supplierType) return;
    mutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={editing ? t('masterData.editSupplier') : t('masterData.createSupplier')}
    >
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
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
          <MultiSelect
            label={t('masterData.supplierRoles')}
            data={[
              { label: t('masterData.supplierRoleSupplier'), value: 'SUPPLIER' },
              { label: t('masterData.supplierRoleShipper'), value: 'SHIPPER' },
              { label: t('masterData.supplierRoleVendor'), value: 'VENDOR' },
              { label: t('masterData.supplierRoleForwarder'), value: 'FORWARDER' },
              { label: t('masterData.supplierRoleTruckingVendor'), value: 'TRUCKING_VENDOR' },
              { label: t('masterData.supplierRoleCustomsBroker'), value: 'CUSTOMS_BROKER' },
            ]}
            searchable
            required
            {...form.getInputProps('roles')}
          />
          <TextInput label={t('masterData.country')} {...form.getInputProps('country')} />
          <TextInput label={t('masterData.city')} {...form.getInputProps('city')} />
          <TextInput label={t('masterData.contactPerson')} {...form.getInputProps('contactPerson')} />
          <TextInput label={t('masterData.contactEmail')} {...form.getInputProps('contactEmail')} />
          <TextInput label={t('masterData.contactPhone')} {...form.getInputProps('contactPhone')} />
          <TextInput
            label={hintedLabel(t('masterData.paymentTerm'), t('glossary.paymentTerm'))}
            {...form.getInputProps('paymentTerm')}
          />
          <Select
            label={t('masterData.defaultCurrency')}
            data={currencyOptions}
            searchable
            clearable
            {...form.getInputProps('currencyId')}
          />
          <Select
            label={hintedLabel(t('masterData.defaultIncoterm'), t('glossary.incoterm'))}
            data={incotermOptions}
            searchable
            clearable
            {...form.getInputProps('incotermId')}
          />
          <MultiSelect
            label={hintedLabel(t('masterData.supplierTransportModes'), t('glossary.supplierTransportModes'))}
            value={form.values.transportModeIds}
            onChange={(values) => {
              form.setFieldValue('transportModeIds', values);
              if (form.values.defaultTransportModeId && !values.includes(form.values.defaultTransportModeId)) {
                form.setFieldValue('defaultTransportModeId', null);
              }
            }}
            data={transportModeOptions}
            searchable
            clearable
          />
          <Select
            label={hintedLabel(t('masterData.defaultTransportMode'), t('glossary.supplierTransportModes'))}
            data={defaultTransportModeOptions}
            searchable
            clearable
            disabled={form.values.transportModeIds.length === 0}
            {...form.getInputProps('defaultTransportModeId')}
          />
          <TextInput
            label={hintedLabel(t('masterData.leadTimeProductionDays'), t('glossary.leadTimeDays'))}
            type="number"
            {...form.getInputProps('leadTimeProductionDays')}
          />
        </SimpleGrid>
        <Textarea label={t('masterData.address')} autosize minRows={3} {...form.getInputProps('address')} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea label={t('masterData.bankInfo')} autosize minRows={3} {...form.getInputProps('bankInfo')} />
          <Textarea label={t('masterData.note')} autosize minRows={3} {...form.getInputProps('note')} />
        </SimpleGrid>
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={
              !form.values.code.trim() ||
              !form.values.name.trim() ||
              !form.values.supplierType ||
              form.values.roles.length === 0
            }
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
