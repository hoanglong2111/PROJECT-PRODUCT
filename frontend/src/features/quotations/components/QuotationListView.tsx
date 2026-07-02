import { ActionIcon, Paper, SimpleGrid, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { IconClock, IconEye, IconFileInvoice, IconSearch, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { QuotationV1 } from '@shared/api/quotations';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { formatMoney } from '@shared/utils/money';

import {
  quotationTabItems,
  quotationDisplayTotal,
  type QuotationTab,
} from '../model/quotationModel';
import { useQuotationsUiStore } from '../model/quotationsUiStore';

type QuotationListViewProps = {
  filteredQuotations: QuotationV1[];
  tabCounts: Record<QuotationTab, number>;
  onInspect: (quotation: QuotationV1) => void;
};

export function QuotationListView({ filteredQuotations, onInspect, tabCounts }: QuotationListViewProps) {
  const { t } = useI18n();
  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const setActiveTab = useQuotationsUiStore((s) => s.setActiveTab);
  const search = useQuotationsUiStore((s) => s.search);
  const setSearch = useQuotationsUiStore((s) => s.setSearch);

  const pagination = useListPagination(filteredQuotations, [activeTab, search]);

  return (
    <Stack gap="md" className="rfq-list">
      <SimpleGrid cols={{ base: 1, sm: 3 }} className="rfq-metric-grid">
        <Metric
          label={t('quotations.metricShown')}
          value={new Intl.NumberFormat('en-US').format(filteredQuotations.length)}
          color="blue"
          icon={<IconFileInvoice size={22} />}
        />
        <Metric
          label={t('quotations.metricPending')}
          value={new Intl.NumberFormat('en-US').format(tabCounts.pending)}
          color="yellow"
          icon={<IconClock size={22} />}
        />
        <Metric
          label={t('quotations.metricRejected')}
          value={new Intl.NumberFormat('en-US').format(tabCounts.rejected)}
          color="red"
          icon={<IconX size={22} />}
        />
      </SimpleGrid>

      <Paper withBorder p="md" className="rfq-list-filter-panel dl-filter-panel">
        <div className="rfq-list-toolbar">
          <div className="dl-filter-head">
            <div className="dl-filter-head__control">
              <div className="dl-chip-row rfq-list-tabs" aria-label={t('quotations.status')} role="group">
                {quotationTabItems.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      aria-pressed={isActive}
                      className={isActive ? 'dl-chip is-active' : 'dl-chip'}
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      <span className="dl-chip-dot" aria-hidden="true" />
                      <span>{t(tab.labelKey)}</span>
                      <span className="dl-chip-count">{tabCounts[tab.value]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="dl-filter-result">
              <Text size="sm" c="dimmed">
                {t('common.shown', { count: filteredQuotations.length })}
              </Text>
            </div>
          </div>

          <TextInput
            leftSection={<IconSearch size={16} />}
            label={t('common.search')}
            placeholder={t('quotations.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            className="rfq-list-search dl-filter-search"
          />
        </div>
      </Paper>

      <Paper withBorder p={0} className="rfq-list-panel dl-data-panel">
        <div className="rfq-list-body">
          {filteredQuotations.length === 0 ? (
            <div className="rfq-list-empty">
              <EmptyState title={t('quotations.emptyTitle')} description={t('quotations.emptyDescription')} />
            </div>
          ) : (
            <>
              <div className="rfq-list-head" aria-hidden="true">
                <span className="rfq-list-head-code">{t('quotations.quoteNumber')}</span>
                <span className="rfq-list-head-customer">{t('quotations.customer')}</span>
                <span className="rfq-list-head-route">{t('quotations.route')}</span>
                <span className="rfq-list-head-money">{t('quotations.total')}</span>
                <span className="rfq-list-head-status">{t('quotations.status')}</span>
                <span className="rfq-list-head-action" />
              </div>

              <div className="rfq-list-rows">
                {pagination.visibleItems.map((quotation) => (
                  <article className="rfq-list-row" key={quotation.id}>
                    <div className="rfq-list-cell rfq-list-code">
                      <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                        {t('quotations.quoteNumber')}
                      </Text>
                      <Text fw={800} size="sm">
                        {quotation.quotation_no}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {quotation.valid_until ?? '-'}
                      </Text>
                    </div>

                    <div className="rfq-list-cell">
                      <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                        {t('quotations.customer')}
                      </Text>
                      <Text size="sm" fw={600}>
                        {quotation.customer_ref ?? '-'}
                      </Text>
                    </div>

                    <div className="rfq-list-cell rfq-list-route">
                      <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                        {t('quotations.route')}
                      </Text>
                      <Text size="sm" fw={600}>
                        {quotation.mode ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {quotation.incoterm_code ?? '-'}
                      </Text>
                    </div>

                    <div className="rfq-list-cell rfq-list-money">
                      <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                        {t('quotations.total')}
                      </Text>
                      <Text size="sm" fw={800} className="tabular-nums">
                        {formatMoney(quotationDisplayTotal(quotation), quotation.currency_code)}
                      </Text>
                    </div>

                    <div className="rfq-list-cell rfq-list-status">
                      <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                        {t('quotations.status')}
                      </Text>
                      <StatusBadge status={quotation.status} />
                    </div>

                    <div className="rfq-list-cell rfq-list-action">
                      <Tooltip label={t('quotations.inspect')}>
                        <ActionIcon
                          variant="light"
                          aria-label={t('quotations.inspect')}
                          onClick={() => onInspect(quotation)}
                        >
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </article>
                ))}
              </div>

              <ListPagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                pageStart={pagination.pageStart}
                pageEnd={pagination.pageEnd}
                setPage={pagination.setPage}
                total={filteredQuotations.length}
              />
            </>
          )}
        </div>
      </Paper>
    </Stack>
  );
}

function Metric({
  color,
  icon,
  label,
  value,
}: {
  color: 'blue' | 'green' | 'red' | 'yellow';
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Paper withBorder p="md" className="metric-card rfq-metric-card">
      <div>
        <Text className="metric-label" size="xs" fw={700} tt="uppercase" mb={4}>
          {label}
        </Text>
        <Title
          order={1}
          fw={800}
          style={{ lineHeight: 1.1, color: `var(--kbfe-status-${color}, var(--mantine-color-${color}-7))` }}
        >
          {value}
        </Title>
      </div>
      <span className={`metric-icon metric-icon-${color}`}>{icon}</span>
    </Paper>
  );
}
