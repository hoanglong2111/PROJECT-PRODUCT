import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconChecklist, IconEye, IconSearch, IconTruckDelivery, IconX } from '@tabler/icons-react';

import type { BusinessFlowTag, DeliveryOrder } from '@shared/api/logistics';
import { CopyValue } from '@shared/components/CopyValue';
import { DelayBadge } from '@shared/components/DelayBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterSegment } from '@shared/components/FilterSegment';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { Metric } from '@shared/components/Metric';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { EntityLink, calcDelay } from '@entities/logistics';

import {
  deliveryOrderTabItems,
  getAllocationWeightKg,
  getContainerCount,
  shippingIcon,
  type DeliveryOrderTab,
} from '../model/deliveryOrderModel';
import { useDeliveryOrdersUiStore } from '../model/deliveryOrdersUiStore';

export function DeliveryOrderListView({
  deliveryOrders,
  filteredDeliveryOrders,
  isFetching,
  onInspect,
  statusParam,
  supplierOptions,
  tabCounts,
}: {
  deliveryOrders: DeliveryOrder[];
  filteredDeliveryOrders: DeliveryOrder[];
  isFetching: boolean;
  onInspect: (deliveryOrder: DeliveryOrder) => void;
  statusParam: string | null;
  supplierOptions: Array<{ label: string; value: string }>;
  tabCounts: Record<DeliveryOrderTab, number>;
}) {
  const { flowTagLabel, t } = useI18n();
  const activeTab = useDeliveryOrdersUiStore((s) => s.activeTab);
  const flowFilter = useDeliveryOrdersUiStore((s) => s.flowFilter);
  const supplierFilter = useDeliveryOrdersUiStore((s) => s.supplierFilter);
  const search = useDeliveryOrdersUiStore((s) => s.search);
  const riskOnly = useDeliveryOrdersUiStore((s) => s.riskOnly);
  const onTabChange = useDeliveryOrdersUiStore((s) => s.setActiveTab);
  const onFlowFilterChange = useDeliveryOrdersUiStore((s) => s.setFlowFilter);
  const onSupplierFilterChange = useDeliveryOrdersUiStore((s) => s.setSupplierFilter);
  const onSearchChange = useDeliveryOrdersUiStore((s) => s.setSearch);
  const onRiskOnlyChange = useDeliveryOrdersUiStore((s) => s.setRiskOnly);
  const onClearFilters = useDeliveryOrdersUiStore((s) => s.clearFilters);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleDeliveryOrders,
  } = useListPagination(filteredDeliveryOrders, [activeTab, flowFilter, riskOnly, search, statusParam, supplierFilter]);
  const hasActiveFilters =
    search.trim() !== '' || flowFilter !== 'all' || Boolean(supplierFilter) || riskOnly;

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric
          label={t('deliveryOrders.metricLate')}
          value={deliveryOrders.filter((deliveryOrder) => deliveryOrder.order_info.status === 'DELAYED' || calcDelay({
            actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
            plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
            warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
          }).isLate).length}
          color="red"
          icon={<IconAlertTriangle size={22} />}
        />
        <Metric
          label={t('deliveryOrders.metricProcessing')}
          value={tabCounts.processing}
          color="blue"
          icon={<IconTruckDelivery size={22} />}
        />
        <Metric
          label={t('deliveryOrders.metricPendingTasks')}
          value={deliveryOrders.reduce((total, deliveryOrder) => total + deliveryOrder.task_summary.required_tasks_remaining, 0)}
          color="orange"
          icon={<IconChecklist size={22} />}
        />
      </SimpleGrid>

      <Paper withBorder p="md" className="dl-filter-panel">
        <Stack gap="sm">
          <div className="dl-filter-head">
            <div className="dl-filter-head__control">
              <FilterSegment
                ariaLabel={t('common.status')}
                value={activeTab}
                onChange={(value) => onTabChange(value as DeliveryOrderTab)}
                options={deliveryOrderTabItems.map((tab) => ({
                  value: tab.value,
                  label: t(tab.labelKey),
                  count: tabCounts[tab.value],
                }))}
              />
            </div>
            <div className="dl-filter-result">
              {isFetching ? <Loader size="sm" /> : null}
              <Text size="sm" c="dimmed">
                {t('common.shown', { count: filteredDeliveryOrders.length })}
              </Text>
            </div>
          </div>

          <div className="delivery-order-filter-shell dl-filter-row">
            <TextInput
              className="delivery-order-filter-search dl-filter-search"
              label={t('common.search')}
              placeholder={t('deliveryOrders.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
            />
            <Select
              label={t('common.flow')}
              value={flowFilter}
              onChange={(value) => onFlowFilterChange((value ?? 'all') as BusinessFlowTag | 'all')}
              data={[
                { label: t('common.all'), value: 'all' },
                { label: flowTagLabel('PARTIAL_DELIVERY'), value: 'PARTIAL_DELIVERY' },
                { label: flowTagLabel('CONTAINER_CONSOLIDATION'), value: 'CONTAINER_CONSOLIDATION' },
                { label: flowTagLabel('BULK_PURCHASE'), value: 'BULK_PURCHASE' },
              ]}
            />
            <Select
              label={t('common.supplier')}
              placeholder={t('deliveryOrders.allSuppliers')}
              value={supplierFilter}
              onChange={onSupplierFilterChange}
              data={supplierOptions}
              searchable
              clearable
              nothingFoundMessage={t('deliveryOrders.allSuppliers')}
            />
            <div className="delivery-order-risk-filter dl-filter-inline-control">
              <Switch
                checked={riskOnly}
                onChange={(event) => onRiskOnlyChange(event.currentTarget.checked)}
                label={t('deliveryOrders.filterRiskOnly')}
              />
            </div>
            <Button
              className="delivery-order-filter-clear"
              variant={hasActiveFilters ? 'light' : 'subtle'}
              leftSection={<IconX size={16} />}
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              {t('common.clear')}
            </Button>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p={0} className="dl-data-panel">
        <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={1180} verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <HeaderLabel label={t('deliveryOrders.doColumn')} hint={t('glossary.do')} />
                </Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('deliveryOrders.sourcePoLot')} hint={`${t('glossary.po')} ${t('glossary.lot')}`} />
                </Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('deliveryOrders.supplierAllocationHeader')} hint={t('glossary.allocation')} />
                </Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('common.route')} hint={t('glossary.route')} />
                </Table.Th>
                <Table.Th>
                  <HeaderLabel label={t('deliveryOrders.linkedShipmentEta')} hint={`${t('glossary.shipment')} ${t('glossary.eta')}`} />
                </Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleDeliveryOrders.map((deliveryOrder) => {
                const ShippingIcon = shippingIcon[deliveryOrder.logistics_shipping.shipping_method];
                const allocationWeightKg = getAllocationWeightKg(deliveryOrder);
                const containerCount = getContainerCount(deliveryOrder);
                const delay = calcDelay({
                  actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
                  plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
                  warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
                });
                const taskProgress =
                  deliveryOrder.task_summary.total_tasks > 0
                    ? Math.round(
                      (deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100,
                    )
                    : 0;

                return (
                  <Table.Tr key={deliveryOrder.id}>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '17rem' }}>
                      <CopyValue value={deliveryOrder.order_info.order_number} hoverReveal>
                        <Text component="span" fw={700} lineClamp={1} title={deliveryOrder.order_info.order_number} className="dl-code-text">
                          {deliveryOrder.order_info.order_number}
                        </Text>
                      </CopyValue>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? t('deliveryOrders.lotPending')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <EntityLink type="po" id={deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number} compact />
                      <Text size="xs" c="dimmed">{deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number}</Text>
                    </Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                      <Text size="sm" fw={600} lineClamp={1} title={deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending')}>
                        {deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending')}
                      </Text>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        <NumberFormatter value={deliveryOrder.source_lines.length} thousandSeparator /> {t('deliveryOrders.overviewItems')} -{' '}
                        <NumberFormatter value={deliveryOrder.product_details.quantity} thousandSeparator />{' '}
                        {deliveryOrder.product_details.unit || 'PCS'} |{' '}
                        <NumberFormatter value={allocationWeightKg} thousandSeparator />kg -{' '}
                        <NumberFormatter value={containerCount} thousandSeparator /> {t('deliveryOrders.containersShort')}
                      </Text>
                    </Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '17rem' }}>
                      <Group gap={6} wrap="nowrap">
                        <ShippingIcon size={18} />
                        <div>
                          <Text size="sm" lineClamp={1} title={deliveryOrder.logistics_shipping.port_of_departure}>{deliveryOrder.logistics_shipping.port_of_departure}</Text>
                          <Text size="sm" c="dimmed" lineClamp={1} title={deliveryOrder.logistics_shipping.port_of_destination}>
                            {deliveryOrder.logistics_shipping.port_of_destination}
                          </Text>
                        </div>
                      </Group>
                      <Text size="xs" c="dimmed" mt={4}>
                        {t('deliveryOrders.eta')} {deliveryOrder.logistics_shipping.eta_planned ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {deliveryOrder.linked_shipment_number ? (
                        <Badge size="xs" color="blue" variant="light">{deliveryOrder.linked_shipment_number}</Badge>
                      ) : (
                        <Badge size="xs" color="gray" variant="light">{t('deliveryOrders.noShipment')}</Badge>
                      )}
                      <Text size="xs" c={delay.isLate ? 'red' : 'dimmed'} mt={4}>
                        {t('deliveryOrders.eta')} {deliveryOrder.logistics_shipping.eta_planned ?? '-'}
                      </Text>
                      <Group gap="xs" mt={6}>
                        <DelayBadge days={delay.days} type={delay.type} />
                        <Text size="xs" c="dimmed">
                          {deliveryOrder.task_summary.completed_tasks}/{deliveryOrder.task_summary.total_tasks} {t('shell.tasks')}
                        </Text>
                      </Group>
                      <Progress value={taskProgress} size="sm" mt={6} color={taskProgress === 100 ? 'teal' : 'blue'} />
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={6}>
                        <StatusBadge status={deliveryOrder.order_info.status} />
                        <Group gap={6}>
                          {deliveryOrder.logistics_shipping.missing_documents.length > 0 ? (
                            <Badge size="xs" color="red" variant="light">
                              {t('deliveryOrders.missingDocuments', { count: deliveryOrder.logistics_shipping.missing_documents.length })}
                            </Badge>
                          ) : (
                            <Badge size="xs" color="teal" variant="light">
                              {t('deliveryOrders.complete')}
                            </Badge>
                          )}
                          {deliveryOrder.task_summary.blocked_tasks > 0 ? (
                            <Badge size="xs" color="orange" variant="light">
                              {t('deliveryOrders.blockedSuffix', { count: deliveryOrder.task_summary.blocked_tasks })}
                            </Badge>
                          ) : null}
                        </Group>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('deliveryOrders.inspect')}>
                        <ActionIcon
                          variant="subtle"
                          aria-label={t('deliveryOrders.inspect')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onInspect(deliveryOrder);
                          }}
                        >
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {filteredDeliveryOrders.length === 0 ? (
          <EmptyState title={t('deliveryOrders.emptyTitle')} description={t('deliveryOrders.emptyDescription')} />
        ) : null}
        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={filteredDeliveryOrders.length}
        />
      </Paper>
    </>
  );
}
