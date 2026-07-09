import { Alert, Anchor, Badge, Group, Modal, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconFileInvoice, IconGitCompare, IconReceipt2 } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
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
import { DateTimeText } from '@shared/components/DateTimeText';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { FieldPair } from '@shared/components/FieldPair';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useI18n, type MessageKey } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { formatDate } from '@shared/utils/date';
import { formatMoney, roundToMinorUnits } from '@shared/utils/money';

import {
  computeOptionCompareTotals,
  computeOptionCustomerPayTotal,
  computeQuotationCustomerPayTotal,
  selectOptionChargeLines,
  type QuotationChargeGroupKey,
  type QuotationOptionCompareTotals,
} from '../model/quotationMoney';
import { QuotationChargeBreakdown, type QuotationChargeAdjustmentDraft } from './QuotationChargeBreakdown';
import { QuotationOptionsTable } from './QuotationOptionsTable';
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

function quotationChargeGroupLabelKey(group?: string | null): MessageKey {
  if (group === 'ORIGIN') return 'quotations.group.origin';
  if (group === 'DESTINATION') return 'quotations.group.destination';
  return 'quotations.group.freight';
}

type CompareDelta =
  | { kind: 'up' | 'down'; value: string }
  | { kind: 'equal' }
  | null;

function compareNumericDelta(
  own: number | null | undefined,
  other: number | null | undefined,
  formatAbs: (abs: number) => string,
): CompareDelta {
  if (own == null || other == null || !Number.isFinite(own) || !Number.isFinite(other)) return null;
  const diff = own - other;
  if (Math.abs(diff) < 1e-9) return { kind: 'equal' };
  return { kind: diff > 0 ? 'up' : 'down', value: formatAbs(Math.abs(diff)) };
}

function compareDateDayDelta(
  own: string | null | undefined,
  other: string | null | undefined,
  formatAbs: (abs: number) => string,
): CompareDelta {
  const ownTime = own ? Date.parse(own) : Number.NaN;
  const otherTime = other ? Date.parse(other) : Number.NaN;
  if (!Number.isFinite(ownTime) || !Number.isFinite(otherTime)) return null;
  const diffDays = Math.round((ownTime - otherTime) / 86_400_000);
  if (diffDays === 0) return { kind: 'equal' };
  return { kind: diffDays > 0 ? 'up' : 'down', value: formatAbs(Math.abs(diffDays)) };
}

function CompareDeltaPill({ delta }: { delta: CompareDelta }) {
  const { t } = useI18n();
  if (!delta) return null;
  if (delta.kind === 'equal') {
    return (
      <span className="rfq-compare-delta" data-direction="equal">
        = {t('quotations.compareNoDifference')}
      </span>
    );
  }
  return (
    <span className="rfq-compare-delta" data-direction={delta.kind}>
      {delta.kind === 'up' ? '↑' : '↓'}{' '}
      {delta.kind === 'up'
        ? t('quotations.compareHigherBy', { value: delta.value })
        : t('quotations.compareLowerBy', { value: delta.value })}
    </span>
  );
}

function CompareMetric({
  label,
  value,
  delta,
}: {
  label: string;
  value: ReactNode;
  delta: CompareDelta;
}) {
  return (
    <div className="rfq-compare-metric">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} size="sm" className="tabular-nums">{value}</Text>
      <CompareDeltaPill delta={delta} />
    </div>
  );
}

const COMPARE_GROUP_ORDER: QuotationChargeGroupKey[] = ['FREIGHT', 'ORIGIN', 'DESTINATION'];

function groupCompareLines(lines: NonNullable<QuotationV1['charge_lines']>) {
  const grouped = new Map<string, NonNullable<QuotationV1['charge_lines']>>();
  for (const group of QUOTATION_CHARGE_GROUPS) grouped.set(group.value, []);
  for (const line of lines) {
    const key = line.charge_group && grouped.has(line.charge_group) ? line.charge_group : 'FREIGHT';
    grouped.get(key)?.push(line);
  }
  return QUOTATION_CHARGE_GROUPS.map((group) => ({ ...group, lines: grouped.get(group.value) ?? [] })).filter(
    (group) => group.lines.length > 0,
  );
}

function QuotationOptionComparePanel({
  option,
  otherOption,
  optionLines,
  paymentCurrency,
  totals,
  otherTotals,
}: {
  option: QuotationOptionV1;
  otherOption: QuotationOptionV1 | null;
  optionLines: NonNullable<QuotationV1['charge_lines']>;
  paymentCurrency: string;
  totals: QuotationOptionCompareTotals;
  otherTotals: QuotationOptionCompareTotals | null;
}) {
  const { t } = useI18n();
  const formatDays = (abs: number) => t('quotations.compareDays', { count: abs });
  const rateMissing = totals.missingRateCount > 0 || (otherTotals?.missingRateCount ?? 0) > 0;
  const moneyDelta = rateMissing
    ? null
    : compareNumericDelta(totals.customerPayTotal, otherTotals?.customerPayTotal ?? null, (abs) =>
      formatMoney(abs, paymentCurrency),
    );
  const vndDelta = rateMissing
    ? null
    : compareNumericDelta(totals.totalVnd, otherTotals?.totalVnd ?? null, (abs) => formatMoney(abs, 'VND'));

  return (
    <Paper withBorder p="lg" className="rfq-compare-card">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="xs" className="rfq-compare-card-head">
          <div>
            <Group gap={6} align="center">
              <Badge size="sm" variant="light">#{option.option_no}</Badge>
              {option.is_recommended ? (
                <Badge size="sm" color="green" variant="light">{t('quotations.recommendedOption')}</Badge>
              ) : null}
              {option.is_selected ? (
                <Badge size="sm" color="blue" variant="light">{t('quotations.selectedOption')}</Badge>
              ) : null}
            </Group>
            <Text fw={800} size="lg" mt={4}>
              {option.carrier_name || option.carrier_code || '-'}
            </Text>
            {option.carrier_code ? <Text size="xs" c="dimmed">{option.carrier_code}</Text> : null}
          </div>
          <div className="rfq-compare-total">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              {t('quotations.customerPays')} ({paymentCurrency})
            </Text>
            <Text fw={800} className="tabular-nums">
              {totals.customerPayTotal != null ? formatMoney(totals.customerPayTotal, paymentCurrency) : '-'}
            </Text>
            <CompareDeltaPill delta={moneyDelta} />
            {rateMissing ? (
              <Text size="xs" c="yellow.7" fw={700}>{t('quotations.compareMissingRate')}</Text>
            ) : null}
          </div>
        </Group>

        <div className="rfq-compare-metrics">
          <CompareMetric
            label={t('quotations.totalVnd')}
            value={totals.totalVnd > 0 ? formatMoney(totals.totalVnd, 'VND') : '-'}
            delta={vndDelta}
          />
          <CompareMetric
            label={t('quotations.transitDays')}
            value={option.transit_time_days ?? '-'}
            delta={compareNumericDelta(
              option.transit_time_days != null ? Number(option.transit_time_days) : null,
              otherOption?.transit_time_days != null ? Number(otherOption.transit_time_days) : null,
              formatDays,
            )}
          />
          <CompareMetric
            label={t('quotations.compareEtdOffset')}
            value={formatDate(option.etd)}
            delta={compareDateDayDelta(option.etd, otherOption?.etd ?? null, formatDays)}
          />
          <CompareMetric
            label={t('quotations.compareEtaOffset')}
            value={formatDate(option.eta)}
            delta={compareDateDayDelta(option.eta, otherOption?.eta ?? null, formatDays)}
          />
          <CompareMetric
            label={t('quotations.compareLineCount')}
            value={totals.lineCount}
            delta={compareNumericDelta(totals.lineCount, otherTotals?.lineCount ?? null, (abs) => `${abs}`)}
          />
        </div>

        <div className="rfq-compare-groups">
          <Text fw={700} size="sm">{t('quotations.compareGroupTotals')}</Text>
          {COMPARE_GROUP_ORDER.map((group) => (
            <div className="rfq-compare-group-row" key={group}>
              <Text size="sm" c="dimmed">
                {t(quotationChargeGroupLabelKey(group))}
              </Text>
              <div className="rfq-compare-group-value">
                <Text fw={700} size="sm" className="tabular-nums">
                  {totals.groupTotalsVnd[group] > 0 ? formatMoney(totals.groupTotalsVnd[group], 'VND') : '-'}
                </Text>
                {rateMissing ? null : (
                  <CompareDeltaPill
                    delta={compareNumericDelta(
                      totals.groupTotalsVnd[group],
                      otherTotals?.groupTotalsVnd[group] ?? null,
                      (abs) => formatMoney(abs, 'VND'),
                    )}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <FieldPair label={t('quotations.mode')} value={option.mode ?? '-'} />
          <FieldPair label={t('quotations.vesselOrFlight')} value={option.vessel_or_flight ?? '-'} />
          <FieldPair label={t('quotations.riskWarning')} value={option.risk_warning ?? '-'} />
        </SimpleGrid>

        <div className="rfq-compare-lines">
          <Group justify="space-between" gap="xs" mb={6}>
            <Text fw={700} size="sm">{t('quotations.compareChargeLines')}</Text>
            <Badge size="xs" variant="light">{optionLines.length}</Badge>
          </Group>
          {optionLines.length === 0 ? (
            <Text c="dimmed" size="sm">{t('quotations.noChargeLines')}</Text>
          ) : (
            groupCompareLines(optionLines).map((group) => (
              <div className="rfq-compare-line-group" key={group.value}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} className="rfq-compare-line-group-label">
                  {t(group.labelKey)}
                </Text>
                {group.lines.map((line) => {
                  const amount = Number(line.amount ?? Number(line.quantity ?? 0) * Number(line.unit_price ?? 0));
                  return (
                    <div className="rfq-compare-line" key={line.id}>
                      <Text fw={700} size="xs" lineClamp={1}>
                        {line.charge_code ?? line.description ?? '-'}
                      </Text>
                      <Text fw={700} size="xs" className="tabular-nums">
                        {Number.isFinite(amount) ? formatMoney(amount, line.currency_code) : '-'}
                      </Text>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </Stack>
    </Paper>
  );
}

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
        <Paper withBorder p={0} className="rfq-detail-hero feature-detail-hero quote-workflow-detail-hero">
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
        </Paper>
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
