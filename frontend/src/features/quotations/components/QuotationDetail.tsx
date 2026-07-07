import { Alert, Anchor, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconFileInvoice } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchQuotationOptions,
  fetchQuotationVersions,
  markQuotationFinal,
  negotiateQuotation,
  receiveQuotation,
  rejectQuotation,
  selectQuotationOption,
  submitQuotationToKbi,
  updateQuotationChargeLine,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { CopyValue } from '@shared/components/CopyValue';
import { DateTimeText } from '@shared/components/DateTimeText';
import { FieldPair } from '@shared/components/FieldPair';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney, roundToMinorUnits } from '@shared/utils/money';

import { summarizeByCurrency } from '../model/quotationCurrency';
import { quotationDisplayTotalInCurrency } from '../model/quotationModel';
import { selectOptionChargeLines } from '../model/quotationOptionDraft';
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
  quotation: QuotationV1;
  onRevise?: (q: QuotationV1) => void;
  onInspectVersion?: (q: QuotationV1) => void;
};

export function QuotationDetail({ quotation, onRevise, onInspectVersion }: QuotationDetailProps) {
  const { t, statusLabel } = useI18n();
  const queryClient = useQueryClient();
  const { rateToVnd } = useExchangeRates();
  const [adjustMode, setAdjustMode] = useState(false);

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
  const selectedOptionId = quotation.selected_option_id ?? options.find((option) => option.is_selected)?.id ?? null;
  const [previewOptionId, setPreviewOptionId] = useState<string | null>(null);
  const activeOptionId = previewOptionId ?? selectedOptionId ?? options.find((option) => option.is_recommended)?.id ?? options[0]?.id ?? null;
  const activeOptionNo = options.find((option) => option.id === activeOptionId)?.option_no ?? null;
  const visibleChargeLines = selectOptionChargeLines(quotation.charge_lines ?? [], activeOptionNo);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationDetail(quotation.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationOptions(quotation.id) });
  };

  const selectOptionMutation = useMutation({
    mutationFn: (optionId: string) => selectQuotationOption(quotation.id, optionId),
    onSuccess: (updatedQuotation) => {
      queryClient.setQueryData(queryKeys.quotationOptions(quotation.id), updatedQuotation.options ?? []);
      invalidate();
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (next: 'draft' | 'submit' | 'confirm') => {
      if (next === 'draft') return receiveQuotation(quotation.id);
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
        const taxRate = Number(line.tax_rate || 0);
        const taxAmount = roundToMinorUnits(amount * taxRate / 100, line.currency_code);

        return updateQuotationChargeLine(draft.charge_line_id, {
          unit_price: draft.proposed_unit_price,
          amount,
          tax_amount: taxAmount,
          total_amount: roundToMinorUnits(amount + taxAmount, line.currency_code),
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
  const total = quotationDisplayTotalInCurrency(quotation, rateToVnd);
  const currencySummary = summarizeByCurrency(
    visibleChargeLines.map((line) => ({
      currency: line.currency_code ?? null,
      amount: Number(line.amount ?? Number(line.quantity) * Number(line.unit_price)),
      taxable: Number(line.tax_rate) > 0,
    })),
    rateToVnd,
  );
  const heroTotal =
    currencySummary.byCurrency.length === 1
      ? formatMoney(currencySummary.byCurrency[0].total, currencySummary.byCurrency[0].currency)
      : currencySummary.byCurrency.length > 1
        ? formatMoney(currencySummary.internalVndTotal, 'VND')
        : formatMoney(total, quotation.currency_code);
  const events = quotation.events ?? [];

  return (
    <Stack gap="sm" className="rfq-detail">
      <Paper withBorder p={0} className="rfq-detail-hero">
        <div className="rfq-detail-hero-main">
          <Group justify="space-between" align="flex-start" gap="md" className="rfq-detail-hero-inner">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-detail-title-row">
              <div className="rfq-icon-box">
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
            <div className="rfq-detail-total">
              <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                {t('quotations.total')}
              </Text>
              <Text fw={900} size="xl" className="tabular-nums">
                {heroTotal}
              </Text>
              {currencySummary.byCurrency.length > 1 ? (
                <Text size="xs" c="dimmed">
                  {t('quotations.internalVndTotal')}
                </Text>
              ) : null}
            </div>
          </Group>
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
                {quotation.rfq_id}
              </Anchor>
            ) : '-'}
          />
          <FieldPair className="rfq-fact" label={t('quotations.incoterm')} value={quotation.incoterm_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotations.mode')} value={quotation.mode ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotations.currency')} value={quotation.currency_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotations.validUntil')} value={formatDate(quotation.valid_until)} />
          <FieldPair className="rfq-fact" label={t('quotations.createdAt')} value={<DateTimeText value={quotation.create_at} showZone />} />
        </div>
      </Paper>

      {status === 'REJECTED' && quotation.reject_reason ? (
        <Alert color="red" title={t('quotations.rejectReason')}>
          {quotation.reject_reason}
        </Alert>
      ) : null}

      <div className="rfq-detail-layout">
        <div className="rfq-detail-main">
          <Paper withBorder p="md" className="rfq-breakdown-panel">
            <QuotationOptionsTable
              mode="read"
              options={options}
              selectedOptionId={activeOptionId}
              onSelect={(optionId) => {
                setPreviewOptionId(optionId);
                selectOptionMutation.mutate(optionId);
              }}
            />
          </Paper>

          <Paper withBorder p={0} className="rfq-breakdown-panel">
            <QuotationChargeBreakdown
              quotation={quotation}
              chargeLines={visibleChargeLines}
              adjustMode={adjustMode}
              isSubmitting={adjustMutation.isPending}
              rateToVnd={rateToVnd}
              onCancelAdjust={() => setAdjustMode(false)}
              onSubmitAdjust={(lines) => adjustMutation.mutate(lines)}
            />
          </Paper>
        </div>

        <aside className="rfq-detail-side">
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

          {status === 'REJECTED' && (versionsQuery.isPending || versionsQuery.isError || versions.length > 1) ? (
            <Paper withBorder p={0} className="rfq-timeline-panel">
              <div className="rfq-panel-head">
                <div>
                  <Text fw={800}>{t('quotations.versionHistory')}</Text>
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
                          {formatMoney(quotationDisplayTotalInCurrency(v, rateToVnd), v.currency_code)}
                        </Text>
                        <DateTimeText value={v.create_at} size="xs" c="dimmed" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Paper>
          ) : null}

          <Paper withBorder p={0} className="rfq-timeline-panel">
            <div className="rfq-panel-head">
              <div>
                <Text fw={800}>{t('quotations.lifecycle')}</Text>
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
        </aside>
      </div>
    </Stack>
  );
}
