import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
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
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
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
  computeOptionCustomerPayAmount,
  computeOptionMoneyTotals,
  type DraftBuildContext,
  type DraftQuotationOption,
} from '../model/quotationOptionDraft';
import { toShippingMode } from '../model/quotationModel';
import { CurrencySelect } from './CurrencySelect';
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
      <Text size="xs" c="dimmed" fw={600} mb={4}>
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </div>
  );
}

export function QuotationForm({ onCancel, onCreated, rfq, sourceQuotation }: QuotationFormProps) {
  const { language, locale, t } = useI18n();
  const queryClient = useQueryClient();
  const { carrierOptions, carriers, currencies, transportModeOptions } = useTradeMasterDataOptions();
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
  const [collapsedOptionIds, setCollapsedOptionIds] = useState<Set<string>>(new Set());
  const [paymentCurrency, setPaymentCurrency] = useState<string>('VND');
  const optionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  function setRecommendedOption(id: string) {
    setDraftOptions((current) => current.map((option) => ({ ...option, is_recommended: option.id === id })));
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

  function toggleOptionCollapsed(id: string) {
    setCollapsedOptionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function scrollOptionIntoView(id: string) {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const target = optionRefs.current[id];
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportPadding = 24;
        const isOutOfView = rect.top < viewportPadding || rect.bottom > viewportHeight - viewportPadding;
        if (isOutOfView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }, 180);
  }

  const validationLines = useMemo(
    () => draftOptions.flatMap((option) => QUOTATION_CHARGE_GROUPS.flatMap((group) => option.groupLines[group.value])),
    [draftOptions],
  );
  const optionMoneyTotals = useMemo(() => {
    return new Map(draftOptions.map((option) => [option.id, computeOptionMoneyTotals(option, paymentCurrency, buildCtx)]));
  }, [buildCtx, draftOptions, paymentCurrency]);
  const activeOption = draftOptions.find((option) => option.is_recommended) ?? draftOptions[0] ?? null;
  const activeOptionTotals = activeOption ? optionMoneyTotals.get(activeOption.id) ?? null : null;
  const totalMissingRateCount = Array.from(optionMoneyTotals.values()).reduce((count, totals) => count + totals.missingRateCount, 0);
  const referenceCurrency = validationLines.find((line) => line.currency && line.currency !== 'VND')?.currency ?? null;
  const referenceRate = referenceCurrency ? rateToVndOrNull(referenceCurrency) : null;

  const pricedLineCount = validationLines.filter((line) => line.chargeCode && Number(line.unitPrice) > 0).length;
  const filledLineCount = validationLines.filter((line) => line.chargeCode && Number(line.unitPrice) > 0 && line.currency).length;
  const hasPricedLineMissingCurrency = pricedLineCount > filledLineCount;
  const canSubmit = draftOptions.length > 0 && filledLineCount > 0 && !hasPricedLineMissingCurrency;

  function addDraftOption() {
    const nextId = `draft-option-${Date.now()}`;
    setCollapsedOptionIds(new Set(draftOptions.map((option) => option.id)));
    setDraftOptions((current) => [
      ...current,
      {
        id: nextId,
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
    scrollOptionIntoView(nextId);
  }

  function removeDraftOption(optionId: string) {
    setCollapsedOptionIds((current) => {
      const next = new Set(current);
      next.delete(optionId);
      return next;
    });
    setDraftOptions((current) => {
      const remaining = current
        .filter((item) => item.id !== optionId)
        .map((item, index) => ({ ...item, option_no: index + 1 }));
      if (remaining.length > 0 && !remaining.some((option) => option.is_recommended)) {
        return remaining.map((option, index) => ({ ...option, is_recommended: index === 0 }));
      }
      return remaining;
    });
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
          headline_amount: computeOptionCustomerPayAmount(option, paymentCurrency, buildCtx) ?? 0,
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
                  <Text size="sm" fw={700}>
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
                  <Text size="sm" fw={700}>
                    {activeOptionTotals && activeOptionTotals.totalVnd > 0 ? formatMoney(activeOptionTotals.totalVnd, 'VND') : '-'}
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
                <Text fw={700}>{t('quotations.rfqContext')}</Text>
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
                <Text fw={700}>{t('quotations.options')}</Text>
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
                  <div
                    key={option.id}
                    ref={(node) => {
                      optionRefs.current[option.id] = node;
                    }}
                  >
                    <QuotationOptionEditor
                      option={option}
                      carriers={carriers}
                      carrierOptions={carrierOptions}
                      transportModeOptions={transportModeOptions}
                      chargeCodeOptions={chargeCodeOptions}
                      currencies={currencies}
                      uoms={uoms}
                      moneyTotals={optionMoneyTotals.get(option.id) ?? null}
                      paymentCurrency={paymentCurrency}
                      rateToVndOrNull={rateToVndOrNull}
                      collapsed={collapsedOptionIds.has(option.id)}
                      onToggleCollapsed={toggleOptionCollapsed}
                      onSetRecommended={setRecommendedOption}
                      onUpdateOption={updateOption}
                      onAddLine={addOptionLine}
                      onUpdateLine={updateOptionLine}
                      onRemoveLine={removeOptionLine}
                      onRemoveOption={removeDraftOption}
                    />
                  </div>
                ))}
              </Stack>
            </section>
          </div>

          <aside className="rfq-form-rail">
            <div className="rfq-total-card">
              <div className="rfq-total-card-head">
                <div className="rfq-total-title">
                  <span className="rfq-total-icon" aria-hidden="true">
                    <IconWallet size={15} />
                  </span>
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                    {t('quotations.totalInCurrency', { currency: paymentCurrency })}
                  </Text>
                </div>
                <CurrencySelect
                  aria-label={t('quotations.customerPaysCurrency')}
                  wrapperClassName="rfq-total-currency-select"
                  currencies={currencies}
                  value={paymentCurrency}
                  onChange={(value) => setPaymentCurrency(value ?? 'VND')}
                  searchable
                  size="xs"
                  variant="unstyled"
                  allowDeselect={false}
                />
              </div>
              {activeOption && activeOptionTotals ? (
                <Stack gap={4} mt={8}>
                  <Text size="xs" c="dimmed">
                    {t('quotations.recommendedOption')} #{activeOption.option_no}
                  </Text>
                  {activeOptionTotals.subtotalsBySourceCurrency.length > 0 ? (
                    <Stack gap={4} className="rfq-original-items">
                      {activeOptionTotals.subtotalsBySourceCurrency.map((bucket) => (
                        <div key={bucket.currency} className="rfq-original-item">
                          <Text size="sm" c="dimmed" className="rfq-original-item-name">
                            {bucket.currency}
                          </Text>
                          <Text fw={700} className="tabular-nums rfq-total-value">
                            {formatMoney(bucket.amount, bucket.currency)}
                          </Text>
                        </div>
                      ))}
                    </Stack>
                  ) : null}
                  <div className="rfq-total-separator" />
                  <div className="rfq-customer-pays">
                    <Text size="sm" c="dimmed" className="rfq-customer-pays-label">
                      {t('quotations.totalVnd')}
                    </Text>
                    <Text fw={800} size="lg" className="tabular-nums rfq-customer-pays-value">
                      {activeOptionTotals.totalVnd > 0 ? formatMoney(activeOptionTotals.totalVnd, 'VND') : '-'}
                    </Text>
                  </div>
                  <div className="rfq-customer-pays">
                    <Text size="sm" c="dimmed" className="rfq-customer-pays-label">
                      {t('quotations.customerPays')} ({paymentCurrency})
                    </Text>
                    <Text fw={800} size="lg" className="tabular-nums rfq-customer-pays-value">
                      {activeOptionTotals.customerPayTotal != null ? formatMoney(activeOptionTotals.customerPayTotal, paymentCurrency) : '-'}
                    </Text>
                  </div>
                  {totalMissingRateCount > 0 ? (
                    <Group gap={6} wrap="nowrap" className="rfq-missing-rate-total">
                      <IconAlertTriangle size={14} />
                      <Text size="xs" fw={700}>
                        {t('quotations.missingRateTotal', { count: totalMissingRateCount })}
                      </Text>
                    </Group>
                  ) : null}
                </Stack>
              ) : (
                <Text fw={800} size="lg" className="tabular-nums rfq-customer-pays-value" mt={8}>
                  -
                </Text>
              )}
              {referenceCurrency && referenceRate ? (
                <Text size="xs" c="dimmed" mt="xs" className="rfq-reference-rate">
                  {t('quotations.referenceRate')}: 1 {referenceCurrency} = {new Intl.NumberFormat(locale).format(referenceRate)} VND
                </Text>
              ) : null}
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
