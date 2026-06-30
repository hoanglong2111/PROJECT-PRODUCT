import {
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createQuotation, type QuotationChargeLinePayload, type QuotationV1 } from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { getChargeFields, groupLabelKey, incotermToGroup } from '@shared/lib/quotationCharges';

import { quotationModeOptions, toShippingMode } from '../model/quotationModel';

type QuotationFormProps = {
  onCancel: () => void;
  onCreated: (quotation: QuotationV1) => void;
};

export function QuotationForm({ onCancel, onCreated }: QuotationFormProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { incotermOptions, currencyOptions } = useTradeMasterDataOptions();

  const [customerRef, setCustomerRef] = useState('');
  const [incoterm, setIncoterm] = useState<string | null>('FOB');
  const [mode, setMode] = useState<string | null>('SEA_FCL');
  const [currency, setCurrency] = useState<string | null>('USD');
  const [amounts, setAmounts] = useState<Record<string, number | string>>({});

  const group = incotermToGroup(incoterm);
  const sections = useMemo(() => getChargeFields(group, toShippingMode(mode)), [group, mode]);

  const total = useMemo(
    () =>
      Object.values(amounts).reduce<number>((sum, value) => {
        const numeric = Number(value);
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [amounts],
  );

  const createMutation = useMutation({
    mutationFn: () => {
      const chargeLines: QuotationChargeLinePayload[] = sections
        .flatMap((section) => section.fields)
        .map((field) => ({ field, amount: Number(amounts[field.code] ?? 0) }))
        .filter((entry) => entry.amount > 0)
        .map((entry, index) => ({
          line_no: index + 1,
          charge_type: entry.field.charge_type,
          description: t(entry.field.labelKey),
          quantity: 1,
          unit: entry.field.unit,
          unit_price: entry.amount,
          tax_rate: 0,
        }));

      return createQuotation({
        customer_ref: customerRef.trim() || null,
        incoterm_code: incoterm,
        mode,
        currency_code: currency ?? 'USD',
        status: 'DRAFT',
        charge_lines: chargeLines,
      });
    },
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      onCreated(quotation);
    },
  });

  const canSubmit = Boolean(incoterm && mode && currency && total > 0);

  return (
    <Stack gap="lg">
      <Group gap="xs" align="center">
        <Button variant="subtle" size="sm" leftSection={<IconArrowLeft size={16} />} onClick={onCancel}>
          {t('common.backToList')}
        </Button>
      </Group>

      <Paper withBorder p="lg">
        <Title order={3}>{t('quotations.formTitle')}</Title>
        <Text c="dimmed" size="sm" mt={4}>
          {t('quotations.formSubtitle')}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
          <TextInput
            label={t('quotations.customer')}
            placeholder={t('quotations.customerPlaceholder')}
            value={customerRef}
            onChange={(event) => setCustomerRef(event.currentTarget.value)}
          />
          <Select
            label={t('quotations.incoterm')}
            data={incotermOptions}
            value={incoterm}
            onChange={setIncoterm}
            searchable
          />
          <Select label={t('quotations.mode')} data={quotationModeOptions} value={mode} onChange={setMode} />
          <Select
            label={t('quotations.currency')}
            data={currencyOptions}
            value={currency}
            onChange={setCurrency}
            searchable
          />
        </SimpleGrid>

        <Text size="xs" c="dimmed" mt="sm">
          {t('quotations.incotermsGroup')}: {t(groupLabelKey(group))}
        </Text>
      </Paper>

      {sections.map((section) => (
        <Paper withBorder p="lg" key={section.id}>
          <Text fw={700} mb="sm">{t(section.titleKey)}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {section.fields.map((field) => (
              <NumberInput
                key={field.code}
                label={`${t(field.labelKey)} (${field.unit})`}
                value={amounts[field.code] ?? ''}
                onChange={(value) => setAmounts((prev) => ({ ...prev, [field.code]: value }))}
                min={0}
                thousandSeparator=","
              />
            ))}
          </SimpleGrid>
        </Paper>
      ))}

      <Paper withBorder p="lg">
        <Group justify="space-between">
          <Text fw={700}>{t('quotations.computedTotal')}</Text>
          <Text fw={700} className="tabular-nums">
            {new Intl.NumberFormat('en-US').format(Math.round(total))} {currency}
          </Text>
        </Group>
        {!canSubmit ? (
          <Text size="xs" c="dimmed" mt="xs">
            {t('quotations.enterAtLeastOneFee')}
          </Text>
        ) : null}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {t('quotations.create')}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
