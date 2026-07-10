import { Alert, Anchor, Group, Modal, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconFileInvoice, IconGitCompare, IconReceipt2 } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchQuotationOptions,
  fetchQuotationVersions,
  markQuotationFinal,
  negotiateQuotation,
  rejectQuotation,
  selectQuotationOption,
  submitQuotationToKbi,
  updateQuotationChargeLine,
  type QuotationOptionV1,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { AnchoredWorkflowRail, useAnchoredWorkflowSections, type AnchoredWorkflowStep } from '@shared/components/AnchoredWorkflow';
import { CopyValue } from '@shared/components/CopyValue';
import { DetailHero } from '@shared/components/DetailHero';
import { DateTimeText } from '@shared/components/DateTimeText';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { FieldPair } from '@shared/components/FieldPair';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney, roundToMinorUnits } from '@shared/utils/money';

import {
  computeOptionCompareTotals,
  computeOptionCustomerPayTotal,
  computeQuotationCustomerPayTotal,
  selectOptionChargeLines,
} from '../model/quotationMoney';
import { QuotationChargeBreakdown, type QuotationChargeAdjustmentDraft } from './QuotationChargeBreakdown';
import { QuotationOptionsTable } from './QuotationOptionsTable';
import { QuotationOptionComparePanel } from './QuotationOptionComparePanel';
import { QuotationResponsePanel } from './QuotationResponsePanel';

function formatEventType(value?: string | null): string {
  const normalized = value?.trim();
  if (!normalized) return '-';

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

type QuotationDetailProps = {
  onBack: () => void;
  quotation: QuotationV1;
  onRevise?: (q: QuotationV1) => void;
  onInspectVersion?: (q: QuotationV1) => void;
};

type ScopedOptionState = {
  quotationId: string;
  optionId: string | null;
};

type ScopedOptionListState = {
  quotationId: string;
  optionIds: string[];
};

export function QuotationDetail({ onBack, quotation, onRevise, onInspectVersion }: QuotationDetailProps) {
  const { t, statusLabel } = useI18n();
  const queryClient = useQueryClient();
  const { rateToVndOrNull } = useExchangeRates();
  const [adjustMode, setAdjustMode] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<ScopedOptionState | null>(null);
  const [previewOption, setPreviewOption] = useState<ScopedOptionState | null>(null);
  const [compareSelection, setCompareSelection] = useState<ScopedOptionListState | null>(null);
  const [compareOpened, setCompareOpened] = useState(false);

  const versionsQuery = useQuery({
    queryKey: queryKeys.quotationVersions(quotation.id),
    queryFn: () => fetchQuotationVersions(quotation.id),
    enabled: quotation.status === 'REJECTED',
  });
  const optionsQuery = useQuery({
    queryKey: queryKeys.quotationOptions(quotation.id),
    queryFn: () => fetchQuotationOptions(quotation.id),
    initialData: quotation.options,
  });
  const versions = (versionsQuery.data ?? []).sort((a, b) => b.version - a.version);
  const isLatestKnownVersion = versions.length === 0 || versions[0]?.id === quotation.id;
  const options = optionsQuery.data ?? quotation.options ?? [];
  const selectedOverrideId = selectedOverride?.quotationId === quotation.id ? selectedOverride.optionId : null;
  const previewOptionId = previewOption?.quotationId === quotation.id ? previewOption.optionId : null;
  const compareOptionIds = compareSelection?.quotationId === quotation.id
    ? compareSelection.optionIds.filter((id) => options.some((option) => option.id === id)).slice(0, 2)
    : [];
  const compareOptions = compareOptionIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is QuotationOptionV1 => Boolean(option));
  const selectedOptionId = selectedOverrideId ?? quotation.selected_option_id ?? options.find((option) => option.is_selected)?.id ?? null;
  const activeOptionId = previewOptionId ?? selectedOptionId ?? options.find((option) => option.is_recommended)?.id ?? options[0]?.id ?? null;
  const activeOptionNo = options.find((option) => option.id === activeOptionId)?.option_no ?? null;
  const visibleChargeLines = selectOptionChargeLines(quotation.charge_lines ?? [], activeOptionNo);
  const paymentCurrency = quotation.currency_code ?? 'VND';
  const optionCustomerPays = options.reduce<Record<string, number>>((totals, option) => {
    const value = computeOptionCustomerPayTotal(quotation.charge_lines ?? [], option.option_no, paymentCurrency, rateToVndOrNull);
    if (value != null) totals[option.id] = value;
    return totals;
  }, {});

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationDetail(quotation.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationOptions(quotation.id) });
  };

  function toggleCompareOption(optionId: string) {
    setCompareSelection((current) => {
      const currentIds = current?.quotationId === quotation.id ? current.optionIds : [];
      const nextIds = currentIds.includes(optionId)
        ? currentIds.filter((id) => id !== optionId)
        : [...currentIds, optionId].slice(-2);
      return { quotationId: quotation.id, optionIds: nextIds };
    });
  }

  const selectOptionMutation = useMutation({
    mutationFn: (optionId: string) => selectQuotationOption(quotation.id, optionId),
    onSuccess: (updatedQuotation) => {
      const nextSelectedId =
        updatedQuotation.selected_option_id ??
        updatedQuotation.options?.find((option) => option.is_selected)?.id ??
        null;
      setSelectedOverride({ quotationId: quotation.id, optionId: nextSelectedId });
      setPreviewOption(null);
      queryClient.setQueryData(queryKeys.quotationOptions(quotation.id), updatedQuotation.options ?? []);
      invalidate();
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (next: 'submit' | 'confirm') => {
      if (next === 'submit') return submitQuotationToKbi(quotation.id);
      return markQuotationFinal(quotation.id);
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (reason?: string) => rejectQuotation(quotation.id, { reason }),
    onSuccess: () => {
      setAdjustMode(false);
      invalidate();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (lines: QuotationChargeAdjustmentDraft[]) => {
      if (quotation.status === 'PENDING_APPROVAL' || quotation.status === 'PENDING_ADJUSTMENT') {
        return negotiateQuotation(quotation.id, {
          actor_role: quotation.status === 'PENDING_ADJUSTMENT' ? 'FDS' : 'KBI',
          lines,
        });
      }

      await Promise.all(lines.map((draft) => {
        const line = visibleChargeLines.find((item) => item.id === draft.charge_line_id);
        if (!line) return Promise.resolve(null);
        const quantity = Number(line.quantity ?? 1);
        const amount = roundToMinorUnits(quantity * draft.proposed_unit_price, line.currency_code);

        return updateQuotationChargeLine(draft.charge_line_id, {
          unit_price: draft.proposed_unit_price,
          amount,
          tax_rate: 0,
          tax_amount: 0,
          total_amount: amount,
          note: draft.note ?? line.note ?? null,
        });
      }));
      return null;
    },
    onSuccess: () => {
      setAdjustMode(false);
      invalidate();
    },
  });

  const status = quotation.status;
  const heroMoney = computeQuotationCustomerPayTotal(quotation, rateToVndOrNull, activeOptionNo);
  const heroTotal = heroMoney.customerPayTotal != null ? formatMoney(heroMoney.customerPayTotal, paymentCurrency) : '-';
  const events = quotation.events ?? [];
  const workflowSteps: AnchoredWorkflowStep[] = [
    {
      id: 'quotation-detail-options',
      label: t('quotations.options'),
      icon: <IconGitCompare size={14} />,
    },
    {
      id: 'quotation-detail-charges',
      label: t('quotations.chargeBreakdown'),
      description: t('quotations.chargeLinesCount', { count: visibleChargeLines.length }),
      icon: <IconReceipt2 size={14} />,
    },
  ];
  const workflowSectionIds = workflowSteps.map((step) => step.id);
  const { activeSectionId, scrollToSection } = useAnchoredWorkflowSections(workflowSectionIds);

  return (
    <Stack gap="sm" className="rfq-detail">
      <FeatureHeaderShell backLabel={t('common.backToList')} onBack={onBack}>
        <DetailHero
          className="rfq-detail-hero quote-workflow-detail-hero"
          paperProps={{ withBorder: true, p: 0 }}
        >
          <div className="rfq-detail-hero-main feature-hero-layout">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-detail-title-row feature-hero-identity">
              <div className="rfq-icon-box feature-hero-icon">
                <IconFileInvoice size={18} />
              </div>
              <div className="rfq-detail-title-copy">
                <Group gap="xs" align="center">
                  <Title order={3}>
                    <CopyValue value={quotation.quotation_no}>{quotation.quotation_no}</CopyValue>
                  </Title>
                  <StatusBadge status={status} />
                </Group>
                <Text c="dimmed" size="sm">
                  {quotation.customer_ref ?? '-'}
                </Text>
              </div>
            </Group>
            <div className="rfq-detail-total feature-hero-summary">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                {t('quotations.customerPays')} ({paymentCurrency})
              </Text>
              <Text fw={800} size="xl" className="tabular-nums">
                {heroTotal}
              </Text>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {t('quotations.totalVnd')}: {heroMoney.totalVnd > 0 ? formatMoney(heroMoney.totalVnd, 'VND') : '-'}
              </Text>
              {heroMoney.missingRateCount > 0 ? (
                <Text size="xs" c="yellow.7" fw={700}>
                  {t('quotations.missingRateTotal', { count: heroMoney.missingRateCount })}
                </Text>
              ) : null}
            </div>
          </div>

          <div className="rfq-detail-fact-strip">
            <FieldPair className="rfq-fact" label={t('quotations.customer')} value={quotation.customer_ref ?? '-'} />
            <FieldPair
              className="rfq-fact"
              label={t('quotationRequests.field.route')}
              value={quotation.origin_port || quotation.destination_port ? `${quotation.origin_port ?? '-'} -> ${quotation.destination_port ?? '-'}` : '-'}
            />
            <FieldPair
              className="rfq-fact"
              label={t('quotations.rfqLink')}
              value={quotation.rfq_id ? (
                <Anchor component={Link} to={`/quotation-requests?view=${quotation.rfq_id}`}>
                  {quotation.rfq_no ?? quotation.rfq_id}
                </Anchor>
              ) : '-'}
            />
            <FieldPair className="rfq-fact" label={t('quotations.incoterm')} value={quotation.incoterm_code ?? '-'} />
            <FieldPair className="rfq-fact" label={t('quotations.mode')} value={quotation.mode ?? '-'} />
            <FieldPair className="rfq-fact" label={t('quotations.paymentCurrencyLabel')} value={quotation.currency_code ?? '-'} />
            <FieldPair className="rfq-fact" label={t('quotations.validUntil')} value={formatDate(quotation.valid_until)} />
            <FieldPair className="rfq-fact" label={t('quotations.createdAt')} value={<DateTimeText value={quotation.create_at} showZone />} />
          </div>
        </DetailHero>
      </FeatureHeaderShell>

      {
        status === 'REJECTED' && quotation.reject_reason ? (
          <Alert color="red" title={t('quotations.rejectReason')}>
            {quotation.reject_reason}
          </Alert>
        ) : null
      }

      <div className="rfq-detail-layout quote-workflow-detail-layout">
        <div className="rfq-detail-main">
          <section id="quotation-detail-options" className="quote-workflow-section">
            <Paper withBorder p="md" className="rfq-breakdown-panel">
              <QuotationOptionsTable
                mode="read"
                options={options}
                activeOptionId={activeOptionId}
                compareOptionIds={compareOptionIds}
                optionTotals={optionCustomerPays}
                optionTotalsCurrency={paymentCurrency}
                previewOptionId={previewOptionId}
                selectedOptionId={selectedOptionId}
                onOpenCompare={() => setCompareOpened(true)}
                onPreview={(optionId) => setPreviewOption({ quotationId: quotation.id, optionId })}
                onSelect={(optionId) => selectOptionMutation.mutate(optionId)}
                onToggleCompare={toggleCompareOption}
              />
            </Paper>
          </section>

          <section id="quotation-detail-charges" className="quote-workflow-section">
            <Paper withBorder p={0} className="rfq-breakdown-panel">
              <QuotationChargeBreakdown
                quotation={quotation}
                chargeLines={visibleChargeLines}
                adjustMode={adjustMode}
                isSubmitting={adjustMutation.isPending}
                rateToVndOrNull={rateToVndOrNull}
                onCancelAdjust={() => setAdjustMode(false)}
                onSubmitAdjust={(lines) => adjustMutation.mutate(lines)}
              />
            </Paper>
          </section>
        </div>

        <aside className="rfq-detail-side quote-workflow-side">
          <AnchoredWorkflowRail
            activeStepId={activeSectionId}
            steps={workflowSteps}
            title={t('quotations.workflowTitle')}
            onStepSelect={scrollToSection}
          />
          <section id="quotation-detail-response" className="quote-workflow-section">
            <QuotationResponsePanel
              quotation={quotation}
              selectedOptionId={selectedOptionId}
              isLatestKnownVersion={isLatestKnownVersion}
              versionsQueryIsSuccess={versionsQuery.isSuccess}
              transitionLoading={transitionMutation.isPending}
              rejectLoading={rejectMutation.isPending}
              onRevise={onRevise}
              onTransition={(next) => transitionMutation.mutate(next)}
              onReject={(reason) => rejectMutation.mutate(reason)}
              onEnterAdjust={() => setAdjustMode(true)}
            />
          </section>

          {status === 'REJECTED' && (versionsQuery.isPending || versionsQuery.isError || versions.length > 1) ? (
            <Paper withBorder p={0} className="rfq-timeline-panel">
              <div className="rfq-panel-head">
                <div>
                  <Text fw={700}>{t('quotations.versionHistory')}</Text>
                  <Text size="xs" c="dimmed">
                    {versions.length} {t('quotations.version')}
                  </Text>
                </div>
              </div>
              <div className="rfq-timeline-list">
                {versionsQuery.isPending ? (
                  <Text c="dimmed" size="sm">{t('common.loading')}</Text>
                ) : versionsQuery.isError ? (
                  <Text c="red" size="sm">{t('quotations.errorDescription')}</Text>
                ) : (
                  versions.map((v) => (
                    <button
                      className="rfq-timeline-item rfq-version-item"
                      disabled={!onInspectVersion || v.id === quotation.id}
                      key={v.id}
                      onClick={() => onInspectVersion?.(v)}
                      type="button"
                    >
                      <span className="rfq-timeline-dot" aria-hidden="true" />
                      <div>
                        <Group gap="xs" align="center">
                          <Text fw={700} size="sm">{v.quotation_no}</Text>
                          <StatusBadge status={v.status} />
                          {v.id === quotation.id ? (
                            <Text size="xs" c="dimmed">({t('quotations.currentVersion')})</Text>
                          ) : null}
                        </Group>
                        <Text size="xs" c="dimmed" className="tabular-nums">
                          {(() => {
                            const versionMoney = computeQuotationCustomerPayTotal(v, rateToVndOrNull);
                            return versionMoney.customerPayTotal != null
                              ? formatMoney(versionMoney.customerPayTotal, v.currency_code)
                              : '-';
                          })()}
                        </Text>
                        <DateTimeText value={v.create_at} size="xs" c="dimmed" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Paper>
          ) : null}

          <section id="quotation-detail-lifecycle" className="quote-workflow-section">
            <Paper withBorder p={0} className="rfq-timeline-panel">
              <div className="rfq-panel-head">
                <div>
                  <Text fw={700}>{t('quotations.lifecycle')}</Text>
                  <DateTimeText value={quotation.update_at} size="xs" c="dimmed" showZone />
                </div>
              </div>
              <div className="rfq-timeline-list">
                {events.length === 0 ? (
                  <Text c="dimmed" size="sm">{t('quotations.noEvents')}</Text>
                ) : (
                  events.map((event) => (
                    <div className="rfq-timeline-item" key={event.id}>
                      <span className="rfq-timeline-dot" aria-hidden="true" />
                      <div>
                        <Text fw={700} size="sm">{formatEventType(event.event_type ?? event.event_code)}</Text>
                        <DateTimeText value={event.event_at} size="xs" c="dimmed" />
                        {event.old_status || event.new_status ? (
                          <Text size="xs" c="dimmed">
                            {event.old_status ? statusLabel(event.old_status) : '-'} {'->'}{' '}
                            {event.new_status ? statusLabel(event.new_status) : '-'}
                          </Text>
                        ) : null}
                        {event.note ? (
                          <Text size="xs">{event.note}</Text>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Paper>
          </section>
        </aside>
      </div>

      <Modal
        centered
        classNames={{
          body: 'rfq-compare-modal-body',
          content: 'rfq-compare-modal-content',
          header: 'rfq-compare-modal-header',
          title: 'rfq-compare-modal-title',
        }}
        opened={compareOpened && compareOptions.length === 2}
        onClose={() => setCompareOpened(false)}
        size="min(96vw, 1280px)"
        title={(
          <Group gap="sm" wrap="nowrap">
            <span className="rfq-compare-title-icon" aria-hidden="true">
              <IconGitCompare size={18} />
            </span>
            <div>
              <Text fw={800}>{t('quotations.compareOptionsTitle')}</Text>
              <Text size="xs" c="dimmed">{quotation.quotation_no}</Text>
            </div>
          </Group>
        )}
      >
        <Text size="xs" c="dimmed" className="rfq-compare-summary">
          {t('quotations.compareSummary')}
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" className="rfq-compare-grid">
          {compareOptions.map((option, index) => {
            const otherOption = compareOptions[index === 0 ? 1 : 0] ?? null;
            const optionLines = selectOptionChargeLines(quotation.charge_lines ?? [], option.option_no);
            const totals = computeOptionCompareTotals(
              quotation.charge_lines ?? [],
              option.option_no,
              paymentCurrency,
              rateToVndOrNull,
            );
            const otherTotals = otherOption
              ? computeOptionCompareTotals(quotation.charge_lines ?? [], otherOption.option_no, paymentCurrency, rateToVndOrNull)
              : null;
            return (
              <QuotationOptionComparePanel
                key={option.id}
                option={option}
                otherOption={otherOption}
                optionLines={optionLines}
                paymentCurrency={paymentCurrency}
                totals={totals}
                otherTotals={otherTotals}
              />
            );
          })}
        </SimpleGrid>
      </Modal>
    </Stack >
  );
}
