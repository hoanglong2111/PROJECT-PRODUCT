import { ActionIcon, Badge, Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCalendarPlus, IconCalendarStats, IconClock, IconEye, IconFileInvoice, IconSearch, IconX } from '@tabler/icons-react';

import type { QuotationV1 } from '@shared/api/quotations';
import { CopyValue } from '@shared/components/CopyValue';
import { DateField } from '@shared/components/DateField';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { Metric } from '@shared/components/Metric';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

import { computeQuotationCustomerPayTotal } from '../model/quotationMoney';
import { quotationTabItems, quotationTypeFullLabelKeys, quotationTypeShortLabels, type QuotationTab } from '../model/quotationModel';
import { useQuotationsUiStore } from '../model/quotationsUiStore';
import { QuotationValidityBadge } from './QuotationValidityBadge';

type QuotationListViewProps = {
  filteredQuotations: QuotationV1[];
  supplierOptions: { value: string; label: string }[];
  tabCounts: Record<QuotationTab, number>;
  onInspect: (quotation: QuotationV1) => void;
};


export function QuotationListView({ filteredQuotations, onInspect, supplierOptions, tabCounts }: QuotationListViewProps) {
  const { t } = useI18n();
  const { rateToVndOrNull } = useExchangeRates();
  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const setActiveTab = useQuotationsUiStore((s) => s.setActiveTab);
  const search = useQuotationsUiStore((s) => s.search);
  const setSearch = useQuotationsUiStore((s) => s.setSearch);
  const typeFilter = useQuotationsUiStore((s) => s.typeFilter);
  const setTypeFilter = useQuotationsUiStore((s) => s.setTypeFilter);
  const supplierFilter = useQuotationsUiStore((s) => s.supplierFilter);
  const setSupplierFilter = useQuotationsUiStore((s) => s.setSupplierFilter);
  const createdFrom = useQuotationsUiStore((s) => s.createdFrom);
  const setCreatedFrom = useQuotationsUiStore((s) => s.setCreatedFrom);
  const createdTo = useQuotationsUiStore((s) => s.createdTo);
  const setCreatedTo = useQuotationsUiStore((s) => s.setCreatedTo);
  const clearFilters = useQuotationsUiStore((s) => s.clearFilters);
  const hasActiveFilters =
    Boolean(search) ||
    typeFilter !== 'all' ||
    Boolean(supplierFilter) ||
    Boolean(createdFrom || createdTo);

  const pagination = useListPagination(filteredQuotations, [
    activeTab,
    search,
    typeFilter,
    supplierFilter,
    createdFrom,
    createdTo,
  ]);
  return (
    <Stack gap="md" className="rfq-list">
      <SimpleGrid cols={{ base: 1, sm: 3 }} className="rfq-metric-grid">
        <Metric
          label={t('quotations.metricShown')}
          value={filteredQuotations.length}
          color="blue"
          icon={<IconFileInvoice size={22} />}
        />
        <Metric
          label={t('quotations.metricPending')}
          value={tabCounts.pending}
          color="yellow"
          icon={<IconClock size={22} />}
        />
        <Metric
          label={t('quotations.metricRejected')}
          value={tabCounts.rejected}
          color="red"
          icon={<IconX size={22} />}
        />
      </SimpleGrid>

      <FilterToolbar
        activeTab={activeTab}
        className="rfq-list-filter-panel"
        onTabChange={(value) => setActiveTab(value as QuotationTab)}
        shown={filteredQuotations.length}
        tabs={quotationTabItems.map((tab) => ({
          value: tab.value,
          label: t(tab.labelKey),
          count: tabCounts[tab.value],
        }))}
      >
        <div className="rfq-list-toolbar">
          <div className="rfq-list-filter-row dl-filter-row">
            <TextInput
              leftSection={<IconSearch size={16} />}
              label={t('common.search')}
              placeholder={t('quotations.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              className="rfq-list-search dl-filter-search kbfe-search-input"
            />
            <Select
              className="rfq-list-type-filter"
              label={t('quotations.filterType')}
              value={typeFilter}
              onChange={(value) => setTypeFilter((value ?? 'all') as typeof typeFilter)}
              data={[
                { value: 'all', label: t('common.all') },
                ...(Object.keys(quotationTypeShortLabels) as (keyof typeof quotationTypeShortLabels)[]).map((key) => ({
                  value: key,
                  label: t(quotationTypeFullLabelKeys[key]),
                })),
              ]}
            />
            <Select
              className="rfq-list-supplier-filter"
              label={t('common.supplier')}
              placeholder={t('common.all')}
              value={supplierFilter}
              onChange={setSupplierFilter}
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage={t('common.all')}
            />
            <div className="rfq-list-filter-dates dl-filter-dates">
              <DateField
                label={t('quotations.filterCreatedFrom')}
                leftSection={<IconCalendarStats size={16} />}
                value={createdFrom}
                onChange={(value) => setCreatedFrom(value ?? '')}
              />
              <DateField
                label={t('quotations.filterCreatedTo')}
                leftSection={<IconCalendarStats size={16} />}
                value={createdTo}
                onChange={(value) => setCreatedTo(value ?? '')}
              />
            </div>
            <Group className="rfq-list-filter-actions dl-filter-actions" gap="xs" wrap="nowrap">
              <Button
                className="rfq-list-filter-clear"
                variant={hasActiveFilters ? 'light' : 'subtle'}
                leftSection={<IconX size={16} />}
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                {t('common.clear')}
              </Button>
            </Group>
          </div>
        </div>
      </FilterToolbar>

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
                <span className="rfq-list-head-type">{t('quotations.typeColumn')}</span>
                <span className="rfq-list-head-money">{t('quotations.total')}</span>
                <span className="rfq-list-head-status">{t('quotations.status')}</span>
                <span className="rfq-list-head-action" />
              </div>

              <div className="rfq-list-rows">
                {pagination.visibleItems.map((quotation) => {
                  const moneyTotals = computeQuotationCustomerPayTotal(quotation, rateToVndOrNull);
                  return (
                    <article className="rfq-list-row" key={quotation.id}>
                      <div className="rfq-list-cell rfq-list-code">
                        <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                          {t('quotations.quoteNumber')}
                        </Text>
                        <CopyValue value={quotation.quotation_no} hoverReveal>
                          <Group gap={6} wrap="nowrap" component="span" align="center">
                            <Text component="span" fw={800} size="sm" className="dl-code-text">
                              {quotation.quotation_no}
                            </Text>
                            {quotation.is_final ? (
                              <Badge size="xs" variant="light" color="blue">
                                FINAL
                              </Badge>
                            ) : null}
                          </Group>
                        </CopyValue>
                        <Group gap={8} wrap="wrap" align="center" className="rfq-code-meta">
                          <Tooltip label={t('quotations.createdColumn')}>
                            <Text component="span" size="xs" c="dimmed" className="rfq-code-created">
                              <IconCalendarPlus size={12} className="rfq-code-created-icon" />
                              {formatDate(quotation.create_at)}
                            </Text>
                          </Tooltip>
                          <QuotationValidityBadge validUntil={quotation.valid_until} />
                        </Group>
                      </div>

                      <div className="rfq-list-cell">
                        <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                          {t('quotations.customer')}
                        </Text>
                        <Text size="sm" fw={600}>
                          {quotation.customer_ref ?? '-'}
                        </Text>
                        {quotation.supplier?.supplier_name ? (
                          <Text size="xs" c="dimmed">
                            {t('quotations.supplierShort')}: {quotation.supplier.supplier_name}
                          </Text>
                        ) : null}
                      </div>

                      <div className="rfq-list-cell rfq-list-route">
                        <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                          {t('quotations.route')}
                        </Text>
                        <Text size="sm" fw={600}>
                          {quotation.origin_port || quotation.destination_port
                            ? `${quotation.origin_port ?? '-'} → ${quotation.destination_port ?? '-'}`
                            : quotation.mode ?? '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {quotation.origin_port || quotation.destination_port
                            ? `${quotation.mode ?? '-'} / ${quotation.incoterm_code ?? '-'}`
                            : quotation.incoterm_code ?? '-'}
                        </Text>
                      </div>

                      <div className="rfq-list-cell rfq-list-type">
                        <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                          {t('quotations.typeColumn')}
                        </Text>
                        <Tooltip label={t(quotationTypeFullLabelKeys[quotation.quotation_type])}>
                          <Badge size="xs" variant="light" color="grape">
                            {quotationTypeShortLabels[quotation.quotation_type]}
                          </Badge>
                        </Tooltip>
                      </div>

                      <div className="rfq-list-cell rfq-list-money">
                        <Text size="xs" c="dimmed" className="rfq-list-mobile-label">
                          {t('quotations.total')}
                        </Text>
                        <Text size="sm" fw={800} className="tabular-nums">
                          {moneyTotals.customerPayTotal != null ? formatMoney(moneyTotals.customerPayTotal, quotation.currency_code) : '-'}
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
                  );
                })}
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
