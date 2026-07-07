import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconFileInvoice,
  IconPlus,
  IconReceipt2,
  IconRoute,
  IconWallet,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import { DateField } from '@shared/components/DateField';
import {
  createQuotationOption,
  createQuotationVersion,
  type QuotationChargeGroup,
  type QuotationV1,
} from '@shared/api/quotations';
import { createQuotationFromRequest, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import {
  computeQuotationLineVnd,
  summarizeQuotationVndLines,
} from '@shared/lib/quotationCharges';
import { formatMoney } from '@shared/utils/money';

import {
  addDraftChargeLine,
  removeDraftChargeLineAt,
  emptyDraftGroups,
  seedDraftGroupsForOption,
  updateDraftChargeLineAt,
  type QuotationDraftChargeLineState,
} from '../model/quotationDraftLines';
import {
  buildQuotationChargeLinePayloads,
  computeOptionHeadlineVnd,
  type DraftBuildContext,
  type DraftQuotationOption,
} from '../model/quotationOptionDraft';
import { toShippingMode } from '../model/quotationModel';
import { QuotationOptionEditor } from './QuotationOptionEditor';
import { hasMinimumOptions } from './QuotationOptionsTable';

type QuotationFormProps = {
  onCancel: () => void;
  onCreated: (quotation: QuotationV1) => void;
  sourceQuotation?: QuotationV1;
  rfq?: QuotationRequestV1;
};

const EMPTY_CHARGE_CODES: ChargeCode[] = [];

function ReadOnlyContext({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rfq-scope-field">
      <Text size="xs" c="dimmed" fw={700} mb={4}>
        {label}
      </Text>
      <Text size="sm" fw={800}>
        {value}
      </Text>
    </div>
  );
}

export function QuotationForm({ onCancel, onCreated, rfq, sourceQuotation }: QuotationFormProps) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const { carrierOptions, carriers, currencyOptions, transportModeOptions } = useTradeMasterDataOptions();
  const { rateToVndOrNull } = useExchangeRates();
  const isRevise = Boolean(sourceQuotation);

  const header = {
    customer: sourceQuotation?.customer_ref ?? rfq?.customer_ref ?? '-',
    supplier:
      sourceQuotation?.supplier?.supplier_name ??
      sourceQuotation?.supplier_id ??
      rfq?.supplier?.supplier_name ??
      rfq?.supplier_id ??
      '-',
    origin: sourceQuotation?.origin_port ?? rfq?.origin_port ?? '-',
    destination: sourceQuotation?.destination_port ?? rfq?.destination_port ?? '-',
    mode: sourceQuotation?.mode ?? rfq?.mode ?? '-',
    incoterm: sourceQuotation?.incoterm_code ?? rfq?.incoterm_code ?? '-',
    rfqId: sourceQuotation?.rfq_id ?? rfq?.id ?? null,
    rfqNo: sourceQuotation?.rfq_no ?? rfq?.rfq_no ?? null,
  };
  const shippingMode = toShippingMode(header.mode);

  const [validUntil, setValidUntil] = useState(sourceQuotation?.valid_until?.slice(0, 10) ?? '');

  const [draftOptions, setDraftOptions] = useState<DraftQuotationOption[]>(
    (sourceQuotation?.options ?? []).map((option) => ({
      id: option.id,
      option_no: option.option_no,
      carrier_code: option.carrier_code,
      carrier_name: option.carrier_name,
      mode: option.mode ?? sourceQuotation?.mode ?? null,
      vessel_or_flight: option.vessel_or_flight,
      voyage_flight_no: option.voyage_flight_no,
      etd: option.etd,
      eta: option.eta,
      transit_time_days: option.transit_time_days,
      risk_warning: option.risk_warning,
      headline_amount: Number(option.headline_amount ?? 0),
      is_recommended: option.is_recommended,
      is_selected: option.is_selected,
      groupLines: seedDraftGroupsForOption(sourceQuotation, option.option_no),
    })),
  );
  const [paymentCurrency, setPaymentCurrency] = useState<string>('VND');

  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });
  const chargeCodes = chargeCodesQuery.data?.data ?? EMPTY_CHARGE_CODES;

  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ limit: 200, is_active: true }),
    queryFn: () => fetchUoms({ limit: 200, is_active: true }),
  });
  const uoms = uomsQuery.data?.data ?? [];

  const chargeCodeOptions = useMemo(() => {
    const unique = Array.from(new Map(chargeCodes.map((chargeCode) => [chargeCode.charge_code, chargeCode])).values());
    return unique.map((chargeCode) => ({
      label: `${chargeCode.charge_code} - ${chargeCode.charge_name_en}`,
      value: chargeCode.charge_code,
    }));
  }, [chargeCodes]);

  const findChargeCode = useCallback((code: string | null | undefined) => {
    return chargeCodes.find((chargeCode) => chargeCode.charge_code === code) ?? null;
  }, [chargeCodes]);

  const buildCtx = useMemo<DraftBuildContext>(
    () => ({
      shippingMode,
      language,
      findChargeCode,
      rateToVndOrNull,
    }),
    [shippingMode, language, findChargeCode, rateToVndOrNull],
  );

  function updateOption(id: string, patch: Partial<DraftQuotationOption>) {
    setDraftOptions((current) => current.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  }

  function addOptionLine(id: string, group: QuotationChargeGroup) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? { ...option, groupLines: addDraftChargeLine(option.groupLines, group) }
          : option
      )),
    );
  }

  function updateOptionLine(
    id: string,
    group: QuotationChargeGroup,
    rowIndex: number,
    patch: Partial<QuotationDraftChargeLineState>,
  ) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? {
            ...option,
            groupLines: updateDraftChargeLineAt(
              option.groupLines,
              group,
              rowIndex,
              patch,
              (chargeCode) => findChargeCode(chargeCode)?.default_uom,
            ),
          }
          : option
      )),
    );
  }

  function removeOptionLine(id: string, group: QuotationChargeGroup, rowIndex: number) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? { ...option, groupLines: removeDraftChargeLineAt(option.groupLines, group, rowIndex) }
          : option
      )),
    );
  }

  const previewOption = draftOptions.find((option) => option.is_recommended) ?? draftOptions[0] ?? null;
  const allLines = useMemo(() => {
    if (!previewOption) return [];
    return QUOTATION_CHARGE_GROUPS.flatMap((group) => (
      previewOption.groupLines[group.value].map((line) => ({ group: group.value, line }))
    ));
  }, [previewOption]);

  const validationLines = useMemo(
    () => draftOptions.flatMap((option) => QUOTATION_CHARGE_GROUPS.flatMap((group) => option.groupLines[group.value])),
    [draftOptions],
  );

  const quotationVndLines = useMemo(() => {
    return allLines.map(({ line }) => {
      return computeQuotationLineVnd(
        {
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          currency: line.currency,
          endpointCurrency: line.endpointCurrency,
        },
        rateToVndOrNull,
      );
    });
  }, [allLines, findChargeCode, rateToVndOrNull]);
  const quotationVndTotals = useMemo(() => summarizeQuotationVndLines(quotationVndLines), [quotationVndLines]);
  const referenceCurrency = allLines.find(({ line }) => line.currency && line.currency !== 'VND')?.line.currency ?? null;
  const referenceRate = referenceCurrency ? rateToVndOrNull(referenceCurrency) : null;
  const paymentRate = paymentCurrency === 'VND' ? 1 : rateToVndOrNull(paymentCurrency);
  const customerPaysTotal = paymentRate ? quotationVndTotals.totalVnd / paymentRate : null;

  const totalsByOriginalCurrency = (() => {
    const buckets = new Map<string, number>();
    for (const { line } of allLines) {
      if (!line.chargeCode || !line.currency || !(Number(line.unitPrice) > 0)) continue;
      const currency = line.currency.trim().toUpperCase();
      const amount = Number(line.quantity) * Number(line.unitPrice);
      buckets.set(currency, (buckets.get(currency) ?? 0) + amount);
    }
    return Array.from(buckets, ([currency, amount]) => ({ currency, amount }));
  })();

  const pricedLineCount = validationLines.filter((line) => line.chargeCode && Number(line.unitPrice) > 0).length;
  const filledLineCount = validationLines.filter((line) => line.chargeCode && Number(line.unitPrice) > 0 && line.currency).length;
  const hasPricedLineMissingCurrency = pricedLineCount > filledLineCount;
  const canSubmit = draftOptions.length > 0 && filledLineCount > 0 && !hasPricedLineMissingCurrency;

  function addDraftOption() {
    setDraftOptions((current) => [
      ...current,
      {
        id: `draft-option-${Date.now()}`,
        option_no: current.length + 1,
        carrier_code: null,
        carrier_name: null,
        mode: header.mode,
        vessel_or_flight: null,
        voyage_flight_no: null,
        etd: null,
        eta: null,
        transit_time_days: null,
        risk_warning: null,
        headline_amount: null,
        is_recommended: current.length === 0,
        is_selected: false,
        groupLines: emptyDraftGroups(),
      },
    ]);
  }

  function removeDraftOption(optionId: string) {
    setDraftOptions((current) =>
      current.filter((item) => item.id !== optionId).map((item, index) => ({ ...item, option_no: index + 1 })),
    );
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const chargeLines = buildQuotationChargeLinePayloads(draftOptions, buildCtx);
      const quotation = isRevise
        ? await createQuotationVersion(sourceQuotation!.id, {
          status: 'DRAFT',
          currency_code: paymentCurrency,
          valid_until: validUntil || null,
          charge_lines: chargeLines,
        })
        : await createQuotationFromRequest(rfq!.id, {
          currency_code: paymentCurrency,
          valid_until: validUntil || null,
          charge_lines: chargeLines,
        });

      for (const option of draftOptions) {
        await createQuotationOption(quotation.id, {
          carrier_code: option.carrier_code,
          carrier_name: option.carrier_name,
          mode: option.mode,
          vessel_or_flight: option.vessel_or_flight,
          voyage_flight_no: option.voyage_flight_no,
          etd: option.etd,
          eta: option.eta,
          transit_time_days: option.transit_time_days,
          risk_warning: option.risk_warning,
          headline_amount: computeOptionHeadlineVnd(option, buildCtx),
          is_recommended: option.is_recommended,
        });
      }

      return quotation;
    },
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationOptions(quotation.id) });
      onCreated(quotation);
    },
  });

  const formTitle = isRevise ? t('quotations.reviseTitle') : t('quotations.formTitle');
  const formSubtitle = isRevise ? t('quotations.reviseSubtitle') : t('quotations.createFromRfqOnly');
  const submitLabel = t('quotations.actionResubmit');

  return (
    <Stack gap="md" className="rfq-form">
      <Paper withBorder p={0} className="rfq-form-panel">
        <div className="rfq-form-hero">
          <Group justify="space-between" align="flex-start" gap="md" className="rfq-form-hero-inner">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-form-title-row">
              <div className="rfq-icon-box">
                <IconFileInvoice size={18} />
              </div>
              <div className="rfq-form-title-copy">
                <Title order={3}>{formTitle}</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  {formSubtitle}
                </Text>
              </div>
            </Group>
            <div className="rfq-form-hero-metrics">
              <div className="rfq-form-hero-metric">
                <IconRoute size={16} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.rfqContext')}
                  </Text>
                  <Text size="sm" fw={800}>
                    {header.incoterm} / {header.mode}
                  </Text>
                </div>
              </div>
              <div className="rfq-form-hero-metric">
                <IconReceipt2 size={16} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.chargeLinesCount', { count: filledLineCount })}
                  </Text>
                  <Text size="sm" fw={800}>
                    {quotationVndTotals.totalVnd > 0 ? formatMoney(quotationVndTotals.totalVnd, 'VND') : '-'}
                  </Text>
                </div>
              </div>
            </div>
          </Group>
        </div>

        <div className="rfq-form-layout">
          <div className="rfq-form-main">
            {isRevise && sourceQuotation?.reject_reason ? (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotations.reviseFromRejectedBanner')} mb="md">
                {sourceQuotation.reject_reason}
              </Alert>
            ) : null}

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.rfqContext')}</Text>
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="md" className="rfq-setup-grid">
                <ReadOnlyContext label={t('quotations.customer')} value={header.customer} />
                <ReadOnlyContext label={t('quotationRequests.field.supplier')} value={header.supplier} />
                <ReadOnlyContext label={t('quotationRequests.field.route')} value={`${header.origin} -> ${header.destination}`} />
                <ReadOnlyContext label={t('quotations.mode')} value={header.mode} />
                <ReadOnlyContext label={t('quotations.incoterm')} value={header.incoterm} />
                <ReadOnlyContext
                  label={t('quotations.rfqLink')}
                  value={
                    header.rfqId ? (
                      <Anchor component={Link} to={`/quotation-requests?view=${header.rfqId}`}>
                        {header.rfqNo ?? header.rfqId}
                      </Anchor>
                    ) : (
                      '-'
                    )
                  }
                />
                <DateField
                  className="rfq-scope-field"
                  label={t('quotations.validUntil')}
                  value={validUntil || null}
                  onChange={(value) => setValidUntil(value ?? '')}
                />
              </SimpleGrid>
            </section>

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.options')}</Text>
                <Text size="xs" c="dimmed" className="rfq-section-summary">
                  {t('quotations.optionsHint')}
                </Text>
              </div>
              {!hasMinimumOptions(draftOptions) ? (
                <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mt="md">
                  {t('quotations.minimumOptionsWarning')}
                </Alert>
              ) : null}
              <Group justify="flex-end" mt="md">
                <Button variant="light" leftSection={<IconPlus size={14} />} onClick={addDraftOption}>
                  {t('quotations.addOption')}
                </Button>
              </Group>
              <Stack gap="md" mt="md">
                {draftOptions.length === 0 ? (
                  <div className="rfq-empty-lines">
                    <Text size="sm" c="dimmed">
                      {t('quotations.minimumOptionsWarning')}
                    </Text>
                  </div>
                ) : null}
                {draftOptions.map((option) => (
                  <QuotationOptionEditor
                    key={option.id}
                    option={option}
                    carriers={carriers}
                    carrierOptions={carrierOptions}
                    transportModeOptions={transportModeOptions}
                    chargeCodeOptions={chargeCodeOptions}
                    currencyOptions={currencyOptions}
                    uoms={uoms}
                    buildCtx={buildCtx}
                    rateToVndOrNull={rateToVndOrNull}
                    onUpdateOption={updateOption}
                    onAddLine={addOptionLine}
                    onUpdateLine={updateOptionLine}
                    onRemoveLine={removeOptionLine}
                    onRemoveOption={removeDraftOption}
                  />
                ))}
              </Stack>
            </section>
          </div>

          <aside className="rfq-form-rail">
            <div className="rfq-total-card">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                    {t('quotations.totalInCurrency', { currency: paymentCurrency })}
                  </Text>
                  {filledLineCount > 0 ? (
                    <Stack gap={6} mt={6}>
                      <Stack gap={4} className="rfq-original-items">
                        {totalsByOriginalCurrency.map((bucket) => (
                          <Group key={bucket.currency} justify="space-between" gap="md" wrap="nowrap">
                            <Text size="sm" c="dimmed" className="rfq-original-item-name">
                              {bucket.currency}
                            </Text>
                            <Text fw={700} className="tabular-nums">
                              {formatMoney(bucket.amount, bucket.currency)}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                      <div className="rfq-total-separator" />
                      <div className="rfq-customer-pays">
                        <Group justify="space-between" gap="md" wrap="nowrap" align="center">
                          <Text size="sm" c="dimmed">
                            {t('quotations.customerPays')}
                          </Text>
                          <Select
                            aria-label={t('quotations.customerPaysCurrency')}
                            data={currencyOptions}
                            value={paymentCurrency}
                            onChange={(value) => setPaymentCurrency(value ?? 'VND')}
                            searchable
                            size="xs"
                            w={110}
                            allowDeselect={false}
                          />
                        </Group>
                        <Text fw={900} size="xl" className="tabular-nums" ta="right" mt={4}>
                          {customerPaysTotal != null ? formatMoney(customerPaysTotal, paymentCurrency) : '-'}
                        </Text>
                      </div>
                      {quotationVndTotals.missingRateCount > 0 ? (
                        <Group gap={6} wrap="nowrap" className="rfq-missing-rate-total">
                          <IconAlertTriangle size={14} />
                          <Text size="xs" fw={700}>
                            {t('quotations.missingRateTotal', { count: quotationVndTotals.missingRateCount })}
                          </Text>
                        </Group>
                      ) : null}
                    </Stack>
                  ) : (
                    <Text fw={900} size="xl" className="tabular-nums">
                      -
                    </Text>
                  )}
                  {referenceCurrency && referenceRate ? (
                    <Text size="xs" c="dimmed" mt="xs">
                      {t('quotations.referenceRate')}: 1 {referenceCurrency} = {new Intl.NumberFormat('vi-VN').format(referenceRate)} VND
                    </Text>
                  ) : null}
                </div>
                <div className="rfq-total-icon">
                  <IconWallet size={18} />
                </div>
              </Group>
            </div>
            {!canSubmit ? (
              <Text size="xs" c="dimmed" className="rfq-submit-hint">
                {hasPricedLineMissingCurrency ? t('quotations.selectCurrencyForAllFees') : t('quotations.enterAtLeastOneFee')}
              </Text>
            ) : null}
            <Group justify="flex-end" className="rfq-rail-actions" grow>
              <Button variant="default" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
              <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {submitLabel}
              </Button>
            </Group>
          </aside>
        </div>
      </Paper>
    </Stack>
  );
}
