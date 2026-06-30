import { Alert, Button, Group, Modal, Select, SimpleGrid, Stack, Switch, Textarea, TextInput } from '@mantine/core';
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
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalString } from '../model/masterDataModel';

type ChargeCodeFormValues = {
  code: string;
  nameEn: string;
  nameVn: string;
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
  category: 'MAIN_FREIGHT',
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
    if (!form.values.code.trim() || !form.values.nameEn.trim() || !form.values.category || !form.values.defaultUom) {
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={editing ? t('masterData.editChargeCode') : t('masterData.createChargeCode')}
    >
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.chargeCode')} required {...form.getInputProps('code')} />
          <Select
            label={t('masterData.chargeCategory')}
            data={[
              { label: t('masterData.chargeCategoryOriginExport'), value: 'ORIGIN_EXPORT' },
              { label: t('masterData.chargeCategoryMainFreight'), value: 'MAIN_FREIGHT' },
              { label: t('masterData.chargeCategoryFreightSurcharge'), value: 'FREIGHT_SURCHARGE' },
              { label: t('masterData.chargeCategoryDocumentation'), value: 'DOCUMENTATION' },
              { label: t('masterData.chargeCategoryDestinationImport'), value: 'DESTINATION_IMPORT' },
              { label: t('masterData.chargeCategoryAncillary'), value: 'ANCILLARY' },
              { label: t('masterData.chargeCategoryServiceOther'), value: 'SERVICE_OTHER' },
            ]}
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
              { label: t('masterData.revCostRevenue'), value: 'REVENUE' },
              { label: t('masterData.revCostCost'), value: 'COST' },
              { label: t('masterData.revCostBoth'), value: 'BOTH' },
            ]}
            required
            {...form.getInputProps('revCost')}
          />
        </SimpleGrid>
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
        <Textarea label={t('masterData.description')} autosize minRows={3} {...form.getInputProps('description')} />
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={!form.values.code.trim() || !form.values.nameEn.trim() || !form.values.category || !form.values.defaultUom}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
