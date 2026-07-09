import { Stack } from '@mantine/core';
import { IconClipboardList, IconFileInvoice, IconPackage } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  cancelQuotationRequest,
  fetchQuotationRequest,
  receiveQuotationRequest,
} from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { AnchoredWorkflowRail, useAnchoredWorkflowSections, type AnchoredWorkflowStep } from '@shared/components/AnchoredWorkflow';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { rfqTotalWeight } from '../model/quotationRequestModel';
import {
  QuotationRequestActionPanel,
  QuotationRequestMobileActionBar,
  resolvePrimaryAction,
} from './RfqActionPanel';
import { RfqCancelConfirmModal } from './RfqCancelConfirmModal';
import { ContainersPanel } from './RfqContainersPanel';
import { RfqDetailHero } from './RfqDetailHero';
import { LINKED_QUOTATIONS_SECTION_ID, LinkedQuotationsPanel } from './RfqLinkedQuotationsPanel';
import { RfqOverviewPanel } from './RfqOverviewPanel';
import { PackagesPanel } from './RfqPackagesPanel';
import { RfqQuickSummaryStrip } from './RfqQuickSummaryStrip';
import { QuoteReadinessPanel } from './RfqQuoteReadinessPanel';

type QuotationRequestDetailProps = {
  onBack: () => void;
  requestId: string;
};

export function QuotationRequestDetail({ onBack, requestId }: QuotationRequestDetailProps) {
  const { statusLabel, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelConfirmOpened, setCancelConfirmOpened] = useState(false);

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
    onSuccess: () => {
      invalidate();
      setCancelConfirmOpened(false);
    },
  });
  const request = requestQuery.data;
  const workflowSteps: AnchoredWorkflowStep[] = request
    ? [
      {
        id: 'rfq-detail-overview',
        label: t('quotationRequests.detailNav.overview'),
        icon: <IconClipboardList size={14} />,
      },
      {
        id: 'rfq-detail-cargo',
        label: t('quotationRequests.detailNav.cargo'),
        icon: <IconPackage size={14} />,
      },
      {
        id: LINKED_QUOTATIONS_SECTION_ID,
        label: t('quotationRequests.detailNav.responses'),
        description: t('quotationRequests.detailNav.responsesHint', { count: request.quotations?.length ?? 0 }),
        icon: <IconFileInvoice size={14} />,
      },
    ]
    : [];
  const workflowSectionIds = workflowSteps.map((step) => step.id);
  const { activeSectionId, scrollToSection } = useAnchoredWorkflowSections(workflowSectionIds);

  if (requestQuery.isLoading) {
    return <PageLoading title={t('quotationRequests.detailTitle')} description={t('quotationRequests.loadingDescription')} />;
  }

  if (requestQuery.isError || !request) {
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

  const canReceive = request.status === 'SUBMITTED';
  const canCreateQuotation = request.status === 'SUBMITTED' || request.status === 'RECEIVED';
  const canCancel = request.status !== 'CONFIRMED' && request.status !== 'CANCELLED';
  const totalWeight = rfqTotalWeight(request.lines ?? []) || Number(request.gross_weight_kg ?? 0);
  const scrollToLinkedQuotations = () => scrollToSection(LINKED_QUOTATIONS_SECTION_ID);

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
    <Stack gap="md" className="rfq-detail rfq-request-detail">
      <RfqDetailHero
        request={request}
        t={t}
        onBack={onBack}
        onCopy={() => navigate(`/quotation-requests?create=1&copyFrom=${request.id}`)}
      />
      <RfqQuickSummaryStrip request={request} t={t} totalWeight={totalWeight} />

      <div className="rfq-detail-layout quote-workflow-detail-layout">
        <aside className="rfq-detail-side quote-workflow-side">
          <AnchoredWorkflowRail
            activeStepId={activeSectionId}
            steps={workflowSteps}
            title={t('quotationRequests.workflowTitle')}
            onStepSelect={scrollToSection}
          />
          <QuotationRequestActionPanel
            request={request}
            t={t}
            primaryAction={primaryAction}
            actionError={
              receiveMutation.isError
                ? getApiErrorMessage(receiveMutation.error, t('quotationRequests.actionError'))
                : undefined
            }
            canCancel={canCancel}
            cancelLoading={cancelMutation.isPending}
            onCancel={() => {
              cancelMutation.reset();
              setCancelConfirmOpened(true);
            }}
          />
          <QuoteReadinessPanel request={request} t={t} totalWeight={totalWeight} />
        </aside>

        <div className="rfq-detail-main">
          <section id="rfq-detail-overview" className="quote-workflow-section">
            <RfqOverviewPanel request={request} t={t} totalWeight={totalWeight} />
          </section>
          <section id="rfq-detail-cargo" className="quote-workflow-section">
            <PackagesPanel request={request} t={t} />
            <ContainersPanel request={request} t={t} />
          </section>
          <LinkedQuotationsPanel
            request={request}
            t={t}
            statusLabel={statusLabel}
            onView={(quotationId) => navigate(`/quotations?view=${quotationId}`)}
          />
        </div>
      </div>

      <QuotationRequestMobileActionBar
        primaryAction={primaryAction}
        ariaLabel={t('quotationRequests.mobileActionsLabel')}
      />

      <RfqCancelConfirmModal
        opened={cancelConfirmOpened}
        rfqNo={request.rfq_no}
        error={
          cancelMutation.isError
            ? getApiErrorMessage(cancelMutation.error, t('quotationRequests.actionError'))
            : undefined
        }
        loading={cancelMutation.isPending}
        t={t}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => {
          if (!cancelMutation.isPending) {
            setCancelConfirmOpened(false);
            cancelMutation.reset();
          }
        }}
      />
    </Stack>
  );
}
