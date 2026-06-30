import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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

export function Quotations() {
  const { t } = useI18n();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formSource, setFormSource] = useState<QuotationV1 | null>(null);

  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const search = useQuotationsUiStore((s) => s.search);

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
      return matchesTab && matchesSearch;
    });
  }, [quotations, activeTab, search]);

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

  const selectedQuotation: QuotationV1 | null =
    selectedId === null ? null : quotations.find((quotation) => quotation.id === selectedId) ?? null;

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

  const showList = view === 'list' && !selectedQuotation;
  const closeWorkbench = () => {
    setView('list');
    setSelectedId(null);
    setFormSource(null);
  };

  const handleRevise = (q: QuotationV1) => {
    setFormSource(q);
    setView('form');
  };

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
              onClick={() => {
                setSelectedId(null);
                setFormSource(null);
                setView('form');
              }}
            >
              {t('quotations.newQuotation')}
            </Button>
          </Group>
        </Group>
      ) : (
        <Group justify="flex-start" className="quotations-subheader dl-page-header">
          <BackActionButton className="quotations-back-action" onClick={closeWorkbench} />
        </Group>
      )}

      {view === 'form' ? (
        <QuotationForm
          sourceQuotation={formSource ?? undefined}
          onCancel={closeWorkbench}
          onCreated={(quotation) => {
            setFormSource(null);
            setView('list');
            setSelectedId(quotation.id);
          }}
        />
      ) : selectedQuotation ? (
        <QuotationDetail
          quotation={selectedQuotation}
          onBack={closeWorkbench}
          onRevise={handleRevise}
          onInspectVersion={(v) => setSelectedId(v.id)}
        />
      ) : (
        <QuotationListView
          filteredQuotations={filteredQuotations}
          tabCounts={tabCounts}
          onInspect={(quotation) => setSelectedId(quotation.id)}
        />
      )}
    </Stack>
  );
}
