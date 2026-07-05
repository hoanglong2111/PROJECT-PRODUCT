import { ActionIcon, Alert, Button, Collapse, Group, Paper, Stack, Table, Text, Textarea, Title, Tooltip } from '@mantine/core';
import { IconCheck, IconChevronDown, IconEdit, IconFileInvoice, IconSend, IconShoppingCart, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchQuotationVersions,
  markQuotationFinal,
  receiveQuotation,
  rejectQuotation,
  submitQuotationToKbi,
  type QuotationStatusV1,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { CopyValue } from '@shared/components/CopyValue';
import { DateTimeText } from '@shared/components/DateTimeText';
import { FieldPair } from '@shared/components/FieldPair';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney, roundToMinorUnits } from '@shared/utils/money';

import { quotationDisplayTotal } from '../model/quotationModel';

function formatAmount(amount: number, currency: string | null | undefined): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(roundToMinorUnits(amount, currency));
}

function formatChargeDescription(value?: string | null): string {
  const description = value?.trim();
  if (!description) return '-';
  return description.startsWith('-') ? description : `- ${description}`;
}

function formatEventType(value?: string | null): string {
  const normalized = value?.trim();
  if (!normalized) return '—';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectExpanded, setRejectExpanded] = useState(false);
  const [chargesExpanded, setChargesExpanded] = useState(true);

  const versionsQuery = useQuery({
    queryKey: queryKeys.quotationVersions(quotation.id),
    queryFn: () => fetchQuotationVersions(quotation.id),
    enabled: quotation.status === 'REJECTED',
  });
  const versions = (versionsQuery.data ?? []).sort((a, b) => b.version - a.version);
  const isLatestKnownVersion = versions.length === 0 || versions[0]?.id === quotation.id;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
  };

  const transitionMutation = useMutation({
    mutationFn: (next: 'draft' | 'submit' | 'confirm') => {
      if (next === 'draft') return receiveQuotation(quotation.id);
      if (next === 'submit') return submitQuotationToKbi(quotation.id);
      return markQuotationFinal(quotation.id);
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectQuotation(quotation.id, { reason: rejectReason.trim() || undefined }),
    onSuccess: () => {
      setRejectExpanded(false);
      invalidate();
    },
  });

  const status = quotation.status;
  const canReject = status === 'REQUEST_FOR_QUOTATION' || status === 'DRAFT' || status === 'PENDING_APPROVAL';
  const total = quotationDisplayTotal(quotation);
  const chargeLines = quotation.charge_lines ?? [];
  const events = quotation.events ?? [];
  const chargesToggleLabel = chargesExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges');
  const finalLifecycleStatus: QuotationStatusV1 = status === 'REJECTED' ? 'REJECTED' : 'CONFIRMED';
  const lifecycleSteps: QuotationStatusV1[] = [
    'REQUEST_FOR_QUOTATION',
    'DRAFT',
    'PENDING_APPROVAL',
    finalLifecycleStatus,
  ];
  const activeLifecycleIndex = Math.max(
    0,
    status === 'REJECTED' ? lifecycleSteps.length - 1 : lifecycleSteps.findIndex((step) => step === status),
  );

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
                  {quotation.customer_ref ?? '—'}
                </Text>
              </div>
            </Group>
            <div className="rfq-detail-total">
              <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                {t('quotations.total')}
              </Text>
              <Text fw={900} size="xl" className="tabular-nums">
                {formatMoney(total, quotation.currency_code)}
              </Text>
            </div>
          </Group>
        </div>

        <div className="rfq-detail-fact-strip">
          <FieldPair className="rfq-fact" label={t('quotations.customer')} value={quotation.customer_ref ?? '—'} />
          <FieldPair className="rfq-fact" label={t('quotations.incoterm')} value={quotation.incoterm_code ?? '—'} />
          <FieldPair className="rfq-fact" label={t('quotations.mode')} value={quotation.mode ?? '—'} />
          <FieldPair className="rfq-fact" label={t('quotations.currency')} value={quotation.currency_code ?? '—'} />
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
        <Paper withBorder p={0} className="rfq-breakdown-panel">
          <div className="rfq-panel-head">
            <div>
              <Text fw={800}>{t('quotations.chargeBreakdown')}</Text>
              <Text size="xs" c="dimmed" className="rfq-breakdown-meta">
                {t('quotations.chargeLinesCount', { count: chargeLines.length })}
              </Text>
            </div>
            <Tooltip label={chargesToggleLabel}>
              <ActionIcon
                aria-expanded={chargesExpanded}
                aria-label={chargesToggleLabel}
                className="rfq-breakdown-toggle"
                variant="light"
                onClick={() => setChargesExpanded((current) => !current)}
              >
                <IconChevronDown
                  className={chargesExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'}
                  size={18}
                />
              </ActionIcon>
            </Tooltip>
          </div>

          <Collapse expanded={chargesExpanded}>
            {chargeLines.length === 0 ? (
              <div className="rfq-empty-lines">
                <Text c="dimmed" size="sm">{t('quotations.noChargeLines')}</Text>
              </div>
            ) : (
              <div className="rfq-table-scroll">
                <Table highlightOnHover className="rfq-charge-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('quotations.chargeBreakdown')}</Table.Th>
                      <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
                      <Table.Th>{t('forms.unit')}</Table.Th>
                      <Table.Th ta="right">{t('quotations.unitPrice')}</Table.Th>
                      <Table.Th ta="right">{t('forms.taxAmount')}</Table.Th>
                      <Table.Th ta="right">
                        {t('quotations.moneyCurrencyHeader', { currency: quotation.currency_code ?? '—' })}
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {chargeLines.map((line) => {
                      const quantity = Number(line.quantity ?? 0);
                      const unitPrice = Number(line.unit_price ?? 0);
                      const taxAmount = Number(line.tax_amount ?? 0);
                      const lineTotal = Number(line.total_amount ?? line.amount ?? 0);

                      return (
                      <Table.Tr key={line.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">{formatChargeDescription(line.description ?? line.charge_type)}</Text>
                          {line.note ? (
                            <Text size="xs" c="dimmed">{line.note}</Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td ta="right" className="tabular-nums">
                          {Number.isFinite(quantity) ? new Intl.NumberFormat().format(quantity) : '-'}
                        </Table.Td>
                        <Table.Td>{line.unit ?? '—'}</Table.Td>
                        <Table.Td ta="right" className="tabular-nums">
                          {Number.isFinite(unitPrice) ? formatAmount(unitPrice, quotation.currency_code) : '-'}
                        </Table.Td>
                        <Table.Td ta="right" className="tabular-nums">
                          {Number.isFinite(taxAmount) ? formatAmount(taxAmount, quotation.currency_code) : '-'}
                        </Table.Td>
                        <Table.Td ta="right" className="tabular-nums">
                          {Number.isFinite(lineTotal) ? formatAmount(lineTotal, quotation.currency_code) : '-'}
                        </Table.Td>
                      </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            <div className="rfq-breakdown-total">
              <Text fw={800}>{t('quotations.total')}</Text>
              <Text fw={900} className="tabular-nums">{formatMoney(total, quotation.currency_code)}</Text>
            </div>
          </Collapse>
        </Paper>

        <aside className="rfq-detail-side">
          <Paper withBorder p={0} className="rfq-action-panel">
            <div className="rfq-panel-head">
              <div>
                <Text fw={800}>{t('quotations.actions')}</Text>
                <Text size="xs" c="dimmed">
                  {statusLabel(status)}
                </Text>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="rfq-lifecycle-steps" aria-label={t('quotations.lifecycle')}>
              {lifecycleSteps.map((step, index) => {
                const stepState =
                  index < activeLifecycleIndex ? 'done' : index === activeLifecycleIndex ? 'active' : 'future';
                return (
                  <div className="rfq-lifecycle-step" data-state={stepState} key={`${step}-${index}`}>
                    <span className="rfq-lifecycle-dot" aria-hidden="true" />
                    <Text size="xs" fw={700}>
                      {statusLabel(step)}
                    </Text>
                  </div>
                );
              })}
            </div>

            <div className="rfq-action-body">
              {status === 'CONFIRMED' ? (
                <Button
                  fullWidth
                  leftSection={<IconShoppingCart size={16} />}
                  onClick={() => navigate(`/purchase-orders?create=1&fromQuotation=${quotation.id}`)}
                >
                  {t('quotations.createPo')}
                </Button>
              ) : status === 'REJECTED' ? (
                <Stack gap="sm">
                  {onRevise && (!versionsQuery.isSuccess || isLatestKnownVersion) ? (
                    <Button
                      fullWidth
                      leftSection={<IconEdit size={16} />}
                      onClick={() => onRevise(quotation)}
                    >
                      {t('quotations.actionRevise')}
                    </Button>
                  ) : null}
                  <Text size="xs" c="dimmed">
                    {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {status === 'REQUEST_FOR_QUOTATION' ? (
                    <Button
                      fullWidth
                      leftSection={<IconFileInvoice size={16} />}
                      loading={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate('draft')}
                    >
                      {t('quotations.actionStartDraft')}
                    </Button>
                  ) : null}
                  {status === 'DRAFT' ? (
                    <Button
                      fullWidth
                      leftSection={<IconSend size={16} />}
                      loading={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate('submit')}
                    >
                      {t('quotations.actionSubmitApproval')}
                    </Button>
                  ) : null}
                  {status === 'PENDING_APPROVAL' ? (
                    <Button
                      fullWidth
                      leftSection={<IconCheck size={16} />}
                      loading={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate('confirm')}
                    >
                      {t('quotations.actionConfirm')}
                    </Button>
                  ) : null}
                  {canReject ? (
                    <div className="rfq-reject-box">
                      <Button
                        fullWidth
                        color="red"
                        variant={rejectExpanded ? 'filled' : 'light'}
                        leftSection={<IconX size={16} />}
                        onClick={() => setRejectExpanded((current) => !current)}
                      >
                        {t('quotations.actionReject')}
                      </Button>
                      <Collapse expanded={rejectExpanded}>
                        <div className="rfq-reject-fields">
                          <Textarea
                            label={t('quotations.rejectReason')}
                            placeholder={t('quotations.rejectReasonPlaceholder')}
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.currentTarget.value)}
                            autosize
                            minRows={2}
                          />
                          <Button
                            fullWidth
                            color="red"
                            variant="light"
                            leftSection={<IconX size={16} />}
                            loading={rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate()}
                            mt="xs"
                          >
                            {t('quotations.actionReject')}
                          </Button>
                        </div>
                      </Collapse>
                    </div>
                  ) : null}
                  <Text size="xs" c="dimmed">
                    {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
                  </Text>
                </Stack>
              )}
            </div>
          </Paper>

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
                          {formatMoney(quotationDisplayTotal(v), v.currency_code)}
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
                      <Text fw={700} size="sm">{formatEventType(event.event_type)}</Text>
                      <DateTimeText value={event.event_at} size="xs" c="dimmed" />
                      {event.old_status || event.new_status ? (
                        <Text size="xs" c="dimmed">
                          {event.old_status ? statusLabel(event.old_status) : '—'} →{' '}
                          {event.new_status ? statusLabel(event.new_status) : '—'}
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
