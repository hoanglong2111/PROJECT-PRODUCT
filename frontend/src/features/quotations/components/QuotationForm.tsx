import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconFileInvoice, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';

import { createQuotation, type QuotationChargeLinePayload, type QuotationV1 } from '@shared/api/quotations';
import { BackActionButton } from '@shared/components/BackActionButton';
import { DateField } from '@shared/components/DateField';
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
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [amounts, setAmounts] = useState<Record<string, number | string>>({});

  const group = incotermToGroup(incoterm);
  const sections = useMemo(() => getChargeFields(group, toShippingMode(mode)), [group, mode]);
  const chargeFields = useMemo(() => sections.flatMap((section) => section.fields), [sections]);

  const total = useMemo(
    () =>
      chargeFields.reduce<number>((sum, field) => {
        const value = amounts[field.code];
        const numeric = Number(value);
        return sum + (Number.isFinite(numeric) ? numeric : 0);
      }, 0),
    [amounts, chargeFields],
  );
  const selectedChargeCount = chargeFields.filter((field) => Number(amounts[field.code] ?? 0) > 0).length;
  const formattedTotal = `${new Intl.NumberFormat('en-US').format(Math.round(total))} ${currency ?? ''}`.trim();

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
        valid_until: validUntil || null,
        note: note.trim() || null,
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate();
  };

  return (
    <form className="rfq-form" onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Paper withBorder p={0} className="rfq-form-panel">
          <div className="rfq-form-hero">
            <Group justify="space-between" align="flex-start" gap="md" className="rfq-form-hero-inner">
              <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-form-title-row">
                <div className="rfq-icon-box">
                  <IconFileInvoice size={18} />
                </div>
                <div className="rfq-form-title-copy">
                  <BackActionButton size="xs" iconSize={14} onClick={onCancel} className="rfq-back-action" />
                  <Title order={3}>{t('quotations.formTitle')}</Title>
                  <Text c="dimmed" size="sm">
                    {t('quotations.formSubtitle')}
                  </Text>
                </div>
              </Group>
              <Badge variant="light" size="lg">
                {t(groupLabelKey(group))}
              </Badge>
            </Group>
          </div>

          <div className="rfq-form-layout">
            <div className="rfq-form-main">
              <section className="rfq-form-section">
                <Group justify="space-between" align="center" gap="sm" className="rfq-section-head">
                  <div>
                    <Text fw={800}>{t('quotations.setupSection')}</Text>
                    <Text size="xs" c="dimmed">
                      {t('quotations.incotermsGroup')}: {t(groupLabelKey(group))}
                    </Text>
                  </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm" mt="sm">
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
                  <DateField
                    label={t('quotations.validUntil')}
                    value={validUntil}
                    onChange={setValidUntil}
                  />
                </SimpleGrid>

                <Textarea
                  label={t('common.notes')}
                  placeholder={t('quotations.notePlaceholder')}
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                  autosize
                  minRows={2}
                  mt="sm"
                />

                {group === 'UNKNOWN' ? (
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('quotations.incotermsUnknownNote')}
                  </Text>
                ) : null}
                {group === 'PREPAID' ? (
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('quotations.prepaidNote')}
                  </Text>
                ) : null}
              </section>

              <section className="rfq-form-section">
                <Group justify="space-between" align="center" gap="sm" className="rfq-section-head">
                  <div>
                    <Text fw={800}>{t('quotations.chargeGroups')}</Text>
                    <Text size="xs" c="dimmed">
                      {t('quotations.optionalChargesHint')}
                    </Text>
                  </div>
                  <Badge variant="light">
                    {t('quotations.selectedCharges', { count: selectedChargeCount, total: chargeFields.length })}
                  </Badge>
                </Group>

                <div className="rfq-charge-board">
                  {sections.map((section) => (
                    <section className="rfq-charge-group" key={section.id}>
                      <Group justify="space-between" gap="xs" className="rfq-charge-group-head">
                        <Text fw={700} size="sm">{t(section.titleKey)}</Text>
                        <Badge size="xs" variant="outline">
                          {section.fields.length}
                        </Badge>
                      </Group>
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" className="rfq-charge-grid">
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
                    </section>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rfq-form-rail">
              <div className="rfq-total-card">
                <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                  {t('quotations.computedTotal')}
                </Text>
                <Text fw={900} size="xl" className="tabular-nums">
                  {formattedTotal}
                </Text>
              </div>

              <div className="rfq-summary-list">
                <SummaryRow label={t('quotations.incoterm')} value={incoterm ?? '—'} />
                <SummaryRow label={t('quotations.mode')} value={mode ?? '—'} />
                <SummaryRow label={t('quotations.validUntil')} value={validUntil ?? '—'} />
                <SummaryRow
                  label={t('quotations.chargeBreakdown')}
                  value={t('quotations.selectedCharges', { count: selectedChargeCount, total: chargeFields.length })}
                />
              </div>

              {!canSubmit ? (
                <Text size="xs" c="dimmed" className="rfq-submit-hint">
                  {t('quotations.enterAtLeastOneFee')}
                </Text>
              ) : null}

              <Group grow gap="xs" className="rfq-rail-actions">
                <Button type="button" variant="default" leftSection={<IconX size={16} />} onClick={onCancel}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  loading={createMutation.isPending}
                  leftSection={<IconCheck size={16} />}
                >
                  {t('quotations.create')}
                </Button>
              </Group>
            </aside>
          </div>
        </Paper>
      </Stack>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rfq-summary-row">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={700}>{value}</Text>
    </div>
  );
}
