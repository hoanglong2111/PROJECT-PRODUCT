import { Alert, Badge, Button, Modal, Skeleton, TextInput, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconExternalLink, IconInbox, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { buildRfqRouteLabel, receiveQuotationRequest } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { FilterSegment } from '@shared/components/FilterSegment';
import { ModalTitle } from '@shared/components/ModalTitle';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';

import { rfqStatusColor } from '../../quotation-requests/model/quotationRequestModel';

type StatusFilter = 'all' | 'submitted' | 'received';

/** Non-deleted quotations linked to an RFQ, bucketed by workflow status. */
export type LinkedQuotationSummary = {
  draft: number;
  inReview: number;
  confirmed: number;
  rejected: number;
  total: number;
  /** Quotations that are not rejected — the count that drives the duplicate-draft warning. */
  active: number;
};

export function summarizeLinkedQuotations(request: QuotationRequestV1): LinkedQuotationSummary {
  const summary: LinkedQuotationSummary = { draft: 0, inReview: 0, confirmed: 0, rejected: 0, total: 0, active: 0 };
  for (const quotation of request.quotations ?? []) {
    summary.total += 1;
    switch (quotation.status) {
      case 'DRAFT':
        summary.draft += 1;
        break;
      case 'PENDING_APPROVAL':
      case 'PENDING_ADJUSTMENT':
        summary.inReview += 1;
        break;
      case 'CONFIRMED':
        summary.confirmed += 1;
        break;
      case 'REJECTED':
        summary.rejected += 1;
        break;
      default:
        break;
    }
  }
  summary.active = summary.total - summary.rejected;
  return summary;
}

/** RFQ statuses that can be turned into a quotation. */
export function isEligibleRfq(request: QuotationRequestV1): boolean {
  return request.status === 'SUBMITTED' || request.status === 'RECEIVED';
}

/** Eligible RFQs, newest first (by create_at). */
export function eligibleRfqs(requests: QuotationRequestV1[]): QuotationRequestV1[] {
  return requests
    .filter(isEligibleRfq)
    .sort((left, right) => String(right.create_at || '').localeCompare(String(left.create_at || '')));
}

/** Case-insensitive match across the RFQ's identifying, commercial and routing fields. */
export function rfqMatchesSearch(request: QuotationRequestV1, search: string): boolean {
  const normalized = search.toLowerCase().trim();
  if (!normalized) return true;
  return [
    request.rfq_no,
    request.customer_ref,
    request.customer_po_ref,
    request.customer_contract_ref,
    request.supplier?.supplier_code,
    request.supplier?.supplier_name,
    request.origin_port,
    request.destination_port,
    request.mode,
    request.incoterm_code,
    request.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
function formatMetric(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return numberFormatter.format(parsed);
}

export type RfqQuotationPickerModalProps = {
  opened: boolean;
  requests: QuotationRequestV1[];
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (rfqId: string) => void;
};

export function RfqQuotationPickerModal({
  opened,
  requests,
  isLoading,
  onClose,
  onConfirm,
}: RfqQuotationPickerModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  const receiveMutation = useMutation({
    mutationFn: (rfqId: string) => receiveQuotationRequest(rfqId),
    onSuccess: (_data, rfqId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onConfirm(rfqId);
    },
  });

  const eligible = useMemo(() => eligibleRfqs(requests), [requests]);

  const counts = useMemo(
    () => ({
      all: eligible.length,
      submitted: eligible.filter((request) => request.status === 'SUBMITTED').length,
      received: eligible.filter((request) => request.status === 'RECEIVED').length,
    }),
    [eligible],
  );

  const visibleRfqs = useMemo(
    () =>
      eligible.filter((request) => {
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'submitted' && request.status === 'SUBMITTED') ||
          (statusFilter === 'received' && request.status === 'RECEIVED');
        return matchesStatus && rfqMatchesSearch(request, search);
      }),
    [eligible, statusFilter, search],
  );

  // Reset the picker each time it opens so the user starts from a clean state.
  useEffect(() => {
    if (opened) {
      setSearch('');
      setStatusFilter('all');
      receiveMutation.reset();
    }
    // receiveMutation.reset is stable; excluded to avoid re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Keep a valid selection: default to the newest eligible RFQ, and recover if the
  // current selection drops out of the list (e.g. after data refetch).
  useEffect(() => {
    if (eligible.length === 0) {
      if (selectedRfqId !== null) setSelectedRfqId(null);
      return;
    }
    const stillListed = eligible.some((request) => request.id === selectedRfqId);
    if (!stillListed) setSelectedRfqId(eligible[0].id);
  }, [eligible, selectedRfqId]);

  const selectedRfq =
    eligible.find((request) => request.id === selectedRfqId) ?? null;

  const statusOptions = [
    { value: 'all', label: t('quotationRequests.tabAll'), count: counts.all },
    { value: 'submitted', label: t('quotationRequests.tabSubmitted'), count: counts.submitted, color: rfqStatusColor('SUBMITTED') },
    { value: 'received', label: t('quotationRequests.tabReceived'), count: counts.received, color: rfqStatusColor('RECEIVED') },
  ];

  const selectedIsSubmitted = selectedRfq?.status === 'SUBMITTED';

  const handleConfirm = () => {
    if (selectedRfq) onConfirm(selectedRfq.id);
  };

  const handleReceiveAndQuote = () => {
    if (selectedRfq) receiveMutation.mutate(selectedRfq.id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="min(1120px, calc(100vw - 32px))"
      classNames={{
        content: 'rfq-picker-modal-content',
        body: 'rfq-picker-modal-body',
        header: 'rfq-picker-modal-header',
      }}
      title={
        <ModalTitle
          feature="quotations"
          title={t('quotations.pickRfqTitle')}
          subtitle={t('quotations.pickRfqSubtitle')}
        />
      }
    >
      <div className="rfq-picker-shell">
        <div className="rfq-picker-summary">
          <span className="rfq-picker-summary__metric">
            <span className="rfq-picker-summary__value tabular-nums">{counts.all}</span>
            <span className="rfq-picker-summary__label">{t('quotations.availableRfqs')}</span>
          </span>
          <span className="rfq-picker-summary__metric">
            <Badge color={rfqStatusColor('SUBMITTED')} variant="light" radius="sm">
              {counts.submitted} {t('quotationRequests.tabSubmitted')}
            </Badge>
          </span>
          <span className="rfq-picker-summary__metric">
            <Badge color={rfqStatusColor('RECEIVED')} variant="light" radius="sm">
              {counts.received} {t('quotationRequests.tabReceived')}
            </Badge>
          </span>
        </div>

        <div className="rfq-picker-toolbar">
          <TextInput
            className="rfq-picker-search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
          />
          <FilterSegment
            ariaLabel={t('quotations.availableRfqs')}
            options={statusOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />
        </div>

        <div className="rfq-picker-layout">
          <div className="rfq-picker-list" role="listbox" aria-label={t('quotations.availableRfqs')}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div className="rfq-picker-row rfq-picker-row--skeleton" key={index}>
                  <Skeleton height={14} width="42%" radius="sm" />
                  <Skeleton height={10} width="70%" radius="sm" mt={10} />
                  <Skeleton height={10} width="55%" radius="sm" mt={6} />
                </div>
              ))
            ) : eligible.length === 0 ? (
              <div className="rfq-picker-empty">
                <IconInbox size={28} stroke={1.6} />
                <p className="rfq-picker-empty__title">{t('quotations.noEligibleRfqTitle')}</p>
                <p className="rfq-picker-empty__desc">{t('quotations.noEligibleRfqDescription')}</p>
              </div>
            ) : visibleRfqs.length === 0 ? (
              <div className="rfq-picker-empty">
                <IconSearch size={28} stroke={1.6} />
                <p className="rfq-picker-empty__title">{t('quotations.noRfqMatchTitle')}</p>
                <p className="rfq-picker-empty__desc">{t('quotations.noRfqMatchDescription')}</p>
              </div>
            ) : (
              visibleRfqs.map((request) => {
                const selected = request.id === selectedRfq?.id;
                return (
                  <UnstyledButton
                    key={request.id}
                    type="button"
                    className="rfq-picker-row"
                    data-selected={selected ? 'true' : undefined}
                    role="option"
                    aria-selected={selected}
                    onClick={() => setSelectedRfqId(request.id)}
                  >
                    <div className="rfq-picker-row__head">
                      <span className="rfq-picker-row__no">{request.rfq_no}</span>
                      <Badge color={rfqStatusColor(request.status)} variant="light" radius="sm" size="sm">
                        {t(`quotationRequests.status.${request.status}` as never)}
                      </Badge>
                    </div>
                    <div className="rfq-picker-row__route">{buildRfqRouteLabel(request)}</div>
                    <div className="rfq-picker-row__meta">
                      <span>{request.customer_ref ?? '—'}</span>
                      <span className="rfq-picker-row__dot" aria-hidden="true">•</span>
                      <span>{request.supplier?.supplier_name ?? request.supplier?.supplier_code ?? '—'}</span>
                      {request.mode ? (
                        <>
                          <span className="rfq-picker-row__dot" aria-hidden="true">•</span>
                          <span>{request.mode}</span>
                        </>
                      ) : null}
                    </div>
                  </UnstyledButton>
                );
              })
            )}
          </div>

          <div className="rfq-picker-preview">
            {isLoading ? (
              <div className="rfq-picker-preview__body">
                <Skeleton height={18} width="50%" radius="sm" />
                <Skeleton height={12} width="80%" radius="sm" mt={16} />
                <Skeleton height={12} width="65%" radius="sm" mt={8} />
                <Skeleton height={72} width="100%" radius="sm" mt={16} />
              </div>
            ) : selectedRfq ? (
              <RfqPreview
                request={selectedRfq}
                isReceiving={receiveMutation.isPending}
                receiveFailed={receiveMutation.isError}
                onReceiveAndQuote={handleReceiveAndQuote}
              />
            ) : (
              <div className="rfq-picker-preview__empty">
                <IconArrowRight size={26} stroke={1.6} />
                <p className="rfq-picker-empty__title">{t('quotations.pickRfqEmptyPreviewTitle')}</p>
                <p className="rfq-picker-empty__desc">{t('quotations.pickRfqEmptyPreviewDescription')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rfq-picker-footer">
          {selectedIsSubmitted ? (
            <span className="rfq-picker-footer__hint">{t('quotations.rfqNotReceivedTitle')}</span>
          ) : null}
          <Button variant="default" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            leftSection={<IconArrowRight size={16} />}
            disabled={!selectedRfq || selectedIsSubmitted || receiveMutation.isPending}
            onClick={handleConfirm}
          >
            {t('quotations.createFromRfq')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RfqPreview({
  request,
  isReceiving,
  receiveFailed,
  onReceiveAndQuote,
}: {
  request: QuotationRequestV1;
  isReceiving: boolean;
  receiveFailed: boolean;
  onReceiveAndQuote: () => void;
}) {
  const { t } = useI18n();
  const weight = formatMetric(request.gross_weight_kg);
  const cbm = formatMetric(request.volume_cbm);
  const chargeableWeight = formatMetric(request.chargeable_weight_kg);
  const revenueTon = formatMetric(request.chargeable_revenue_ton);
  const lineCount = request.lines?.length ?? 0;
  const packageCount = request.packages?.length ?? 0;
  const containerCount = request.containers?.length ?? 0;
  const linked = summarizeLinkedQuotations(request);
  const linkedQuotations = useMemo(
    () =>
      [...(request.quotations ?? [])].sort((left, right) =>
        String(right.create_at || '').localeCompare(String(left.create_at || '')),
      ),
    [request.quotations],
  );
  const isSubmitted = request.status === 'SUBMITTED';

  return (
    <div className="rfq-picker-preview__body">
      <div className="rfq-picker-preview__head">
        <div className="rfq-picker-preview__title">
          <span className="rfq-picker-preview__no">{request.rfq_no}</span>
          <a
            className="rfq-picker-preview__open"
            href={`/quotation-requests?view=${request.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('quotations.openRfq')}
            <IconExternalLink size={13} stroke={1.8} />
          </a>
        </div>
        <Badge color={rfqStatusColor(request.status)} variant="light" radius="sm">
          {t(`quotationRequests.status.${request.status}` as never)}
        </Badge>
      </div>

      <dl className="rfq-picker-facts">
        <PreviewFact label={t('quotationRequests.field.customerRef')} value={request.customer_ref} />
        <PreviewFact
          label={t('quotationRequests.field.supplier')}
          value={request.supplier?.supplier_name ?? request.supplier?.supplier_code}
        />
        <PreviewFact label={t('quotationRequests.field.route')} value={buildRfqRouteLabel(request)} />
        <PreviewFact label={t('quotationRequests.field.mode')} value={request.mode} />
        <PreviewFact label={t('quotationRequests.field.incoterm')} value={request.incoterm_code} />
        <PreviewFact
          label={t('quotationRequests.field.readyDate')}
          value={request.desired_cargo_ready_date ? formatDate(request.desired_cargo_ready_date) : null}
        />
      </dl>

      {(weight || cbm || chargeableWeight || revenueTon) ? (
        <div className="rfq-picker-preview__section">
          <span className="rfq-picker-preview__section-title">{t('quotations.rfqSummaryCargo')}</span>
          <div className="rfq-picker-chips">
            {weight ? <span className="rfq-picker-chip tabular-nums">{weight} {t('quotationRequests.field.weight')}</span> : null}
            {cbm ? <span className="rfq-picker-chip tabular-nums">{cbm} {t('quotationRequests.field.volume')}</span> : null}
            {chargeableWeight ? (
              <span className="rfq-picker-chip tabular-nums">{chargeableWeight} {t('quotationRequests.field.chargeableWeight')}</span>
            ) : null}
            {revenueTon ? (
              <span className="rfq-picker-chip tabular-nums">{revenueTon} {t('quotationRequests.field.chargeableRevenueTon')}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {(lineCount || packageCount || containerCount) ? (
        <div className="rfq-picker-preview__section">
          <span className="rfq-picker-preview__section-title">{t('quotations.rfqSummaryPackaging')}</span>
          <div className="rfq-picker-chips">
            {lineCount ? <span className="rfq-picker-chip tabular-nums">{lineCount} lines</span> : null}
            {containerCount ? <span className="rfq-picker-chip tabular-nums">{containerCount} cntr</span> : null}
            {packageCount ? <span className="rfq-picker-chip tabular-nums">{packageCount} pkg</span> : null}
          </div>
        </div>
      ) : null}

      <div className="rfq-picker-preview__section">
        <span className="rfq-picker-preview__section-title">{t('quotations.linkedQuotationCount')}</span>
        {linkedQuotations.length > 0 ? (
          <div className="rfq-picker-quotes">
            {linkedQuotations.map((quotation) => (
              <a
                key={quotation.id}
                className="rfq-picker-quote"
                href={`/quotations?quote=${encodeURIComponent(quotation.quotation_no)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t('quotations.openQuotationDetail')}
              >
                <span className="rfq-picker-quote__no tabular-nums">{quotation.quotation_no}</span>
                <StatusBadge status={quotation.status} />
                <IconExternalLink className="rfq-picker-quote__icon" size={13} stroke={1.8} />
              </a>
            ))}
          </div>
        ) : (
          <span className="rfq-picker-preview__muted">{t('quotations.noLinkedQuotations')}</span>
        )}
      </div>

      {linked.active > 0 ? (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={16} />}
          className="rfq-picker-preview__warning"
        >
          {t('quotations.duplicateDraftWarning')
            .replace('{count}', String(linked.active))
            .replace('{next}', String(linked.active + 1))}
        </Alert>
      ) : null}

      {request.note ? <p className="rfq-picker-preview__note">{request.note}</p> : null}

      {isSubmitted ? (
        <div className="rfq-picker-preview__receive">
          <div className="rfq-picker-preview__receive-copy">
            <span className="rfq-picker-preview__receive-title">{t('quotations.rfqNotReceivedTitle')}</span>
            <span className="rfq-picker-preview__muted">{t('quotations.rfqNotReceivedDescription')}</span>
          </div>
          {receiveFailed ? (
            <span className="rfq-picker-preview__error" role="alert">{t('quotations.receiveError')}</span>
          ) : null}
          <Button
            fullWidth
            leftSection={<IconArrowRight size={16} />}
            loading={isReceiving}
            onClick={onReceiveAndQuote}
          >
            {t('quotations.receiveAndQuote')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PreviewFact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rfq-picker-fact">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}
