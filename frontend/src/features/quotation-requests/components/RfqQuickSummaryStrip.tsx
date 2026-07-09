import { Paper, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { formatDate } from '@shared/utils/date';

import { rfqHasDraftQuotation, rfqResponseQuotations, type TFn } from '../model/quotationRequestModel';

function SummaryItem({ label, value, meta }: { label: string; value: ReactNode; meta?: ReactNode }) {
  return (
    <div className="rfq-detail-summary-item">
      <Text size="xs" c="dimmed" fw={600} className="rfq-summary-label">{label}</Text>
      <Text size="sm" fw={700}>{value}</Text>
      {meta ? <Text size="xs" c="dimmed">{meta}</Text> : null}
    </div>
  );
}

export function RfqQuickSummaryStrip({
  request,
  t,
  totalWeight,
}: {
  request: QuotationRequestV1;
  t: TFn;
  totalWeight: number;
}) {
  const responses = rfqResponseQuotations(request.quotations);
  const hasDraft = rfqHasDraftQuotation(request.quotations);
  const responseLabel = responses.length > 0
    ? t('quotationRequests.responsesCount', { count: responses.length })
    : hasDraft
      ? t('quotationRequests.draftInProgressShort')
      : t('quotationRequests.noResponse');

  return (
    <Paper
      component="section"
      withBorder
      p={0}
      className="rfq-detail-summary-strip"
      aria-label={t('quotationRequests.summaryLabel')}
    >
      <SummaryItem
        label={t('quotationRequests.field.supplier')}
        value={request.supplier ? request.supplier.supplier_code : request.supplier_id ?? '-'}
        meta={request.supplier?.supplier_name}
      />
      <SummaryItem
        label={t('quotationRequests.cargoSummary')}
        value={`${totalWeight || '-'} kg / ${request.volume_cbm ?? '-'} cbm`}
        meta={`${request.lines?.length ?? 0} ${t('quotationRequests.lines')}`}
      />
      <SummaryItem
        label={t('quotationRequests.field.readyDate')}
        value={formatDate(request.desired_cargo_ready_date)}
        meta={`${t('quotationRequests.timeline.created')}: ${formatDate(request.create_at)}`}
      />
      <SummaryItem
        label={t('quotationRequests.linkedQuotations')}
        value={responseLabel}
        meta={hasDraft && responses.length > 0 ? t('quotationRequests.draftInProgressShort') : undefined}
      />
    </Paper>
  );
}
