import { Alert, Group, SimpleGrid, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@shared/api/queryKeys';
import { createCurrency, updateCurrency, type Currency } from '@shared/api/tradeMasterData';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';
import { currencyDecimalScale } from '@shared/utils/money';

import { optionalString } from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type CurrencyFormValues = {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
};

const emptyValues: CurrencyFormValues = { code: '', name: '', symbol: '', isActive: true };

// A well-formed ISO 4217 alphabetic code is exactly three letters that Intl accepts as a
// currency. Anything else makes Intl throw, which is exactly what we guard against.
function isValidIsoCurrency(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return false;
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: normalized });
    return true;
  } catch {
    return false;
  }
}

function hintedLabel(label: string, hint: string) {
  return (
    <Group gap={4} component="span" wrap="nowrap">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  );
}

export function CurrencyModal({
  editing,
  onClose,
  opened,
}: {
  editing: Currency | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<CurrencyFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
          code: editing.currency_code,
          name: editing.currency_name,
          symbol: editing.symbol ?? '',
          isActive: editing.is_active,
        }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const codeValid = isValidIsoCurrency(form.values.code);
  // decimal_places is not free-form data: ISO 4217 fixes the minor-unit count per
  // currency, and the money formatter treats Intl as authoritative. We derive and store
  // it from the code so master data can never drift from how amounts actually render.
  const derivedDecimals = codeValid ? currencyDecimalScale(form.values.code) : null;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        currency_code: form.values.code.trim().toUpperCase(),
        currency_name: form.values.name.trim(),
        symbol: optionalString(form.values.symbol),
        decimal_places: derivedDecimals ?? 2,
        is_active: form.values.isActive,
      };
      return editing ? updateCurrency(editing.id, payload) : createCurrency(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.currencyLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
      ]);
    },
  });

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.name.trim() || !codeValid) return;
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      title={editing ? t('masterData.editCurrency') : t('masterData.createCurrency')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={!form.values.code.trim() || !form.values.name.trim() || !codeValid}
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
            label={t('masterData.currencyCode')}
            required
            {...form.getInputProps('code')}
            error={form.values.code.trim() && !codeValid ? t('masterData.currencyCodeInvalid') : undefined}
          />
          <TextInput label={t('masterData.currencyName')} required {...form.getInputProps('name')} />
          <TextInput
            label={hintedLabel(t('masterData.currencySymbol'), t('glossary.currencySymbol'))}
            {...form.getInputProps('symbol')}
          />
          <TextInput
            label={hintedLabel(t('masterData.decimalPlaces'), t('glossary.decimalPlaces'))}
            description={t('masterData.decimalPlacesDerived')}
            value={derivedDecimals ?? ''}
            readOnly
            placeholder="—"
          />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection compact>
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
