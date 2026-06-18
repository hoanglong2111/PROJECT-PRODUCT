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
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCalendarStats, IconEye, IconRefresh, IconSearch, IconX } from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import {
  PAGE_SIZE,
  dateOnly,
  formatWeightKg,
  getDelayedDays,
  purchaseOrderStatusOptions,
  totalPoAmount,
  type PurchaseOrderStatusFilter,
} from '../model/purchaseOrderModel';
import { usePurchaseOrdersUiStore } from '../model/purchaseOrdersUiStore';
import { DateStack } from './DateStack';
import { Metric } from './Metric';
import { SummaryItem } from './SummaryItem';

export function PurchaseOrderListView({
  delayedPurchaseOrders,
  isFetching,
  onOpenDetail,
  onRefresh,
  page,
  pageCount,
  purchaseOrderSummary,
  purchaseOrders,
  setPage,
  supplierOptions,
  total,
}: {
  delayedPurchaseOrders: number;
  isFetching: boolean;
  onOpenDetail: (order: PurchaseOrderV1) => void;
  onRefresh: () => void;
  page: number;
  pageCount: number;
  purchaseOrderSummary: { totalWeightKg: number; totalContainers: number; totalLots: number };
  purchaseOrders: PurchaseOrderV1[];
  setPage: (page: number) => void;
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

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 5 }}>
        <Metric label="Total rows" value={total} color="blue" />
        <Metric label="Draft" value={purchaseOrders.filter((order) => order.status === 'DRAFT').length} color="gray" />
        <Metric label="Delayed" value={delayedPurchaseOrders} color="red" />
        <Metric label="Sent" value={purchaseOrders.filter((order) => order.status === 'SENT').length} color="orange" />
        <Metric label="Active" value={purchaseOrders.filter((order) => order.status !== 'CANCELLED').length} color="teal" />
      </SimpleGrid>

      <Paper withBorder p="sm">
        <Group align="flex-end" gap="sm">
          <TextInput
            label="Search"
            leftSection={<IconSearch size={16} />}
            placeholder="PO, contract, type, notes"
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            w={{ base: '100%', sm: 360 }}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(value) => onStatusFilterChange((value || 'all') as PurchaseOrderStatusFilter)}
            data={[
              { label: 'All', value: 'all' },
              ...purchaseOrderStatusOptions.map((status) => ({ label: status.replace(/_/g, ' '), value: status })),
            ]}
            w={{ base: '100%', sm: 180 }}
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
            w={{ base: '100%', sm: 260 }}
          />
          <TextInput
            label="Date from"
            leftSection={<IconCalendarStats size={16} />}
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.currentTarget.value)}
            w={{ base: '100%', sm: 165 }}
          />
          <TextInput
            label="Date to"
            leftSection={<IconCalendarStats size={16} />}
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.currentTarget.value)}
            w={{ base: '100%', sm: 165 }}
          />
          <Button
            variant="subtle"
            leftSection={<IconX size={16} />}
            onClick={onClearFilters}
          >
            Clear
          </Button>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            loading={isFetching}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="sm" className="purchase-order-summary-strip">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          <SummaryItem label="Total Weight" value={formatWeightKg(purchaseOrderSummary.totalWeightKg)} />
          <SummaryItem label="Total Cont." value={String(purchaseOrderSummary.totalContainers)} />
          <SummaryItem label="Total LOT" value={String(purchaseOrderSummary.totalLots)} />
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0}>
        {purchaseOrders.length === 0 ? (
          <EmptyState title="No purchase orders" description="Create a PO or adjust the filters." />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={1520} verticalSpacing="sm" highlightOnHover>
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
                    <HeaderLabel label="Loading Port" hint={t('glossary.loadingPort')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Unloading Port" hint={t('glossary.unloadingPort')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="In Warehouse" hint={t('glossary.warehouse')} />
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
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '16rem' }}>
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
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '20rem' }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {order.supplier?.supplier_name ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {order.supplier?.supplier_code ?? order.supplier_id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{order.incoterm?.incoterm_code ?? '-'}</Text>
                      <Text size="xs" c="dimmed">
                        {order.transport_mode?.mode_code ?? order.payment_term ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <DateStack
                        primaryHint={t('glossary.etd')}
                        primaryLabel="ETD"
                        primaryValue={dateOnly(order.logistics_timeline?.loading_port?.etd ?? order.expected_etd)}
                        secondaryHint={t('glossary.atd')}
                        secondaryLabel="ATD"
                        secondaryValue={dateOnly(order.logistics_timeline?.loading_port?.atd)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <DateStack
                        primaryHint={t('glossary.eta')}
                        primaryLabel="ETA"
                        primaryValue={dateOnly(order.logistics_timeline?.unloading_port?.eta ?? order.expected_eta)}
                        secondaryHint={t('glossary.ata')}
                        secondaryLabel="ATA"
                        secondaryValue={dateOnly(order.logistics_timeline?.unloading_port?.ata)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <DateStack
                        primaryHint={t('glossary.eta')}
                        primaryLabel="ETA"
                        primaryValue={dateOnly(order.logistics_timeline?.warehouse?.eta ?? order.expected_warehouse_eta)}
                        secondaryHint={t('glossary.ata')}
                        secondaryLabel="ATA"
                        secondaryValue={dateOnly(order.logistics_timeline?.warehouse?.ata ?? order.actual_warehouse_ata)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{order.lines?.length ?? 0} lines</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={totalPoAmount(order.lines)} thousandSeparator />{' '}
                        {order.currency?.currency_code ?? ''}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {getDelayedDays(order) > 0 ? (
                        <Badge color="red" variant="light">
                          {getDelayedDays(order)} days
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={order.status} />
                    </Table.Td>
                    <Table.Td>
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
