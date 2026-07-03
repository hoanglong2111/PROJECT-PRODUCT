import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchQuotationsV1, type QuotationV1 } from '@shared/api/quotations';
import { BackActionButton } from '@shared/components/BackActionButton';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
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
const CREATE_PARAM = 'create';
const REVISE_PARAM = 'revise';

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
  const focusedQuote = searchParams.get(QUOTE_PARAM);
  const createRequested = searchParams.get(CREATE_PARAM) === '1';
  const reviseQuote = searchParams.get(REVISE_PARAM);

  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const search = useQuotationsUiStore((s) => s.search);
  const typeFilter = useQuotationsUiStore((s) => s.typeFilter);
  const supplierFilter = useQuotationsUiStore((s) => s.supplierFilter);
  const modeFilter = useQuotationsUiStore((s) => s.modeFilter);
  const createdFrom = useQuotationsUiStore((s) => s.createdFrom);
  const createdTo = useQuotationsUiStore((s) => s.createdTo);
  const validFrom = useQuotationsUiStore((s) => s.validFrom);
  const validTo = useQuotationsUiStore((s) => s.validTo);

  const quotationsQuery = useQuery({
    queryKey: queryKeys.quotations,
    queryFn: () => fetchQuotationsV1({ page: 1, limit: 100 }),
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
      const matchesMode = modeFilter === 'all' || quotation.mode === modeFilter;
      const matchesCreated = inDateRange(quotation.create_at, createdFrom, createdTo);
      const matchesValid = inDateRange(quotation.valid_until, validFrom, validTo);
      return matchesTab && matchesSearch && matchesType && matchesSupplier && matchesMode && matchesCreated && matchesValid;
    });
  }, [quotations, activeTab, search, typeFilter, supplierFilter, modeFilter, createdFrom, createdTo, validFrom, validTo]);

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
        { all: 0, rfq: 0, draft: 0, pending: 0, confirmed: 0, rejected: 0 },
      ),
    [quotations],
  );

  const findQuotation = (value: string | null): QuotationV1 | null => {
    if (!value) return null;
    return quotations.find((quotation) => quotation.id === value || quotation.quotation_no === value) ?? null;
  };
  const selectedQuotation = findQuotation(focusedQuote);
  const formSource = findQuotation(reviseQuote);
  const showForm = createRequested || Boolean(formSource);
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
        nextParams.delete(CREATE_PARAM);
        nextParams.delete(REVISE_PARAM);
      },
      { replace: true },
    );
  };

  const openQuotation = (quotation: QuotationV1, options: { replace?: boolean } = {}) => {
    updateWorkbenchParams(
      (nextParams) => {
        nextParams.set(QUOTE_PARAM, quotation.quotation_no);
        nextParams.delete(CREATE_PARAM);
        nextParams.delete(REVISE_PARAM);
      },
      options,
    );
  };

  const openCreateForm = () => {
    updateWorkbenchParams((nextParams) => {
      nextParams.set(CREATE_PARAM, '1');
      nextParams.delete(QUOTE_PARAM);
      nextParams.delete(REVISE_PARAM);
    });
  };

  const openReviseForm = (quotation: QuotationV1) => {
    updateWorkbenchParams((nextParams) => {
      nextParams.set(REVISE_PARAM, quotation.id);
      nextParams.delete(QUOTE_PARAM);
      nextParams.delete(CREATE_PARAM);
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
        <Group justify="space-between" align="flex-start" className="quotations-page-header dl-page-header">
          <div className="quotations-page-title dl-page-title-block">
            <Title order={1}>{t('quotations.title')}</Title>
            <Text c="dimmed" mt={4}>
              {t('quotations.subtitle')}
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap" className="quotations-page-actions dl-page-actions">
            <Button
              className="quotations-primary-action"
              leftSection={<IconPlus size={16} />}
              onClick={openCreateForm}
            >
              {t('quotations.newQuotation')}
            </Button>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" align="center" gap="md" className="quotations-subheader dl-page-header">
          <Group gap="xs" align="center" wrap="wrap">
            <BackActionButton className="quotations-back-action" onClick={closeWorkbench} />
            {selectedQuotation ? (
              <>
                <Text c="dimmed" size="sm">/</Text>
                <Text fw={600} size="sm">{selectedQuotation.quotation_no}</Text>
              </>
            ) : (
              <>
                <Text c="dimmed" size="sm">/</Text>
                <Text fw={600} size="sm">{formSource ? t('quotations.reviseTitle') : t('quotations.newQuotation')}</Text>
              </>
            )}
          </Group>
        </Group>
      )}

      {showForm ? (
        <QuotationForm
          sourceQuotation={formSource ?? undefined}
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
