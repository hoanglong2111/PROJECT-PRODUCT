import { Button, Stack } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchQuotationV1, fetchQuotationsV1, type QuotationV1 } from '@shared/api/quotations';
import { fetchQuotationRequest, fetchQuotationRequests } from '@shared/api/quotationRequests';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { WorkbenchHeader } from '@shared/components/WorkbenchHeader';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { buildTabCounts } from '@shared/lib/tabCounts';

import { QuotationDetail } from './components/QuotationDetail';
import { QuotationForm } from './components/QuotationForm';
import { QuotationListView } from './components/QuotationListView';
import { RfqQuotationPickerModal } from './components/RfqQuotationPickerModal';
import {
  quotationStatusTabs,
  quotationTabItems,
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
  const [pickerOpen, setPickerOpen] = useState(false);
  // Holds a just-created/revised quotation so its detail renders immediately,
  // without waiting for the list query to refetch (which would flash the list view).
  const [createdQuotation, setCreatedQuotation] = useState<QuotationV1 | null>(null);

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
  const rfqPickerQuery = useQuery({
    queryKey: queryKeys.quotationRequestsList({ status: '', page: 1, limit: 100 }),
    queryFn: () => fetchQuotationRequests({ page: 1, limit: 100 }),
    enabled: pickerOpen,
  });
  const quotations = quotationsQuery.data?.data ?? EMPTY_QUOTATIONS;
  const standaloneQuotations = useMemo(
    () =>
      quotations
        .filter((quotation) => quotation.ref_type == null)
        .sort((left, right) => String(right.create_at || '').localeCompare(String(left.create_at || ''))),
    [quotations],
  );
  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return standaloneQuotations.filter((quotation) => {
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
  }, [standaloneQuotations, activeTab, search, typeFilter, supplierFilter, createdFrom, createdTo]);

  const tabCounts = useMemo(
    () =>
      buildTabCounts(
        standaloneQuotations,
        quotationTabItems.map((tab) => tab.value),
        quotationStatusTabs,
        (quotation) => quotation.status,
      ),
    [standaloneQuotations],
  );

  const findQuotation = (value: string | null): QuotationV1 | null => {
    if (!value) return null;
    const fromList = standaloneQuotations.find((quotation) => quotation.id === value || quotation.quotation_no === value);
    if (fromList) return fromList;
    // Fall back to the just-created quotation before the list query has refetched.
    if (createdQuotation && (createdQuotation.id === value || createdQuotation.quotation_no === value)) {
      return createdQuotation;
    }
    return null;
  };
  const selectedQuotation = findQuotation(focusedQuote);
  const selectedQuotationId = selectedQuotation?.id ?? null;
  const quotationDetailQuery = useQuery({
    queryKey: queryKeys.quotationDetail(selectedQuotationId ?? 'none'),
    queryFn: () => fetchQuotationV1(selectedQuotationId as string),
    enabled: Boolean(selectedQuotationId),
    initialData: selectedQuotation ?? undefined,
  });
  const formSource = findQuotation(reviseQuote);
  const isCreateFromRfq = Boolean(createRfqId);
  const showForm = Boolean(formSource) || isCreateFromRfq;
  const showList = !showForm && !selectedQuotation;

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of standaloneQuotations) {
      if (q.supplier_id) map.set(q.supplier_id, q.supplier?.supplier_name ?? q.supplier_id);
    }
    return [...map].map(([value, label]) => ({ value, label }));
  }, [standaloneQuotations]);

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

  const openCreateFromPickedRfq = (rfqId: string) => {
    if (!rfqId) return;
    updateWorkbenchParams((nextParams) => {
      nextParams.set(CREATE_PARAM, '1');
      nextParams.set(RFQ_PARAM, rfqId);
      nextParams.delete(QUOTE_PARAM);
      nextParams.delete(VIEW_PARAM);
      nextParams.delete(REVISE_PARAM);
    });
    setPickerOpen(false);
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
      <RfqQuotationPickerModal
        opened={pickerOpen}
        requests={rfqPickerQuery.data?.data ?? []}
        isLoading={rfqPickerQuery.isLoading || rfqPickerQuery.isFetching}
        onClose={() => setPickerOpen(false)}
        onConfirm={openCreateFromPickedRfq}
      />

      {showList ? (
        <PageHeader
          className="quotations-page-header"
          titleClassName="quotations-page-title"
          actionsClassName="quotations-page-actions"
          title={t('quotations.title')}
          subtitle={t('quotations.subtitle')}
          actions={
            <Button
              className="quotations-primary-action"
              leftSection={<IconPlus size={16} />}
              onClick={() => setPickerOpen(true)}
              loading={pickerOpen && rfqPickerQuery.isLoading}
            >
              {t('quotations.createFromRfq')}
            </Button>
          }
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
            setCreatedQuotation(quotation);
            openQuotation(quotation, { replace: true });
          }}
        />
      ) : selectedQuotation ? (
        <QuotationDetail
          quotation={quotationDetailQuery.data ?? selectedQuotation}
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
