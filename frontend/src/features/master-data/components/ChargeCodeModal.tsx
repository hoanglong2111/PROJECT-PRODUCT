import { Alert, Select, SimpleGrid, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createChargeCode,
  updateChargeCode,
  type ChargeCode,
  type ChargeRevCost,
} from '@shared/api/chargeCodes';
import { queryKeys } from '@shared/api/queryKeys';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';
import { getApiErrorMessage } from '@shared/lib/errors';

import { getRevCostLabel, optionalString } from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type ChargeCodeFormValues = {
  code: string;
  nameEn: string;
  nameVn: string;
  group: string;
  category: string;
  defaultUom: string | null;
  seaFcl: boolean;
  seaLcl: boolean;
  air: boolean;
  road: boolean;
  rail: boolean;
  revCost: ChargeRevCost;
  taxable: boolean;
  description: string;
  isActive: boolean;
};

const emptyValues: ChargeCodeFormValues = {
  code: '',
  nameEn: '',
  nameVn: '',
  group: 'MAIN_FREIGHT',
  category: 'FREIGHT',
  defaultUom: 'SHPT',
  seaFcl: false,
  seaLcl: false,
  air: false,
  road: false,
  rail: false,
  revCost: 'BOTH',
  taxable: true,
  description: '',
  isActive: true,
};

export function ChargeCodeModal({
  editing,
  onClose,
  opened,
  uomOptions,
}: {
  editing: ChargeCode | null;
  onClose: () => void;
  opened: boolean;
  uomOptions: Array<{ label: string; value: string }>;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ChargeCodeFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
          code: editing.charge_code,
          nameEn: editing.charge_name_en,
          nameVn: editing.charge_name_vn ?? '',
          group: editing.group,
          category: editing.category,
          defaultUom: editing.default_uom,
          seaFcl: editing.sea_fcl,
          seaLcl: editing.sea_lcl,
          air: editing.air,
          road: editing.road,
          rail: editing.rail,
          revCost: editing.rev_cost,
          taxable: editing.taxable,
          description: editing.description ?? '',
          isActive: editing.is_active,
        }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        charge_code: form.values.code.trim().toUpperCase(),
        charge_name_en: form.values.nameEn.trim(),
        charge_name_vn: form.values.nameVn.trim(),
        group: form.values.group,
        category: form.values.category,
        default_uom: form.values.defaultUom || 'SHPT',
        sea_fcl: form.values.seaFcl,
        sea_lcl: form.values.seaLcl,
        air: form.values.air,
        road: form.values.road,
        rail: form.values.rail,
        rev_cost: form.values.revCost,
        taxable: form.values.taxable,
        description: optionalString(form.values.description),
        is_active: form.values.isActive,
      };
      return editing ? updateChargeCode(editing.id, payload) : createChargeCode(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.chargeCodeLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
      ]);
    },
  });

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.nameEn.trim() || !form.values.group || !form.values.category || !form.values.defaultUom) {
      return;
    }
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={editing ? t('masterData.editChargeCode') : t('masterData.createChargeCode')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={!form.values.code.trim() || !form.values.nameEn.trim() || !form.values.group || !form.values.category || !form.values.defaultUom}
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
          <TextInput label={t('masterData.chargeCode')} required {...form.getInputProps('code')} />
          <Select
            label={t('masterData.chargeGroup')}
            data={CHARGE_GROUPS.map((group) => ({ label: group.docLabel, value: group.value }))}
            required
            searchable
            {...form.getInputProps('group')}
          />
          <Select
            label={t('masterData.chargeCategory')}
            data={CHARGE_CATEGORIES.map((category) => ({ label: category.docLabel, value: category.value }))}
            required
            searchable
            {...form.getInputProps('category')}
          />
          <TextInput label={t('masterData.chargeNameEn')} required {...form.getInputProps('nameEn')} />
          <TextInput label={t('masterData.chargeNameVn')} {...form.getInputProps('nameVn')} />
          <Select
            label={<HeaderLabel label={t('masterData.defaultUom')} hint={t('glossary.defaultUom')} />}
            data={uomOptions}
            value={form.values.defaultUom}
            onChange={(value) => form.setFieldValue('defaultUom', value || 'SHPT')}
            searchable
            required
          />
          <Select
            label={<HeaderLabel label={t('masterData.revCost')} hint={t('glossary.revCost')} />}
            data={[
              { label: getRevCostLabel('REVENUE'), value: 'REVENUE' },
              { label: getRevCostLabel('COST'), value: 'COST' },
              { label: getRevCostLabel('BOTH'), value: 'BOTH' },
            ]}
            required
            {...form.getInputProps('revCost')}
          />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Switch label={t('masterData.seaFcl')} {...form.getInputProps('seaFcl', { type: 'checkbox' })} />
          <Switch label={t('masterData.seaLcl')} {...form.getInputProps('seaLcl', { type: 'checkbox' })} />
          <Switch label={t('masterData.air')} {...form.getInputProps('air', { type: 'checkbox' })} />
          <Switch label={t('masterData.road')} {...form.getInputProps('road', { type: 'checkbox' })} />
          <Switch label={t('masterData.rail')} {...form.getInputProps('rail', { type: 'checkbox' })} />
          <Switch
            label={<HeaderLabel label={t('masterData.taxable')} hint={t('glossary.taxableCharge')} />}
            {...form.getInputProps('taxable', { type: 'checkbox' })}
          />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <Textarea label={t('masterData.description')} autosize minRows={3} {...form.getInputProps('description')} />
      </MasterDataFormSection>
      <MasterDataFormSection compact>
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
