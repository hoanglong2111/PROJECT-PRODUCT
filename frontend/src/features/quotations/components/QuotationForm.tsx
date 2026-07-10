import {
  Alert,
  Anchor,
  Button,
  Group,
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { ChargeCode } from '@shared/api/chargeCodes';
import { AnchoredWorkflowRail, useAnchoredWorkflowSections, type AnchoredWorkflowStep } from '@shared/components/AnchoredWorkflow';
import { DateField } from '@shared/components/DateField';
import {
  createQuotationOption,
  createQuotationVersion,
  type QuotationV1,
} from '@shared/api/quotations';
import { createQuotationFromRequest, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { formatMoney } from '@shared/utils/money';
import { formatNumber } from '@shared/utils/number';

import { useQuotationDraftOptions } from '../hooks/useQuotationDraftOptions';
import { useQuotationFormData } from '../hooks/useQuotationFormData';
import {
  buildQuotationChargeLinePayloads,
  computeOptionCustomerPayAmount,
  computeOptionMoneyTotals,
  type DraftBuildContext,
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

  const [paymentCurrency, setPaymentCurrency] = useState<string>('VND');

  const { chargeCodesQuery, uomsQuery } = useQuotationFormData();
  const chargeCodes = chargeCodesQuery.data?.data ?? EMPTY_CHARGE_CODES;
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

  const {
    addDraftOption,
    addOptionLine,
    collapsedOptionIds,
    draftOptions,
    optionRefs,
    removeDraftOption,
    removeOptionLine,
    setRecommendedOption,
    toggleOptionCollapsed,
    updateOption,
    updateOptionLine,
  } = useQuotationDraftOptions(sourceQuotation, (chargeCode) => findChargeCode(chargeCode)?.default_uom);

  const buildCtx = useMemo<DraftBuildContext>(
    () => ({
      shippingMode,
      language,
      findChargeCode,
      rateToVndOrNull,
    }),
    [shippingMode, language, findChargeCode, rateToVndOrNull],
  );

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
  const workflowSteps = useMemo<AnchoredWorkflowStep[]>(() => [
    {
      id: 'qform-context',
      label: t('quotations.rfqContext'),
      icon: <IconRoute size={14} />,
    },
    {
      id: 'qform-options',
      label: t('quotations.options'),
      icon: <IconFileInvoice size={14} />,
    },
    {
      id: 'qform-pricing',
      label: t('quotations.pricingCharges'),
      icon: <IconReceipt2 size={14} />,
    },
  ], [t]);
  const workflowSectionIds = useMemo(() => workflowSteps.map((step) => step.id), [workflowSteps]);
  const { activeSectionId, scrollToSection } = useAnchoredWorkflowSections(workflowSectionIds);


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
    <Stack gap="md" className="rfq-form quote-workflow quote-workflow--qform">
      <FeatureHeaderShell backLabel={t('common.back')} onBack={onCancel}>
        <div className="rfq-form-hero feature-form-hero">
          <Group justify="space-between" align="flex-start" gap="md" className="rfq-form-hero-inner feature-hero-layout">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-form-title-row feature-hero-identity">
              <div className="rfq-icon-box feature-hero-icon">
                <IconFileInvoice size={18} />
              </div>
              <div className="quote-workflow-title-copy">
                <Title order={2}>{formTitle}</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  {formSubtitle}
                </Text>
              </div>
            </Group>
            <div className="rfq-form-hero-metrics feature-hero-facts">
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
      </FeatureHeaderShell>

      <div className="quote-workflow-layout quote-workflow-layout--with-summary">
        <aside className="quote-workflow-side">
          <AnchoredWorkflowRail
            activeStepId={activeSectionId}
            steps={workflowSteps}
            title={t('quotations.workflowTitle')}
            onStepSelect={scrollToSection}
          />
        </aside>

        <div className="rfq-form-main quote-workflow-main">
          {isRevise && sourceQuotation?.reject_reason ? (
            <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotations.reviseFromRejectedBanner')} mb="md">
              {sourceQuotation.reject_reason}
            </Alert>
          ) : null}

          <section id="qform-context" className="rfq-form-section quote-workflow-section">
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

          <section id="qform-options" className="rfq-form-section quote-workflow-section">
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
              <Button variant="light" leftSection={<IconPlus size={14} />} onClick={() => addDraftOption(header.mode)}>
                {t('quotations.addOption')}
              </Button>
            </Group>
            <Stack id="qform-pricing" gap="md" mt="md" className="quote-workflow-pricing-anchor">
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

        <aside id="qform-review" className="rfq-form-rail quote-workflow-summary-rail">
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
                {t('quotations.referenceRate')}: 1 {referenceCurrency} = {formatNumber(referenceRate, { locale })} VND
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
    </Stack>
  );
}
