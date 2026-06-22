import {
  ActionIcon,
  Badge,
  Button,
  Group,
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
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';

import {
  PAGE_SIZE,
  dateOnly,
  getDelayedDays,
  totalPoAmount,
} from '../model/purchaseOrderModel';
import { usePurchaseOrdersUiStore } from '../model/purchaseOrdersUiStore';
import { LogisticsRouteCell } from './LogisticsRouteCell';
import { Metric } from './Metric';
import { PoStageBadge } from './PoStageBadge';
import { PoStageFilter } from './PoStageFilter';

export function PurchaseOrderListView({
  delayedPurchaseOrders,
  isClientSideStatusFilter,
  isFetching,
  onOpenDetail,
  onRefresh,
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
  onRefresh: () => void;
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
          label="Delayed"
          value={String(delayedPurchaseOrders)}
          color="red"
          icon={<IconAlertTriangle size={22} />}
        />
        <Metric
          label="On-time rate"
          value={`${onTimeRate}%`}
          color="green"
          icon={<IconCircleCheck size={22} />}
        />
        <Metric
          label="Total Cont."
          value={String(purchaseOrderSummary.totalContainers)}
          color="teal"
          icon={<IconContainer size={22} />}
        />
        <Metric
          label="Total LOT"
          value={String(purchaseOrderSummary.totalLots)}
          color="yellow"
          icon={<IconBox size={22} />}
        />
      </SimpleGrid>

      <Paper withBorder p="md" className="purchase-order-filter-panel">
        <Stack gap="md">
          <Stack gap={6}>
            <PoStageFilter
              value={statusFilter}
              onChange={onStatusFilterChange}
              stageCounts={stageCounts}
              subStageCounts={subStageCounts}
              totalCount={total}
            />
            {isClientSideStatusFilter ? (
              <Text size="xs" c="dimmed">
                Stage / status filtering applies to the current page only.
              </Text>
            ) : null}
          </Stack>

          <div className="purchase-order-filter-primary">
            <TextInput
              className="purchase-order-filter-search"
              label="Search"
              leftSection={<IconSearch size={16} />}
              placeholder="PO, contract, type, notes"
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
            />
            <Select
              label="Supplier"
              placeholder="All suppliers"
              value={supplierFilter}
              onChange={onSupplierFilterChange}
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage="No suppliers"
            />
            <div className="purchase-order-filter-dates">
              <TextInput
                label="Date from"
                leftSection={<IconCalendarStats size={16} />}
                type="date"
                value={dateFrom}
                onChange={(event) => onDateFromChange(event.currentTarget.value)}
              />
              <TextInput
                label="Date to"
                leftSection={<IconCalendarStats size={16} />}
                type="date"
                value={dateTo}
                onChange={(event) => onDateToChange(event.currentTarget.value)}
              />
            </div>
            <Group className="purchase-order-filter-actions" gap="xs" wrap="nowrap">
              <Button
                className="purchase-order-filter-clear"
                variant={hasActiveFilters ? 'light' : 'subtle'}
                leftSection={<IconX size={16} />}
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear
              </Button>
              <Button
                className="purchase-order-filter-refresh"
                variant="light"
                leftSection={<IconRefresh size={16} />}
                loading={isFetching}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            </Group>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p={0} className="purchase-order-list-panel">
        {purchaseOrders.length === 0 ? (
          <div className="purchase-order-list-empty">
            <EmptyState title="No purchase orders" description="Create a PO or adjust the filters." />
          </div>
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table className="purchase-order-list-table" miw={1180} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <HeaderLabel label="PO" hint={t('glossary.po')} />
                  </Table.Th>
                  <Table.Th>Supplier/Shipper</Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Terms" hint={t('glossary.incoterm')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel
                      label="Logistics"
                      hint={`${t('glossary.loadingPort')} -> ${t('glossary.unloadingPort')} -> ${t('glossary.warehouse')}`}
                    />
                  </Table.Th>
                  <Table.Th>Lines</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Delayed</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {purchaseOrders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td className="table-cell-truncate purchase-order-list-po-cell" style={{ maxWidth: '16rem' }}>
                      <Text fw={700} lineClamp={1} title={order.po_no}>
                        {order.po_no}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Contract {order.contract_no}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Created {dateOnly(order.create_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td className="table-cell-truncate purchase-order-list-supplier-cell" style={{ maxWidth: '20rem' }}>
                      <Text size="sm" fw={600} lineClamp={1} title={order.supplier?.supplier_name ?? '-'}>
                        {order.supplier?.supplier_name ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {order.supplier?.supplier_code ?? order.supplier_id}
                      </Text>
                    </Table.Td>
                    <Table.Td className="purchase-order-list-terms-cell">
                      <Text size="sm">{order.incoterm?.incoterm_code ?? '-'}</Text>
                      <Text size="xs" c="dimmed">
                        {order.transport_mode?.mode_code ?? order.payment_term ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <LogisticsRouteCell order={order} />
                    </Table.Td>
                    <Table.Td className="purchase-order-list-lines-cell">
                      <Badge variant="light">{order.lines?.length ?? 0} lines</Badge>
                    </Table.Td>
                    <Table.Td className="purchase-order-list-money-cell">
                      <Text fw={600} className="purchase-order-money">
                        <NumberFormatter value={totalPoAmount(order.lines)} thousandSeparator />{' '}
                        {order.currency?.currency_code ?? ''}
                      </Text>
                    </Table.Td>
                    <Table.Td className="purchase-order-list-delay-cell">
                      {getDelayedDays(order) > 0 ? (
                        <Badge color="red" variant="light" className="purchase-order-nowrap-badge">
                          {getDelayedDays(order)} days
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td className="po-stage-cell">
                      <PoStageBadge order={order} />
                    </Table.Td>
                    <Table.Td className="purchase-order-list-action-cell">
                      <Tooltip label="Open detail">
                        <ActionIcon variant="subtle" aria-label="Open detail" onClick={() => onOpenDetail(order)}>
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
