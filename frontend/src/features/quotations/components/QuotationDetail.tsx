import { ActionIcon, Alert, Button, Collapse, Group, Paper, Stack, Table, Text, Textarea, Title, Tooltip } from '@mantine/core';
import { IconCheck, IconChevronDown, IconFileInvoice, IconSend, IconShoppingCart, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  markQuotationFinal,
  receiveQuotation,
  rejectQuotation,
  submitQuotationToKbi,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { BackActionButton } from '@shared/components/BackActionButton';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { formatDate, formatDateTime } from '@shared/utils/date';

import { quotationTotal } from '../model/quotationModel';

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
}

function formatMoney(amount: number, currency: string | null | undefined): string {
  return `${formatAmount(amount)} ${currency ?? ''}`.trim();
}

function formatChargeDescription(value?: string | null): string {
  const description = value?.trim();
  if (!description) return '-';
  return description.startsWith('-') ? description : `- ${description}`;
}

function displayTotal(quotation: QuotationV1): number {
  const lineTotal = quotationTotal(quotation);
  if (lineTotal > 0) return lineTotal;
  const apiTotal = Number(quotation.grand_total_amount ?? quotation.total_amount ?? 0);
  return Number.isFinite(apiTotal) ? apiTotal : 0;
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
  onBack: () => void;
};

export function QuotationDetail({ quotation, onBack }: QuotationDetailProps) {
  const { t, statusLabel } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [chargesExpanded, setChargesExpanded] = useState(true);

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
    onSuccess: invalidate,
  });

  const status = quotation.status;
  const canReject = status === 'REQUEST_FOR_QUOTATION' || status === 'DRAFT' || status === 'PENDING_APPROVAL';
  const total = displayTotal(quotation);
  const chargeLines = quotation.charge_lines ?? [];
  const events = quotation.events ?? [];
  const chargesToggleLabel = chargesExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges');

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
                <BackActionButton size="xs" iconSize={14} onClick={onBack} className="rfq-back-action" />
                <Group gap="xs" align="center">
                  <Title order={3}>{quotation.quotation_no}</Title>
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
          <Fact label={t('quotations.customer')} value={quotation.customer_ref ?? '—'} />
          <Fact label={t('quotations.incoterm')} value={quotation.incoterm_code ?? '—'} />
          <Fact label={t('quotations.mode')} value={quotation.mode ?? '—'} />
          <Fact label={t('quotations.currency')} value={quotation.currency_code ?? '—'} />
          <Fact label={t('quotations.validUntil')} value={formatDate(quotation.valid_until)} />
          <Fact label={t('quotations.createdAt')} value={formatDateTime(quotation.create_at)} />
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
                      <Table.Th>{t('forms.unit')}</Table.Th>
                      <Table.Th ta="right">
                        {t('quotations.moneyCurrencyHeader', { currency: quotation.currency_code ?? '—' })}
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {chargeLines.map((line) => (
                      <Table.Tr key={line.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">{formatChargeDescription(line.description ?? line.charge_type)}</Text>
                          {line.note ? (
                            <Text size="xs" c="dimmed">{line.note}</Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>{line.unit ?? '—'}</Table.Td>
                        <Table.Td ta="right" className="tabular-nums">
                          {formatAmount(Number(line.total_amount ?? line.amount ?? 0))}
                        </Table.Td>
                      </Table.Tr>
                    ))}
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

            <div className="rfq-action-body">
              {status === 'CONFIRMED' ? (
                <Button
                  fullWidth
                  leftSection={<IconShoppingCart size={16} />}
                  onClick={() => navigate(`/purchase-orders?create=1&fromQuotation=${quotation.id}`)}
                >
                  {t('quotations.createPo')}
                </Button>
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
                  ) : null}
                  <Text size="xs" c="dimmed">
                    {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
                  </Text>
                </Stack>
              )}
            </div>
          </Paper>

          <Paper withBorder p={0} className="rfq-timeline-panel">
            <div className="rfq-panel-head">
              <div>
                <Text fw={800}>{t('quotations.lifecycle')}</Text>
                <Text size="xs" c="dimmed">
                  {formatDateTime(quotation.update_at)}
                </Text>
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
                      <Text size="xs" c="dimmed">
                        {formatDateTime(event.event_at)}
                      </Text>
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

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rfq-fact">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </div>
  );
}
