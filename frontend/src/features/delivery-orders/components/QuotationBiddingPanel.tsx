import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconInfoCircle, IconPlus, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useMemo, useState } from 'react';

import {
  fetchQuotations,
  createQuotation,
  updateQuotationAction,
  type QuotationAction,
  type QuotationChargeLineInput,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { InfoField } from '@shared/components/InfoField';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import type { DeliveryOrderStatus, ShippingMode } from '@shared/model/logistics';

import { getChargeFields, groupLabelKey, incotermToGroup } from '../lib/quotationCharges';
import { SlaTimer } from './SlaTimer';

const SHIPPING_MODE_OPTIONS: Array<{ label: string; value: ShippingMode }> = [
  { label: 'FCL', value: 'FCL' },
  { label: 'LCL', value: 'LCL' },
  { label: 'AIR', value: 'AIR' },
];

function defaultModeFor(shippingMethod?: 'SEA' | 'AIR' | 'ROAD'): ShippingMode {
  if (shippingMethod === 'AIR') return 'AIR';
  if (shippingMethod === 'ROAD') return 'LCL';
  return 'FCL';
}

function chargeHintKey(field: { charge_type: string; code: string }) {
  if (field.charge_type === 'AIR_FREIGHT' || field.charge_type === 'OCEAN_FREIGHT') return 'glossary.freight';
  if (field.charge_type === 'CUSTOMS_FEE') return 'glossary.customsClearance';
  if (field.code === 'CARRIER_FREIGHT') return 'glossary.freight';
  return 'glossary.localCharges';
}

type Gd1QuotationBiddingPanelProps = {
  requestCode: string;
  incoterms?: string;
  shippingMethod?: 'SEA' | 'AIR' | 'ROAD';
  status?: DeliveryOrderStatus;
};

/** DO must reach one of these states before quotations may be created. */
const QUOTE_CREATE_STATUSES: DeliveryOrderStatus[] = ['READY_FOR_QUOTATION', 'QUOTATION_CONFIRMED'];

export function Gd1QuotationBiddingPanel({
  requestCode,
  incoterms,
  shippingMethod,
  status,
}: Gd1QuotationBiddingPanelProps) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const canCreateQuote = status !== undefined && QUOTE_CREATE_STATUSES.includes(status);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [createOpened, setCreateOpened] = useState(false);

  // Form states for creating a new quotation
  const [carrier, setCarrier] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [shippingMode, setShippingMode] = useState<ShippingMode>(() => defaultModeFor(shippingMethod));
  const [amounts, setAmounts] = useState<Record<string, number | ''>>({});

  const { currencyOptions, suppliers: carrierSuppliers } = useTradeMasterDataOptions({ supplierRole: 'FORWARDER' });
  const carrierOptions = useMemo(
    () =>
      carrierSuppliers.map((supplier) => ({
        label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
        value: supplier.id,
      })),
    [carrierSuppliers],
  );

  const incotermGroup = useMemo(() => incotermToGroup(incoterms), [incoterms]);
  const chargeSections = useMemo(() => getChargeFields(incotermGroup, shippingMode), [incotermGroup, shippingMode]);
  const visibleFieldCodes = useMemo(
    () => new Set(chargeSections.flatMap((section) => section.fields.map((field) => field.code))),
    [chargeSections],
  );
  const computedTotal = useMemo(
    () =>
      Array.from(visibleFieldCodes).reduce((sum, code) => {
        const value = amounts[code];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0),
    [amounts, visibleFieldCodes],
  );

  const setAmount = (code: string, value: number | '') => {
    setAmounts((current) => ({ ...current, [code]: value }));
  };

  const resetCreateForm = () => {
    setCarrier('');
    setAmounts({});
    setShippingMode(defaultModeFor(shippingMethod));
  };

  const quotationsQuery = useQuery({
    queryKey: queryKeys.quotations,
    queryFn: fetchQuotations,
  });

  const quotations = useMemo(() => {
    const all = quotationsQuery.data ?? [];
    return all.filter((q) => q.requestCode === requestCode);
  }, [quotationsQuery.data, requestCode]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => createQuotation(payload),
    onSuccess: () => {
      resetCreateForm();
      setCreateOpened(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: QuotationAction }) => updateQuotationAction(id, { action }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderLists }),
      ]);
    },
  });

  const handleCompareSelect = (id: string, checked: boolean) => {
    if (checked) {
      if (compareIds.length < 2) {
        setCompareIds([...compareIds, id]);
      }
    } else {
      setCompareIds(compareIds.filter((x) => x !== id));
    }
  };

  const selectedQuotes = useMemo(() => {
    return quotations.filter((q) => compareIds.includes(q.id));
  }, [quotations, compareIds]);

  const selectedCarrier = carrierSuppliers.find((supplier) => supplier.id === carrier);

  const handleCreateQuotation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chargeLines: QuotationChargeLineInput[] = chargeSections.flatMap((section) =>
      section.fields.flatMap<QuotationChargeLineInput>((field) => {
        const value = amounts[field.code];
        if (typeof value !== 'number' || value <= 0) return [];
        return [
          {
            charge_type: field.charge_type,
            description: t(field.labelKey),
            quantity: 1,
            unit: field.unit,
            unit_price: value,
          },
        ];
      }),
    );

    createMutation.mutate({
      requestCode,
      carrierId: carrier,
      carrierName: selectedCarrier?.supplier_name,
      currency,
      shippingMode,
      quoteAmount: computedTotal,
      chargeLines,
    });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={4}>{t('quotations.title')}</Title>
          <Text size="xs" c="dimmed">
            {t('quotations.quoteCount', { count: quotations.length })}
          </Text>
        </Stack>
        <Group>
          <Button
            size="xs"
            variant="outline"
            disabled={compareIds.length !== 2}
            onClick={() => setShowComparison((current) => !current)}
          >
            {showComparison ? t('quotations.hideCompare') : t('quotations.compare')} ({compareIds.length}/2)
          </Button>
          <Tooltip label={t('quotations.createGateHint')} disabled={canCreateQuote} withArrow>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              data-disabled={!canCreateQuote || undefined}
              onClick={(event) => {
                if (!canCreateQuote) {
                  event.preventDefault();
                  return;
                }
                setCreateOpened(true);
              }}
            >
              {t('quotations.createBtn')}
            </Button>
          </Tooltip>
        </Group>
      </Group>

      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title={t('quotations.newQuoteTitle')}
        size="lg"
        centered
      >
        <form onSubmit={handleCreateQuotation}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('quotations.createFormSubtitle', { requestCode })}
            </Text>

            <Paper withBorder p="md" radius="sm">
              <Stack gap="sm">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  {t('quotations.carrierSection')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={<HeaderLabel label={t('quotations.carrier')} hint={t('glossary.carrier')} />}
                    placeholder={t('quotations.carrierPlaceholder')}
                    data={carrierOptions}
                    value={carrier}
                    onChange={(value) => setCarrier(value || '')}
                    searchable
                    clearable
                    required
                    autoFocus
                  />
                  <Select
                    label={<HeaderLabel label={t('quotations.shippingMode')} hint={t('glossary.shippingMode')} />}
                    value={shippingMode}
                    onChange={(val) => setShippingMode((val as ShippingMode) || 'FCL')}
                    data={SHIPPING_MODE_OPTIONS}
                  />
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <InfoField
                    label={<HeaderLabel label={t('quotations.incotermsReadonly')} hint={t('glossary.incoterm')} />}
                    value={incoterms?.trim() || '—'}
                  />
                  <InfoField
                    label={<HeaderLabel label={t('quotations.incotermsGroup')} hint={t('glossary.incoterm')} />}
                    value={t(groupLabelKey(incotermGroup))}
                  />
                </SimpleGrid>
                {incotermGroup === 'UNKNOWN' ? (
                  <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />} p="xs">
                    <Text size="xs">{t('quotations.incotermsUnknownNote')}</Text>
                  </Alert>
                ) : null}
                {incotermGroup === 'PREPAID' ? (
                  <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} p="xs">
                    <Text size="xs">{t('quotations.prepaidNote')}</Text>
                  </Alert>
                ) : null}
              </Stack>
            </Paper>

            {chargeSections.map((section) => (
              <Paper key={section.id} withBorder p="md" radius="sm">
                <Stack gap="sm">
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    {t(section.titleKey)}
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {section.fields.map((field) => (
                      <NumberInput
                        key={field.code}
                        label={<HeaderLabel label={t(field.labelKey)} hint={t(chargeHintKey(field))} />}
                        description={`${currency} / ${field.unit}`}
                        placeholder="0.00"
                        value={amounts[field.code] ?? ''}
                        onChange={(value) => setAmount(field.code, value === '' ? '' : Number(value))}
                        min={0}
                        thousandSeparator=","
                        decimalScale={2}
                      />
                    ))}
                  </SimpleGrid>
                </Stack>
              </Paper>
            ))}

            <Paper withBorder p="md" radius="sm">
              <Stack gap="sm">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  <HeaderLabel label={t('quotations.pricingSection')} hint={t('glossary.landedCost')} />
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={t('quotations.currency')}
                    value={currency}
                    onChange={(val) => setCurrency(val || 'USD')}
                    data={currencyOptions}
                    searchable
                    clearable
                  />
                  <InfoField
                    label={<HeaderLabel label={t('quotations.computedTotal')} hint={t('glossary.landedCost')} />}
                    value={`${computedTotal.toLocaleString()} ${currency}`}
                  />
                </SimpleGrid>
              </Stack>
            </Paper>

            <Group justify="space-between">
              <Button variant="subtle" onClick={() => setCreateOpened(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={createMutation.isPending} disabled={!carrier || computedTotal <= 0}>
                {t('quotations.createBtn')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {quotationsQuery.isLoading ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : quotations.length === 0 ? (
        <Paper withBorder p="md">
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              {canCreateQuote ? t('quotations.noQuotes') : t('quotations.createGateHint')}
            </Text>
            <Tooltip label={t('quotations.createGateHint')} disabled={canCreateQuote} withArrow>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                data-disabled={!canCreateQuote || undefined}
                onClick={(event) => {
                  if (!canCreateQuote) {
                    event.preventDefault();
                    return;
                  }
                  setCreateOpened(true);
                }}
              >
                {t('quotations.createBtn')}
              </Button>
            </Tooltip>
          </Group>
        </Paper>
      ) : (
        <ScrollArea.Autosize mah={560} offsetScrollbars>
          <Table verticalSpacing="xs" miw={980} stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}></Table.Th>
                <Table.Th>{t('quotations.title')}</Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('quotations.carrier')} hint={t('glossary.carrier')} />
                </Table.Th>
                <Table.Th>{t('quotations.proposedPrice')}</Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('quotations.chargeBreakdown')} hint={t('glossary.landedCost')} />
                </Table.Th>
                <Table.Th>{t('quotations.status')}</Table.Th>
                <Table.Th>{t('quotations.sla')}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>{t('quotations.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {quotations.map((quote: any) => {
                const isChecked = compareIds.includes(quote.id);
                const isDisabled = !isChecked && compareIds.length >= 2;
                return (
                  <Table.Tr key={quote.id}>
                    <Table.Td>
                      <Checkbox
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={(e) => handleCompareSelect(quote.id, e.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {quote.quoteNumber}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {quote.shippingMode} {quote.version ? `| v${quote.version}` : ''}
                      </Text>
                      {quote.isFinal ? (
                        <Badge size="xs" color="teal" variant="filled" mt={4}>
                          Final
                        </Badge>
                      ) : null}
                    </Table.Td>
                    <Table.Td>{quote.carrierName || 'N/A'}</Table.Td>
                    <Table.Td>
                      {quote.quoteAmount ? (
                        <Text fw={700}>
                          {Number(quote.quoteAmount).toLocaleString()} {quote.currency}
                        </Text>
                      ) : (
                        <Text c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Group gap={4} wrap="nowrap">
                          <HeaderLabel label={t('quotations.mainFreight')} hint={t('glossary.freight')} />
                          <Text size="xs">
                            {Number(quote.freightCost || 0).toLocaleString()} {quote.currency ?? ''}
                          </Text>
                        </Group>
                        <Group gap={8} wrap="wrap">
                          <Group gap={4} wrap="nowrap">
                            <HeaderLabel label={t('quotations.localCharges')} hint={t('glossary.localCharges')} />
                            <Text size="xs" c="dimmed">
                              {Number(quote.localCharges || 0).toLocaleString()}
                            </Text>
                          </Group>
                          <Group gap={4} wrap="nowrap">
                            <HeaderLabel label={t('quotations.customsFee')} hint={t('glossary.customsClearance')} />
                            <Text size="xs" c="dimmed">
                              {Number(quote.customsFee || 0).toLocaleString()}
                            </Text>
                          </Group>
                        </Group>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          quote.status === 'APPROVED' || quote.status === 'BOOKED'
                            ? 'green'
                            : quote.status === 'REJECTED'
                              ? 'red'
                              : quote.status.includes('SENT')
                                ? 'blue'
                                : 'gray'
                        }
                        variant="light"
                      >
                        {quote.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {(quote.status === 'PRELIMINARY_SENT' || quote.status === 'OFFICIAL_SENT') && (
                        <SlaTimer
                          dueAt={quote.status === 'PRELIMINARY_SENT' ? quote.preliminaryDueAt : quote.officialDueAt}
                        />
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap="xs" justify="flex-end">
                        {quote.status === 'DRAFT' && (
                          <Button
                            size="compact-xs"
                            color="blue"
                            onClick={() => actionMutation.mutate({ id: quote.id, action: 'SEND_PRELIMINARY' })}
                            loading={actionMutation.isPending}
                          >
                            {t('deliveryOrders.send')}
                          </Button>
                        )}
                        {(quote.status === 'PRELIMINARY_SENT' || quote.status === 'OFFICIAL_SENT') && (
                          <>
                            <Button
                              size="compact-xs"
                              color="green"
                              onClick={() => actionMutation.mutate({ id: quote.id, action: 'CUSTOMER_APPROVED' })}
                              loading={actionMutation.isPending}
                            >
                              Mark final
                            </Button>
                            <Button
                              size="compact-xs"
                              color="red"
                              variant="light"
                              onClick={() => actionMutation.mutate({ id: quote.id, action: 'CUSTOMER_REJECTED' })}
                              loading={actionMutation.isPending}
                            >
                              {t('deliveryOrders.reject')}
                            </Button>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}

      {showComparison && selectedQuotes.length === 2 ? (
        <Paper withBorder p="md">
          <Group justify="space-between" mb="md">
            <Title order={4}>{t('quotations.compareTitle')}</Title>
            <Button size="xs" variant="subtle" onClick={() => setShowComparison(false)} leftSection={<IconX size={14} />}>
              {t('common.close')}
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {selectedQuotes.map((quote: any, idx) => {
              const lines = (quote.chargeLines ?? []) as Array<{
                id: string;
                description: string | null;
                charge_type: string;
                unit: string | null;
                total_amount?: number | string;
                amount?: number | string;
              }>;
              return (
                <Paper key={quote.id} withBorder p="md">
                  <Title order={5} mb="md">
                    {t('quotations.option', { num: idx + 1, code: quote.quoteNumber })}
                  </Title>
                  <Stack gap="xs">
                    <InfoField
                      label={<HeaderLabel label={t('quotations.carrier')} hint={t('glossary.carrier')} />}
                      value={quote.carrierName || 'N/A'}
                    />
                    <InfoField
                      label={<HeaderLabel label={t('quotations.shippingMode')} hint={t('glossary.shippingMode')} />}
                      value={quote.shippingMode}
                    />
                    <InfoField
                      label={t('quotations.proposedPrice')}
                      value={
                        quote.quoteAmount
                          ? `${Number(quote.quoteAmount).toLocaleString()} ${quote.currency}`
                          : 'N/A'
                      }
                    />
                    {lines.length > 0 ? (
                      <Stack gap={4} mt={4}>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                          {t('quotations.chargeBreakdown')}
                        </Text>
                        {lines.map((line) => (
                          <Group key={line.id} justify="space-between" gap="xs" wrap="nowrap">
                            <Text size="xs">
                              {line.description || line.charge_type}
                              {line.unit ? (
                                <Text span size="xs" c="dimmed">
                                  {' '}
                                  /{line.unit}
                                </Text>
                              ) : null}
                            </Text>
                            <Text size="xs" fw={600}>
                              {Number(line.total_amount ?? line.amount ?? 0).toLocaleString()} {quote.currency}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <>
                        <InfoField
                          label={<HeaderLabel label={t('quotations.mainFreight')} hint={t('glossary.freight')} />}
                          value={
                            quote.freightCost ? `${Number(quote.freightCost).toLocaleString()} ${quote.currency}` : '0'
                          }
                        />
                        <InfoField
                          label={<HeaderLabel label={t('quotations.localCharges')} hint={t('glossary.localCharges')} />}
                          value={
                            quote.localCharges
                              ? `${Number(quote.localCharges).toLocaleString()} ${quote.currency}`
                              : '0'
                          }
                        />
                        <InfoField
                          label={<HeaderLabel label={t('quotations.customsFee')} hint={t('glossary.customsClearance')} />}
                          value={
                            quote.customsFee ? `${Number(quote.customsFee).toLocaleString()} ${quote.currency}` : '0'
                          }
                        />
                      </>
                    )}
                    <InfoField label={t('quotations.status')} value={quote.status} />
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Paper>
      ) : null}
    </Stack>
  );
}
