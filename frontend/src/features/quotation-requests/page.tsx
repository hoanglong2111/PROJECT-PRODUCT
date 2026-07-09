import { Button, Stack } from '@mantine/core';
import { IconFileInvoice, IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchQuotationRequest, fetchQuotationRequests, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import { QuotationRequestDetail } from './components/QuotationRequestDetail';
import { QuotationRequestForm } from './components/QuotationRequestForm';
import { QuotationRequestListView } from './components/QuotationRequestListView';
import type { QuotationRequestTab } from './model/quotationRequestModel';

const EMPTY_REQUESTS: QuotationRequestV1[] = [];
const CREATE_PARAM = 'create';
const VIEW_PARAM = 'view';
const COPY_FROM_PARAM = 'copyFrom';

export function QuotationRequests() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<QuotationRequestTab>('all');
  const createRequested = searchParams.get(CREATE_PARAM) === '1';
  const focusedRequest = searchParams.get(VIEW_PARAM);
  const copyFromRequestId = searchParams.get(COPY_FROM_PARAM);

  const requestsQuery = useQuery({
    queryKey: queryKeys.quotationRequestsList({ page: 1, limit: 100 }),
    queryFn: () => fetchQuotationRequests({ page: 1, limit: 100 }),
  });
  const requests = requestsQuery.data?.data ?? EMPTY_REQUESTS;
  const copySourceQuery = useQuery({
    queryKey: copyFromRequestId ? queryKeys.quotationRequestDetail(copyFromRequestId) : ['quotation-request-copy-source', 'empty'],
    queryFn: () => fetchQuotationRequest(copyFromRequestId as string),
    enabled: createRequested && Boolean(copyFromRequestId),
  });

  const closeWorkbench = () => {
    setSearchParams({}, { replace: true });
  };

  const openCreateForm = () => {
    setSearchParams({ [CREATE_PARAM]: '1' });
  };

  const openRequest = (id: string, options: { replace?: boolean } = {}) => {
    setSearchParams({ [VIEW_PARAM]: id }, { replace: options.replace ?? false });
  };

  if (requestsQuery.isError) {
    return (
      <PageError
        title={t('quotationRequests.errorTitle')}
        description={t('quotationRequests.errorDescription')}
        error={requestsQuery.error}
        onRetry={() => {
          void requestsQuery.refetch();
        }}
      />
    );
  }

  if (requestsQuery.isLoading) {
    return <PageLoading title={t('quotationRequests.title')} description={t('quotationRequests.loadingDescription')} />;
  }

  return (
    <Stack gap="lg" className="quotations-workbench">
      {!createRequested && !focusedRequest ? (
        <PageHeader
          className="quotations-page-header"
          titleClassName="quotations-page-title"
          actionsClassName="quotations-page-actions"
          icon={<IconFileInvoice size={20} />}
          title={t('quotationRequests.title')}
          subtitle={t('quotationRequests.subtitle')}
          actions={
            <Button className="quotations-primary-action" leftSection={<IconPlus size={16} />} onClick={openCreateForm}>
              {t('quotationRequests.new')}
            </Button>
          }
        />
      ) : null}

      {createRequested ? (
        copyFromRequestId && copySourceQuery.isLoading ? (
          <PageLoading title={t('quotationRequests.formTitle')} description={t('quotationRequests.loadingDescription')} />
        ) : copyFromRequestId && copySourceQuery.isError ? (
          <PageError
            title={t('quotationRequests.errorTitle')}
            description={t('quotationRequests.errorDescription')}
            error={copySourceQuery.error}
            onRetry={() => {
              void copySourceQuery.refetch();
            }}
          />
        ) : (
          <QuotationRequestForm
            source={copySourceQuery.data}
            onCancel={closeWorkbench}
            onCreated={(request) => {
              openRequest(request.id, { replace: true });
            }}
          />
        )
      ) : focusedRequest ? (
        <QuotationRequestDetail requestId={focusedRequest} onBack={closeWorkbench} />
      ) : (
        <QuotationRequestListView
          requests={requests}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isLoading={requestsQuery.isFetching}
          onInspect={openRequest}
        />
      )}
    </Stack>
  );
}
