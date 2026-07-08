import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBox,
  IconCalendarStats,
  IconCircleCheck,
  IconContainer,
  IconEye,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { CopyValue } from '@shared/components/CopyValue';
import { DateField } from '@shared/components/DateField';
import { DateTimeText } from '@shared/components/DateTimeText';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { Metric } from '@shared/components/Metric';
import { useI18n } from '@shared/i18n';

import {
  PAGE_SIZE,
  dateOnly,
  getDelayedDays,
  totalPoAmount,
} from '../model/purchaseOrderModel';
import { usePurchaseOrdersUiStore } from '../model/purchaseOrdersUiStore';
import { LogisticsRouteCell } from './LogisticsRouteCell';
import { PoStageBadge } from './PoStageBadge';
import { PoStageFilter } from './PoStageFilter';

export function PurchaseOrderListView({
  delayedPurchaseOrders,
  isClientSideStatusFilter,
  isFetching,
  onOpenDetail,
  page,
  pageCount,
  purchaseOrderSummary,
  purchaseOrders,
  setPage,
  stageCounts,
  subStageCounts,
  supplierOptions,
  total,
}: {
  delayedPurchaseOrders: number;
  isClientSideStatusFilter: boolean;
  isFetching: boolean;
  onOpenDetail: (order: PurchaseOrderV1) => void;
  page: number;
  pageCount: number;
  purchaseOrderSummary: { totalWeightKg: number; totalContainers: number; totalLots: number };
  purchaseOrders: PurchaseOrderV1[];
  setPage: (page: number) => void;
  stageCounts: Record<string, number>;
  subStageCounts: Record<string, number>;
  supplierOptions: Array<{ label: string; value: string }>;
  total: number;
}) {
  const { t } = useI18n();
  const search = usePurchaseOrdersUiStore((s) => s.search);
  const statusFilter = usePurchaseOrdersUiStore((s) => s.statusFilter);
  const supplierFilter = usePurchaseOrdersUiStore((s) => s.supplierFilter);
  const dateFrom = usePurchaseOrdersUiStore((s) => s.dateFrom);
  const dateTo = usePurchaseOrdersUiStore((s) => s.dateTo);
  const onSearchChange = usePurchaseOrdersUiStore((s) => s.setSearch);
  const onStatusFilterChange = usePurchaseOrdersUiStore((s) => s.setStatusFilter);
  const onSupplierFilterChange = usePurchaseOrdersUiStore((s) => s.setSupplierFilter);
  const onDateFromChange = usePurchaseOrdersUiStore((s) => s.setDateFrom);
  const onDateToChange = usePurchaseOrdersUiStore((s) => s.setDateTo);
  const onClearFilters = usePurchaseOrdersUiStore((s) => s.clearFilters);
  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    Boolean(supplierFilter) ||
    dateFrom !== '' ||
    dateTo !== '';
  // Share of the loaded rows that are not delayed (same denominator as the
  // Delayed metric so the two read consistently). Empty list = 100%.
  const onTimeRate =
    purchaseOrders.length === 0
      ? 100
      : Math.round(((purchaseOrders.length - delayedPurchaseOrders) / purchaseOrders.length) * 100);

  return (
    <>
      {/* Operational aggregates for the loaded rows. The per-status counts live on
          the stage chips below (incl. the "All" total), so this strip intentionally
          omits Total POs / status breakdowns to avoid duplicating them. */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} className="purchase-order-metric-grid">
        <Metric
          label={t('purchaseOrders.metricDelayed')}
          value={String(delayedPurchaseOrders)}
          color="red"
          icon={<IconAlertTriangle size={22} />}
        />
        <Metric
          label={t('purchaseOrders.metricOnTimeRate')}
          value={`${onTimeRate}%`}
          color="green"
          icon={<IconCircleCheck size={22} />}
        />
        <Metric
          label={t('purchaseOrders.metricTotalContainers')}
          value={String(purchaseOrderSummary.totalContainers)}
          color="teal"
          icon={<IconContainer size={22} />}
        />
        <Metric
          label={t('purchaseOrders.metricTotalLots')}
          value={String(purchaseOrderSummary.totalLots)}
          color="yellow"
          icon={<IconBox size={22} />}
        />
      </SimpleGrid>

      <Paper withBorder p="md" className="purchase-order-filter-panel dl-filter-panel">
        <Stack gap="md">
          <Stack gap={6}>
            <div className="dl-filter-head">
              <div className="dl-filter-head__control">
                <PoStageFilter
                  value={statusFilter}
                  onChange={onStatusFilterChange}
                  stageCounts={stageCounts}
                  subStageCounts={subStageCounts}
                  totalCount={total}
                />
              </div>
              <div className="dl-filter-result">
                {isFetching ? <Loader size="sm" /> : null}
                <Text size="sm" c="dimmed">
                  {t('common.shown', { count: total })}
                </Text>
              </div>
            </div>
            {isClientSideStatusFilter ? (
              <Text size="xs" c="dimmed">
                {t('purchaseOrders.stageFilterPageOnly')}
              </Text>
            ) : null}
          </Stack>

          <div className="purchase-order-filter-primary dl-filter-row">
            <TextInput
              className="purchase-order-filter-search dl-filter-search kbfe-search-input"
              label={t('common.search')}
              leftSection={<IconSearch size={16} />}
              placeholder={t('purchaseOrders.searchPlaceholder')}
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
            />
            <Select
              label={t('purchaseOrders.supplier')}
              placeholder={t('purchaseOrders.allSuppliers')}
              value={supplierFilter}
              onChange={onSupplierFilterChange}
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage={t('purchaseOrders.noSuppliers')}
            />
            <div className="purchase-order-filter-dates dl-filter-dates">
              <DateField
                label={t('purchaseOrders.dateFrom')}
                leftSection={<IconCalendarStats size={16} />}
                value={dateFrom}
                onChange={(value) => onDateFromChange(value ?? '')}
              />
              <DateField
                label={t('purchaseOrders.dateTo')}
                leftSection={<IconCalendarStats size={16} />}
                value={dateTo}
                onChange={(value) => onDateToChange(value ?? '')}
              />
            </div>
            <Group className="purchase-order-filter-actions dl-filter-actions" gap="xs" wrap="nowrap">
              <Button
                className="purchase-order-filter-clear"
                variant={hasActiveFilters ? 'light' : 'subtle'}
                leftSection={<IconX size={16} />}
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                {t('purchaseOrders.clearFilters')}
              </Button>
            </Group>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p={0} className="purchase-order-list-panel dl-data-panel">
        {purchaseOrders.length === 0 ? (
          <div className="purchase-order-list-empty">
            <EmptyState title={t('purchaseOrders.emptyTitle')} description={t('purchaseOrders.emptyDescription')} />
          </div>
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table
              className="purchase-order-list-table"
              data-with-row-border
              miw={1180}
              verticalSpacing="sm"
              highlightOnHover
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <HeaderLabel label="PO" hint={t('glossary.po')} />
                  </Table.Th>
                  <Table.Th>{t('purchaseOrders.headerSupplierTerms')}</Table.Th>
                  <Table.Th>
                    <HeaderLabel
                      label={t('purchaseOrders.headerLogistics')}
                      hint={`${t('glossary.loadingPort')} -> ${t('glossary.unloadingPort')} -> ${t('glossary.warehouse')}`}
                    />
                  </Table.Th>
                  <Table.Th>{t('purchaseOrders.headerLinesAmount')}</Table.Th>
                  <Table.Th>{t('purchaseOrders.headerStageDelay')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {purchaseOrders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td className="table-cell-truncate purchase-order-list-po-cell" style={{ maxWidth: '16rem' }}>
                      <CopyValue value={order.po_no} hoverReveal>
                        <Text component="span" fw={700} lineClamp={1} title={order.po_no} className="dl-code-text">
                          {order.po_no}
                        </Text>
                      </CopyValue>
                      <Text size="xs" c="dimmed">
                        {t('purchaseOrders.contractPrefix')} {order.contract_no}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t('purchaseOrders.createdPrefix')} <DateTimeText value={order.create_at} size="xs" c="dimmed" />
                      </Text>
                    </Table.Td>
                    <Table.Td className="table-cell-truncate purchase-order-list-supplier-cell" style={{ maxWidth: '20rem' }}>
                      <Text size="sm" fw={600} lineClamp={1} title={order.supplier?.supplier_name ?? '-'}>
                        {order.supplier?.supplier_name ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {order.supplier?.supplier_code ?? order.supplier_id}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {order.incoterm?.incoterm_code ?? '-'} | {order.transport_mode?.mode_code ?? order.payment_term ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <LogisticsRouteCell order={order} />
                    </Table.Td>
                    <Table.Td className="purchase-order-list-lines-cell">
                      <Badge variant="light">{t('purchaseOrders.poLinesCount', { count: order.lines?.length ?? 0 })}</Badge>
                      <Text fw={600} className="purchase-order-money">
                        <NumberFormatter value={totalPoAmount(order.lines)} thousandSeparator />{' '}
                        {order.currency?.currency_code ?? ''}
                      </Text>
                    </Table.Td>
                    <Table.Td className="po-stage-cell">
                      <PoStageBadge order={order} />
                      {getDelayedDays(order) > 0 ? (
                        <Badge color="red" variant="light" mt={6} className="purchase-order-nowrap-badge">
                          {t('purchaseOrders.delayedDays', { count: getDelayedDays(order) })}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed" mt={4}>
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td className="purchase-order-list-action-cell">
                      <Tooltip label={t('purchaseOrders.openDetail')}>
                        <ActionIcon variant="subtle" aria-label={t('purchaseOrders.openDetail')} onClick={() => onOpenDetail(order)}>
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={Math.min(total, page * PAGE_SIZE)}
          pageStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          setPage={setPage}
          total={total}
        />
      </Paper>
    </>
  );
}
