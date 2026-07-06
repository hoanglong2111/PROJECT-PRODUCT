import { Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchQuotationsV1, type QuotationV1 } from '@shared/api/quotations';
import { fetchQuotationRequest } from '@shared/api/quotationRequests';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { WorkbenchHeader } from '@shared/components/WorkbenchHeader';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { QuotationDetail } from './components/QuotationDetail';
import { QuotationForm } from './components/QuotationForm';
import { QuotationListView } from './components/QuotationListView';
import {
  quotationStatusTabs,
  quotationTabItems,
  type QuotationTab,
} from './model/quotationModel';
import { useQuotationsUiStore } from './model/quotationsUiStore';

const EMPTY_QUOTATIONS: QuotationV1[] = [];
const QUOTE_PARAM = 'quote';
const VIEW_PARAM = 'view';
const REVISE_PARAM = 'revise';
const CREATE_PARAM = 'create';
const RFQ_PARAM = 'rfq';

const inDateRange = (value: string | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  if (!value) return false;
  const day = value.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
};

export function Quotations() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedQuote = searchParams.get(QUOTE_PARAM) ?? searchParams.get(VIEW_PARAM);
  const reviseQuote = searchParams.get(REVISE_PARAM);
  const createRfqId = searchParams.get(CREATE_PARAM) ? searchParams.get(RFQ_PARAM) : null;

  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const search = useQuotationsUiStore((s) => s.search);
  const typeFilter = useQuotationsUiStore((s) => s.typeFilter);
  const supplierFilter = useQuotationsUiStore((s) => s.supplierFilter);
  const createdFrom = useQuotationsUiStore((s) => s.createdFrom);
  const createdTo = useQuotationsUiStore((s) => s.createdTo);

  const quotationsQuery = useQuery({
    queryKey: queryKeys.quotations,
    queryFn: () => fetchQuotationsV1({ page: 1, limit: 100 }),
  });
  const rfqQuery = useQuery({
    queryKey: queryKeys.quotationRequestDetail(createRfqId ?? 'none'),
    queryFn: () => fetchQuotationRequest(createRfqId as string),
    enabled: Boolean(createRfqId),
  });
  const quotations = quotationsQuery.data?.data ?? EMPTY_QUOTATIONS;

  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return quotations.filter((quotation) => {
      const matchesTab =
        activeTab === 'all' || quotationStatusTabs[activeTab].includes(quotation.status);
      const matchesSearch = [
        quotation.quotation_no,
        quotation.customer_ref,
        quotation.incoterm_code,
        quotation.mode,
        quotation.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || quotation.quotation_type === typeFilter;
      const matchesSupplier = !supplierFilter || quotation.supplier_id === supplierFilter;
      const matchesCreated = inDateRange(quotation.create_at, createdFrom, createdTo);
      return matchesTab && matchesSearch && matchesType && matchesSupplier && matchesCreated;
    });
  }, [quotations, activeTab, search, typeFilter, supplierFilter, createdFrom, createdTo]);

  const tabCounts = useMemo(
    () =>
      quotationTabItems.reduce<Record<QuotationTab, number>>(
        (counts, tab) => {
          if (tab.value === 'all') {
            counts[tab.value] = quotations.length;
            return counts;
          }
          const statuses = quotationStatusTabs[tab.value];
          counts[tab.value] = quotations.filter((quotation) => statuses.includes(quotation.status)).length;
          return counts;
        },
        { all: 0, draft: 0, pending: 0, confirmed: 0, rejected: 0 },
      ),
    [quotations],
  );

  const findQuotation = (value: string | null): QuotationV1 | null => {
    if (!value) return null;
    return quotations.find((quotation) => quotation.id === value || quotation.quotation_no === value) ?? null;
  };
  const selectedQuotation = findQuotation(focusedQuote);
  const formSource = findQuotation(reviseQuote);
  const isCreateFromRfq = Boolean(createRfqId);
  const showForm = Boolean(formSource) || isCreateFromRfq;
  const showList = !showForm && !selectedQuotation;

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of quotations) {
      if (q.supplier_id) map.set(q.supplier_id, q.supplier?.supplier_name ?? q.supplier_id);
    }
    return [...map].map(([value, label]) => ({ value, label }));
  }, [quotations]);

  const updateWorkbenchParams = (
    updater: (nextParams: URLSearchParams) => void,
    options: { replace?: boolean } = {},
  ) => {
    const nextParams = new URLSearchParams(searchParams);
    updater(nextParams);
    setSearchParams(nextParams, { replace: options.replace ?? false });
  };

  const closeWorkbench = () => {
    updateWorkbenchParams(
      (nextParams) => {
        nextParams.delete(QUOTE_PARAM);
        nextParams.delete(VIEW_PARAM);
        nextParams.delete(REVISE_PARAM);
        nextParams.delete(CREATE_PARAM);
        nextParams.delete(RFQ_PARAM);
      },
      { replace: true },
    );
  };

  const openQuotation = (quotation: QuotationV1, options: { replace?: boolean } = {}) => {
    updateWorkbenchParams(
      (nextParams) => {
        nextParams.set(QUOTE_PARAM, quotation.quotation_no);
        nextParams.delete(VIEW_PARAM);
        nextParams.delete(REVISE_PARAM);
        nextParams.delete(CREATE_PARAM);
        nextParams.delete(RFQ_PARAM);
      },
      options,
    );
  };

  const openReviseForm = (quotation: QuotationV1) => {
    updateWorkbenchParams((nextParams) => {
      nextParams.set(REVISE_PARAM, quotation.id);
      nextParams.delete(QUOTE_PARAM);
      nextParams.delete(VIEW_PARAM);
      nextParams.delete(CREATE_PARAM);
      nextParams.delete(RFQ_PARAM);
    });
  };

  if (quotationsQuery.isError) {
    return (
      <PageError
        title={t('quotations.errorTitle')}
        description={t('quotations.errorDescription')}
        error={quotationsQuery.error}
        onRetry={() => {
          void quotationsQuery.refetch();
        }}
      />
    );
  }

  if (quotationsQuery.isLoading) {
    return <PageLoading title={t('quotations.title')} description={t('quotations.loadingDescription')} />;
  }

  return (
    <Stack gap="lg" className="quotations-workbench">
      {showList ? (
        <PageHeader
          className="quotations-page-header"
          titleClassName="quotations-page-title"
          actionsClassName="quotations-page-actions"
          title={t('quotations.title')}
          subtitle={t('quotations.subtitle')}
        />
      ) : (
        <WorkbenchHeader
          className="quotations-subheader"
          onBack={closeWorkbench}
        />
      )}

      {isCreateFromRfq && rfqQuery.isLoading ? (
        <PageLoading title={t('quotations.formTitle')} description={t('quotationRequests.loadingDescription')} />
      ) : isCreateFromRfq && (rfqQuery.isError || !rfqQuery.data) ? (
        <PageError
          title={t('quotationRequests.errorTitle')}
          description={t('quotationRequests.errorDescription')}
          error={rfqQuery.error}
          onRetry={() => {
            void rfqQuery.refetch();
          }}
        />
      ) : showForm ? (
        <QuotationForm
          sourceQuotation={formSource ?? undefined}
          rfq={isCreateFromRfq ? rfqQuery.data : undefined}
          onCancel={closeWorkbench}
          onCreated={(quotation) => {
            openQuotation(quotation, { replace: true });
          }}
        />
      ) : selectedQuotation ? (
        <QuotationDetail
          quotation={selectedQuotation}
          onRevise={openReviseForm}
          onInspectVersion={openQuotation}
        />
      ) : (
        <QuotationListView
          filteredQuotations={filteredQuotations}
          supplierOptions={supplierOptions}
          tabCounts={tabCounts}
          onInspect={openQuotation}
        />
      )}
    </Stack>
  );
}
