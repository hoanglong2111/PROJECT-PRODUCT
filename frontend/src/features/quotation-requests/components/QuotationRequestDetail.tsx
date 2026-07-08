import { Stack } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  cancelQuotationRequest,
  fetchQuotationRequest,
  receiveQuotationRequest,
} from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import { rfqTotalWeight } from '../model/quotationRequestModel';
import { QuotationRequestActionPanel, resolvePrimaryAction } from './RfqActionPanel';
import { ContainersPanel } from './RfqContainersPanel';
import { RfqDetailHero } from './RfqDetailHero';
import { LINKED_QUOTATIONS_SECTION_ID, LinkedQuotationsPanel } from './RfqLinkedQuotationsPanel';
import { RfqOverviewPanel } from './RfqOverviewPanel';
import { PackagesPanel } from './RfqPackagesPanel';
import { RfqQuickSummaryStrip } from './RfqQuickSummaryStrip';
import { QuoteReadinessPanel } from './RfqQuoteReadinessPanel';

type QuotationRequestDetailProps = {
  requestId: string;
  onBack: () => void;
};

export function QuotationRequestDetail({ requestId }: QuotationRequestDetailProps) {
  const { statusLabel, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: queryKeys.quotationRequestDetail(requestId),
    queryFn: () => fetchQuotationRequest(requestId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequestDetail(requestId) });
  };

  const receiveMutation = useMutation({
    mutationFn: () => receiveQuotationRequest(requestId),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelQuotationRequest(requestId),
    onSuccess: invalidate,
  });

  if (requestQuery.isLoading) {
    return <PageLoading title={t('quotationRequests.detailTitle')} description={t('quotationRequests.loadingDescription')} />;
  }

  if (requestQuery.isError || !requestQuery.data) {
    return (
      <PageError
        title={t('quotationRequests.errorTitle')}
        description={t('quotationRequests.errorDescription')}
        error={requestQuery.error}
        onRetry={() => {
          void requestQuery.refetch();
        }}
      />
    );
  }

  const request = requestQuery.data;
  const canReceive = request.status === 'SUBMITTED';
  const canCreateQuotation = request.status === 'SUBMITTED' || request.status === 'RECEIVED';
  const canCancel = request.status !== 'CONFIRMED' && request.status !== 'CANCELLED';
  const totalWeight = rfqTotalWeight(request.lines ?? []) || Number(request.gross_weight_kg ?? 0);
  const scrollToLinkedQuotations = () => {
    document.getElementById(LINKED_QUOTATIONS_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const primaryAction = resolvePrimaryAction({
    status: request.status,
    canReceive,
    canCreateQuotation,
    receiveLoading: receiveMutation.isPending,
    onReceive: () => receiveMutation.mutate(),
    onCreateQuotation: () => navigate(`/quotations?create=1&rfq=${request.id}`),
    onViewResponses: scrollToLinkedQuotations,
    t,
  });

  return (
    <Stack gap="md" className="rfq-detail">
      <RfqDetailHero
        request={request}
        t={t}
        onCopy={() => navigate(`/quotation-requests?create=1&copyFrom=${request.id}`)}
      />
      <RfqQuickSummaryStrip request={request} t={t} totalWeight={totalWeight} />

      <div className="rfq-detail-layout">
        <aside className="rfq-detail-side">
          <QuotationRequestActionPanel
            request={request}
            t={t}
            primaryAction={primaryAction}
            canCancel={canCancel}
            cancelLoading={cancelMutation.isPending}
            onCancel={() => cancelMutation.mutate()}
          />
          <QuoteReadinessPanel request={request} t={t} totalWeight={totalWeight} />
        </aside>

        <div className="rfq-detail-main">
          <RfqOverviewPanel request={request} t={t} totalWeight={totalWeight} />
          <PackagesPanel request={request} t={t} />
          <ContainersPanel request={request} t={t} />
          <LinkedQuotationsPanel
            request={request}
            t={t}
            statusLabel={statusLabel}
            onView={(quotationId) => navigate(`/quotations?view=${quotationId}`)}
          />
        </div>
      </div>
    </Stack>
  );
}
