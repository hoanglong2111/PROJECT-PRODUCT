import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
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
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChecklist,
  IconClipboardCheck,
  IconExternalLink,
  IconEye,
  IconFileCheck,
  IconFileUpload,
  IconGitBranch,
  IconPlane,
  IconSearch,
  IconShip,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { DelayBadge } from '@shared/components/DelayBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@shared/components/EntityLink';
import { FlowTagBadge } from '@shared/components/FlowTagBadge';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { SourceLineTable } from '@shared/components/SourceLineTable';
import { StatusBadge } from '@shared/components/StatusBadge';
import { UpdateDeliveryOrderForm } from '@shared/components/UpdateOrderForms';
import {
  fetchDeliveryOrders,
  fetchDeliveryOrderAttachments,
  uploadDeliveryOrderAttachment,
  type DeliveryOrder,
  type DeliveryOrderStatus,
  type BusinessFlowTag,
  type LogisticsAttachment,
  fetchQuotations,
  createQuotation,
  updateQuotationAction,
  type QuotationAction,
} from '@shared/api/logistics';
import { getApiErrorMessage } from '@shared/api/http';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { calcDelay } from '@shared/utils/delay';
import {
  getDeliveryOrderRisks,
  getOperationalGates,
  getRiskColor,
  type OperationalGate,
  type OperationalRisk,
  type OperationalRiskCode,
} from '@shared/utils/operations';

const shippingIcon = {
  SEA: IconShip,
  AIR: IconPlane,
  ROAD: IconTruckDelivery,
};

type DeliveryOrderTab = 'processing' | 'handover' | 'completed' | 'issues' | 'all';

const deliveryOrderStatusTabs: Record<Exclude<DeliveryOrderTab, 'all'>, DeliveryOrderStatus[]> = {
  processing: ['DRAFT', 'CREATED', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'],
  handover: ['IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_PROCESSING', 'WAREHOUSE_PENDING'],
  completed: ['DELIVERED'],
  issues: ['DELAYED', 'CANCELLED'],
};

function hasOperationalRisk(deliveryOrder: DeliveryOrder) {
  return (
    deliveryOrder.warehouse_tracking.delay_days > 0 ||
    deliveryOrder.task_summary.blocked_tasks > 0 ||
    deliveryOrder.logistics_shipping.missing_documents.length > 0
  );
}

export function DeliveryOrders() {
  const { flowTagLabel, t } = useI18n();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const { close: closeDoParam, open: openDoParam, value: focusedDo } = useEntityParam('do');
  const { value: focusedPr } = useEntityParam('pr');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryOrderTab>('processing');
  const [flowFilter, setFlowFilter] = useState<BusinessFlowTag | 'all'>('all');
  const search = useWorkspaceStore((state) => state.doSearch);
  const riskOnly = useWorkspaceStore((state) => state.doRiskOnly);
  const setSearch = useWorkspaceStore((state) => state.setDoSearch);
  const setRiskOnly = useWorkspaceStore((state) => state.setDoRiskOnly);

  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const isFetching = deliveryOrdersQuery.isFetching;

  useEffect(() => {
    if (statusParam) {
      const matchedTab = Object.entries(deliveryOrderStatusTabs).find(([_, statuses]) =>
        statuses.includes(statusParam as any)
      )?.[0] as DeliveryOrderTab;
      if (matchedTab) {
        setActiveTab(matchedTab);
      }
    }
  }, [statusParam]);

  useEffect(() => {
    if (!focusedDo && !focusedPr) {
      setSelectedId(null);
      return;
    }

    if (deliveryOrders.length === 0) {
      return;
    }

    const matchedOrder = deliveryOrders.find((deliveryOrder) => {
      if (focusedDo) {
        return deliveryOrder.order_info.order_number === focusedDo;
      }

      if (focusedPr) {
        return deliveryOrder.order_info.request_code === focusedPr;
      }

      return false;
    });

    if (matchedOrder) {
      setSelectedId(matchedOrder.id);
    }
  }, [deliveryOrders, focusedDo, focusedPr]);

  const filteredDeliveryOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return deliveryOrders.filter((deliveryOrder) => {
      const statusMatchesTab = statusParam
        ? deliveryOrder.order_info.status === statusParam
        : (activeTab === 'all' || deliveryOrderStatusTabs[activeTab].includes(deliveryOrder.order_info.status));
      const matchesFlow = flowFilter === 'all' || deliveryOrder.flow_tags.includes(flowFilter);
      const matchesRisk = !riskOnly || hasOperationalRisk(deliveryOrder);
      const matchesSearch = [
        deliveryOrder.order_info.order_number,
        deliveryOrder.order_info.request_code,
        deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number,
        deliveryOrder.source_lot_no,
        deliveryOrder.sap_integration.supplier_name,
        deliveryOrder.product_details.item_name_requested,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      return statusMatchesTab && matchesFlow && matchesRisk && matchesSearch;
    });
  }, [activeTab, deliveryOrders, flowFilter, riskOnly, search, statusParam]);
  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleDeliveryOrders,
  } = useListPagination(filteredDeliveryOrders, [activeTab, flowFilter, riskOnly, search, statusParam]);

  const tabCounts = useMemo(
    () => ({
      all: deliveryOrders.length,
      completed: deliveryOrders.filter((deliveryOrder) => deliveryOrderStatusTabs.completed.includes(deliveryOrder.order_info.status)).length,
      handover: deliveryOrders.filter((deliveryOrder) => deliveryOrderStatusTabs.handover.includes(deliveryOrder.order_info.status)).length,
      issues: deliveryOrders.filter((deliveryOrder) => deliveryOrderStatusTabs.issues.includes(deliveryOrder.order_info.status)).length,
      processing: deliveryOrders.filter((deliveryOrder) => deliveryOrderStatusTabs.processing.includes(deliveryOrder.order_info.status)).length,
    }),
    [deliveryOrders],
  );

  const selectedDeliveryOrder =
    selectedId === null
      ? null
      : filteredDeliveryOrders.find((deliveryOrder) => deliveryOrder.id === selectedId) ??
        deliveryOrders.find((deliveryOrder) => deliveryOrder.id === selectedId) ??
        null;
  const riskCount = deliveryOrders.filter(hasOperationalRisk).length;
  const closeDetail = () => {
    setSelectedId(null);
    closeDoParam({ clear: ['pr', 'po', 'task'] });
  };

  if (deliveryOrdersQuery.isError) {
    return (
      <PageError
        title={t('deliveryOrders.errorTitle')}
        description={t('deliveryOrders.errorDescription')}
        error={deliveryOrdersQuery.error}
        onRetry={() => {
          void deliveryOrdersQuery.refetch();
        }}
      />
    );
  }

  if (deliveryOrdersQuery.isLoading) {
    return (
      <PageLoading
        title={t('deliveryOrders.title')}
        description={t('deliveryOrders.loadingDescription')}
        tableColumns={[
          t('deliveryOrders.doColumn'),
          'Source PO / Lot',
          t('common.supplier'),
          t('common.item'),
          t('common.route'),
          t('deliveryOrders.eta'),
          t('forms.warehouse'),
          t('shell.tasks'),
          t('common.documents'),
          t('common.status'),
        ]}
      />
    );
  }

  return (
    <Stack gap="lg">
      {!selectedDeliveryOrder ? (
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Title order={1}>{t('deliveryOrders.title')}</Title>
            <Text c="dimmed" mt={4}>
              {t('deliveryOrders.subtitle')}
            </Text>
          </div>
          <Group gap="xs">
            <Badge leftSection={<IconGitBranch size={14} />} size="lg" variant="light">
              {t('deliveryOrders.generatedFromLots')}
            </Badge>
            <Button component={Link} to="/workflow" leftSection={<IconGitBranch size={16} />} variant="light">
              {t('purchaseRequests.inspectWorkflow')}
            </Button>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" align="center" gap="md">
          <Group gap="xs" align="center">
            <Button onClick={closeDetail} leftSection={<IconX size={16} />} variant="subtle" size="sm">
              {t('common.backToList')}
            </Button>
            <Text c="dimmed" size="sm">·</Text>
            <Text fw={600} size="sm">{selectedDeliveryOrder.order_info.order_number}</Text>
          </Group>
          <Badge leftSection={<IconGitBranch size={14} />} size="md" variant="light">
            {t('deliveryOrders.generatedFromLots')}
          </Badge>
        </Group>
      )}

      {focusedDo || focusedPr ? (
        <Paper withBorder p="md" className="flow-context">
          <Group justify="space-between">
            <Text size="sm">
              {t('deliveryOrders.context', { kind: focusedDo ? 'DO' : 'PR', id: focusedDo ?? focusedPr })}
            </Text>
            <Button component={Link} to={`/workflow?${focusedDo ? `do=${focusedDo}` : `pr=${focusedPr}`}`} size="xs" variant="light">
              {t('purchaseRequests.openFlow')}
            </Button>
          </Group>
        </Paper>
      ) : null}

      {selectedDeliveryOrder ? (
        <DeliveryOrderDetail deliveryOrder={selectedDeliveryOrder} onClose={closeDetail} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Metric label={t('deliveryOrders.activeDo')} value={deliveryOrders.filter((deliveryOrder) => deliveryOrder.order_info.status !== 'DELIVERED').length} color="blue" icon={<IconTruckDelivery size={22} />} />
            <Metric label={t('deliveryOrders.riskQueue')} value={riskCount} color="red" icon={<IconAlertTriangle size={22} />} />
            <Metric
              label={t('deliveryOrders.completedTasks')}
              value={deliveryOrders.reduce((total, deliveryOrder) => total + deliveryOrder.task_summary.completed_tasks, 0)}
              color="teal"
              icon={<IconChecklist size={22} />}
            />
          </SimpleGrid>

          <Paper withBorder p="md">
            <Stack gap="sm">
              <Tabs value={activeTab} onChange={(value) => setActiveTab((value as DeliveryOrderTab) ?? 'processing')} variant="pills" radius="xl">
                <Tabs.List grow>
                  <Tabs.Tab value="processing">
                    {t('deliveryOrders.tabProcessing')} ({tabCounts.processing})
                  </Tabs.Tab>
                  <Tabs.Tab value="handover">
                    {t('deliveryOrders.tabHandover')} ({tabCounts.handover})
                  </Tabs.Tab>
                  <Tabs.Tab value="completed">
                    {t('deliveryOrders.tabCompleted')} ({tabCounts.completed})
                  </Tabs.Tab>
                  <Tabs.Tab value="issues">
                    {t('deliveryOrders.tabIssues')} ({tabCounts.issues})
                  </Tabs.Tab>
                  <Tabs.Tab value="all">
                    {t('deliveryOrders.tabAll')} ({tabCounts.all})
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>

              <SimpleGrid cols={{ base: 1, md: 4 }}>
                <TextInput
                  label={t('common.search')}
                  placeholder={t('deliveryOrders.searchPlaceholder')}
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <Select
                  label={t('common.flow')}
                  value={flowFilter}
                  onChange={(value) => setFlowFilter((value ?? 'all') as BusinessFlowTag | 'all')}
                  data={[
                    { label: t('common.all'), value: 'all' },
                    { label: flowTagLabel('LINEAR'), value: 'LINEAR' },
                    { label: flowTagLabel('PARTIAL_DELIVERY'), value: 'PARTIAL_DELIVERY' },
                    { label: flowTagLabel('CONTAINER_CONSOLIDATION'), value: 'CONTAINER_CONSOLIDATION' },
                    { label: flowTagLabel('BULK_PURCHASE'), value: 'BULK_PURCHASE' },
                  ]}
                />
                <Switch
                  className="filter-switch"
                  checked={riskOnly}
                  onChange={(event) => setRiskOnly(event.currentTarget.checked)}
                  label={t('deliveryOrders.filterRiskOnly')}
                />
                <Group className="filter-actions" gap="xs">
                  {isFetching ? <Loader size="sm" /> : null}
                  <Text size="sm" c="dimmed">
                    {t('common.shown', { count: filteredDeliveryOrders.length })}
                  </Text>
                </Group>
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder p={0}>
            <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
              <Table miw={1180} verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('deliveryOrders.doColumn')}</Table.Th>
                    <Table.Th>{t('deliveryOrders.sourcePoLot')}</Table.Th>
                    <Table.Th>{t('common.supplier')} / Allocation</Table.Th>
                    <Table.Th>{t('common.route')}</Table.Th>
                    <Table.Th>{t('deliveryOrders.linkedShipmentEta')}</Table.Th>
                    <Table.Th>{t('common.status')}</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {visibleDeliveryOrders.map((deliveryOrder) => {
                    const ShippingIcon = shippingIcon[deliveryOrder.logistics_shipping.shipping_method];
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
                          <Text fw={700} lineClamp={1} title={deliveryOrder.order_info.order_number}>
                            {deliveryOrder.order_info.order_number}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? t('deliveryOrders.lotPending')}
                          </Text>
                          <FlowTagBadge compact tags={deliveryOrder.flow_tags} />
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
                            {deliveryOrder.source_lines.length} items · {deliveryOrder.product_details.quantity.toLocaleString()} {deliveryOrder.product_details.unit}
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
                            ETA {deliveryOrder.logistics_shipping.eta_planned ?? '-'}
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
                                setSelectedId(deliveryOrder.id);
                                openDoParam(deliveryOrder.order_info.order_number, { clear: ['pr', 'po', 'task'] });
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
      )}

    </Stack>
  );
}

function SlaTimer({ dueAt }: { dueAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const diff = dayjs(dueAt).diff(dayjs());
      if (diff <= 0) {
        setTimeLeft('OVERDUE');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [dueAt]);

  const isOverdue = timeLeft === 'OVERDUE';
  return (
    <Badge color={isOverdue ? 'red' : 'orange'} variant="filled">
      {timeLeft}
    </Badge>
  );
}

function Gd1QuotationBiddingPanel({ requestCode }: { requestCode: string }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Form states for creating a new quotation
  const [carrier, setCarrier] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [shippingMode, setShippingMode] = useState('FCL');
  const [freightCost, setFreightCost] = useState('');
  const [localCharges, setLocalCharges] = useState('');
  const [customsFee, setCustomsFee] = useState('');
  const [isAllInclusive, setIsAllInclusive] = useState(false);

  const quotationsQuery = useQuery({
    queryKey: ['quotations'],
    queryFn: fetchQuotations,
  });

  const quotations = useMemo(() => {
    const all = quotationsQuery.data ?? [];
    return all.filter((q) => q.requestCode === requestCode);
  }, [quotationsQuery.data, requestCode]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => createQuotation(payload),
    onSuccess: () => {
      setCarrier('');
      setAmount('');
      setFreightCost('');
      setLocalCharges('');
      setCustomsFee('');
      setIsAllInclusive(false);
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: QuotationAction }) => updateQuotationAction(id, { action }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const handleCompareSelect = (id: string, checked: boolean) => {
    if (checked) {
      if (compareIds.length < 2) {
        setCompareIds([...compareIds, id]);
      }
    } else {
      setCompareIds(compareIds.filter((x) => x !== id));
    }
  };

  const selectedQuotes = useMemo(() => {
    return quotations.filter((q) => compareIds.includes(q.id));
  }, [quotations, compareIds]);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>{t('quotations.title')}</Title>
        <Group>
          <Button
            size="xs"
            variant="outline"
            disabled={compareIds.length !== 2}
            onClick={() => setShowComparison((current) => !current)}
          >
            {showComparison ? 'Ẩn so sánh' : 'So sánh'} ({compareIds.length}/2)
          </Button>
        </Group>
      </Group>

      {quotationsQuery.isLoading ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : quotations.length === 0 ? (
        <Text size="sm" c="dimmed">
          Chưa có báo giá nào cho yêu cầu này.
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}></Table.Th>
              <Table.Th>Báo giá</Table.Th>
              <Table.Th>Nhà vận chuyển</Table.Th>
              <Table.Th>Giá đề xuất</Table.Th>
              <Table.Th>Trạng thái</Table.Th>
              <Table.Th>SLA</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Thao tác</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {quotations.map((quote: any) => {
              const isChecked = compareIds.includes(quote.id);
              const isDisabled = !isChecked && compareIds.length >= 2;
              return (
                <Table.Tr key={quote.id}>
                  <Table.Td>
                    <Checkbox
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => handleCompareSelect(quote.id, e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {quote.quoteNumber}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {quote.shippingMode}
                    </Text>
                  </Table.Td>
                  <Table.Td>{quote.carrierName || 'N/A'}</Table.Td>
                  <Table.Td>
                    {quote.quoteAmount ? (
                      <Text fw={700}>
                        {Number(quote.quoteAmount).toLocaleString()} {quote.currency}
                      </Text>
                    ) : (
                      <Text c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        quote.status === 'APPROVED' || quote.status === 'BOOKED'
                          ? 'green'
                          : quote.status === 'REJECTED'
                            ? 'red'
                            : quote.status.includes('SENT')
                              ? 'blue'
                              : 'gray'
                      }
                      variant="light"
                    >
                      {quote.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {(quote.status === 'PRELIMINARY_SENT' || quote.status === 'OFFICIAL_SENT') && (
                      <SlaTimer
                        dueAt={quote.status === 'PRELIMINARY_SENT' ? quote.preliminaryDueAt : quote.officialDueAt}
                      />
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      {quote.status === 'DRAFT' && (
                        <Button
                          size="compact-xs"
                          color="blue"
                          onClick={() => actionMutation.mutate({ id: quote.id, action: 'SEND_PRELIMINARY' })}
                          loading={actionMutation.isPending}
                        >
                          Gửi
                        </Button>
                      )}
                      {(quote.status === 'PRELIMINARY_SENT' || quote.status === 'OFFICIAL_SENT') && (
                        <>
                          <Button
                            size="compact-xs"
                            color="green"
                            onClick={() => actionMutation.mutate({ id: quote.id, action: 'CUSTOMER_APPROVED' })}
                            loading={actionMutation.isPending}
                          >
                            Duyệt (KBI)
                          </Button>
                          <Button
                            size="compact-xs"
                            color="red"
                            variant="light"
                            onClick={() => actionMutation.mutate({ id: quote.id, action: 'CUSTOMER_REJECTED' })}
                            loading={actionMutation.isPending}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      {/* Form thêm báo giá mới */}
      <Paper withBorder p="md" mt="md">
        <Stack gap="xs">
          <Text size="xs" fw={700}>
            TẠO BÁO GIÁ MỚI
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label="Nhà vận chuyển"
              placeholder="VD: Logistics Hữu Nghị"
              value={carrier}
              onChange={(e) => setCarrier(e.currentTarget.value)}
              size="xs"
              required
            />
            <TextInput
              label="Tổng số tiền"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              size="xs"
              required
            />
            <Select
              label="Tiền tệ"
              value={currency}
              onChange={(val) => setCurrency(val || 'USD')}
              data={['USD', 'VND', 'EUR']}
              size="xs"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Select
              label="Hình thức vận chuyển"
              value={shippingMode}
              onChange={(val) => setShippingMode(val || 'FCL')}
              data={['FCL', 'LCL', 'AIR']}
              size="xs"
            />
            <TextInput
              label="Cước biển/hàng không"
              type="number"
              placeholder="Freight cost"
              value={freightCost}
              onChange={(e) => setFreightCost(e.currentTarget.value)}
              size="xs"
            />
            <TextInput
              label="Phí địa phương (Local charges)"
              type="number"
              placeholder="Local charges"
              value={localCharges}
              onChange={(e) => setLocalCharges(e.currentTarget.value)}
              size="xs"
            />
            <TextInput
              label="Phí hải quan (Customs fee)"
              type="number"
              placeholder="Customs clearance fee"
              value={customsFee}
              onChange={(e) => setCustomsFee(e.currentTarget.value)}
              size="xs"
            />
          </SimpleGrid>

          <Switch
            label="Giá trọn gói (All inclusive)"
            checked={isAllInclusive}
            onChange={(e) => setIsAllInclusive(e.currentTarget.checked)}
            size="xs"
          />

          <Group justify="flex-end">
            <Button
              size="xs"
              color="blue"
              onClick={() =>
                createMutation.mutate({
                  requestCode,
                  carrierName: carrier,
                  quoteAmount: Number(amount),
                  currency,
                  shippingMode,
                  freightCost: Number(freightCost) || 0,
                  localCharges: Number(localCharges) || 0,
                  customsFee: Number(customsFee) || 0,
                  isAllInclusive,
                })
              }
              loading={createMutation.isPending}
              disabled={!carrier || !amount}
            >
              Tạo báo giá
            </Button>
          </Group>
        </Stack>
      </Paper>

      {showComparison && selectedQuotes.length === 2 ? (
        <Paper withBorder p="md">
          <Group justify="space-between" mb="md">
            <Title order={4}>So sánh chi tiết Báo giá</Title>
            <Button size="xs" variant="subtle" onClick={() => setShowComparison(false)} leftSection={<IconX size={14} />}>
              Đóng
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {selectedQuotes.map((quote: any, idx) => (
              <Paper key={quote.id} withBorder p="md">
                <Title order={5} mb="md">
                  Lựa chọn {idx + 1}: {quote.quoteNumber}
                </Title>
                <Stack gap="xs">
                  <Info label="Nhà vận chuyển" value={quote.carrierName || 'N/A'} />
                  <Info label="Phương thức" value={quote.shippingMode} />
                  <Info
                    label="Giá đề xuất"
                    value={
                      quote.quoteAmount
                        ? `${Number(quote.quoteAmount).toLocaleString()} ${quote.currency}`
                        : 'N/A'
                    }
                  />
                  <Info
                    label="Cước chính"
                    value={
                      quote.freightCost ? `${Number(quote.freightCost).toLocaleString()} ${quote.currency}` : '0'
                    }
                  />
                  <Info
                    label="Phí địa phương"
                    value={
                      quote.localCharges
                        ? `${Number(quote.localCharges).toLocaleString()} ${quote.currency}`
                        : '0'
                    }
                  />
                  <Info
                    label="Phí hải quan"
                    value={
                      quote.customsFee ? `${Number(quote.customsFee).toLocaleString()} ${quote.currency}` : '0'
                    }
                  />
                  <Info label="Trọn gói" value={quote.isAllInclusive ? 'Có' : 'Không'} />
                  <Info label="Trạng thái" value={quote.status} />
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>
      ) : null}
    </Stack>
  );
}

function DeliveryOrderDetail({ deliveryOrder }: { deliveryOrder: DeliveryOrder; onClose: () => void }) {
  const { documentLabel, t, taskRoleLabel } = useI18n();
  const gates = getOperationalGates(deliveryOrder);
  const risks = getDeliveryOrderRisks(deliveryOrder);
  const taskProgress =
    deliveryOrder.task_summary.total_tasks > 0
      ? Math.round((deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100)
      : 0;

  return (
    <Stack gap="lg">
      {/* Identity card */}
      <Paper withBorder p="lg" className="workbench-section">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb={4} wrap="nowrap">
              <Title order={3}>{deliveryOrder.order_info.order_number}</Title>
              <StatusBadge status={deliveryOrder.order_info.status} />
            </Group>
            <Text c="dimmed" size="sm">
              {deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number ?? t('deliveryOrders.poPending')} / {deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number} - {deliveryOrder.product_details.item_name_requested}
            </Text>
            <FlowTagBadge tags={deliveryOrder.flow_tags} />
          </div>
          <Text size="xs" c="dimmed" className="tabular-nums">{taskProgress}% {t('tasks.progress')}</Text>
        </Group>
      </Paper>

      <Group gap="xs">
        <EntityLink type="po" id={deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number} />
        <Button
          component={Link}
          to={`/tasks?do=${deliveryOrder.order_info.order_number}`}
          size="xs"
          variant="light"
          rightSection={<IconArrowRight size={14} />}
        >
          {t('deliveryOrders.viewClosureTasks')}
        </Button>
      </Group>

      {(deliveryOrder.logistics_shipping.missing_documents.length > 0 ||
        deliveryOrder.task_summary.blocked_tasks > 0 ||
        deliveryOrder.warehouse_tracking.delay_days > 0) && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {t('deliveryOrders.alertRisk')}
        </Alert>
      )}

      <OperationalGateSummary deliveryOrder={deliveryOrder} gates={gates} risks={risks} />

      <UpdateDeliveryOrderForm deliveryOrder={deliveryOrder} />

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconTruckDelivery size={16} />}>
            {t('deliveryOrders.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="quotations" leftSection={<IconClipboardCheck size={16} />}>
            {t('quotations.title')}
          </Tabs.Tab>
          <Tabs.Tab value="ops" leftSection={<IconClipboardCheck size={16} />}>
            {t('deliveryOrders.opsControl')}
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFileCheck size={16} />}>
            {t('common.documents')}
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconChecklist size={16} />}>
            {t('deliveryOrders.closure')}
          </Tabs.Tab>
          <Tabs.Tab value="source-lines" leftSection={<IconGitBranch size={16} />}>
            {t('forms.sourceLines')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Stack gap="sm">
              <Info label="Source lot" value={deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? '-'} />
              <Info label={t('common.supplier')} value={deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending')} />
              <Info label={t('forms.incoterms')} value={deliveryOrder.logistics_shipping.incoterms} />
              <Info label={t('deliveryOrders.etdEta')} value={`${deliveryOrder.logistics_shipping.etd_planned ?? '-'} / ${deliveryOrder.logistics_shipping.eta_planned ?? '-'}`} />
              <Info label={t('forms.plannedWarehouseEntry')} value={deliveryOrder.warehouse_tracking.planned_entry_date ?? '-'} />
            </Stack>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="quotations" pt="md">
          <Gd1QuotationBiddingPanel requestCode={deliveryOrder.order_info.order_number} />
        </Tabs.Panel>

        <Tabs.Panel value="ops" pt="md">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {gates.map((gate) => (
                <Paper key={gate.id} withBorder p="md" className={gate.passed ? undefined : 'risk-panel'}>
                  <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                    <div>
                      <Text fw={700}>{gateLabel(gate.id, t)}</Text>
                      <Text size="sm" c="dimmed">
                        {gateDetail(gate, t) || '-'}
                      </Text>
                    </div>
                    <Badge color={gate.passed ? 'teal' : 'orange'} variant="light">
                      {gate.passed ? t('deliveryOrders.gatePassed') : t('deliveryOrders.gateBlocked')}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('common.owner')}: {taskRoleLabel(gate.owner)}
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>

            <Paper withBorder p="md">
              <Group justify="space-between" align="flex-start" mb="sm">
                <div>
                  <Text fw={700}>{t('deliveryOrders.nextActions')}</Text>
                  <Text size="sm" c="dimmed">
                    {t('deliveryOrders.nextActionsDescription')}
                  </Text>
                </div>
                <Badge color={risks.length > 0 ? 'red' : 'teal'} variant="light">
                  {risks.length > 0 ? t('common.atRisk') : t('deliveryOrders.readyForClosure')}
                </Badge>
              </Group>
              <Stack gap="xs">
                {risks.length > 0 ? (
                  risks.map((risk) => (
                    <Group key={risk.code} justify="space-between" gap="sm">
                      <Group gap="xs">
                        <Badge color={getRiskColor(risk.severity)} variant="light">
                          {riskLabel(risk.code, t)}
                        </Badge>
                        <Text size="sm">{riskDetail(risk, t)}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {taskRoleLabel(risk.owner)} · {t('deliveryOrders.sla', { sla: slaLabel(risk.sla, t) })}
                      </Text>
                    </Group>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    {t('deliveryOrders.noOpsRisk')}
                  </Text>
                )}
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Info label={t('deliveryOrders.efmsBooking')} value={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number} />
              <Info label={t('deliveryOrders.mblVessel')} value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
              <Info
                label={t('deliveryOrders.polPod')}
                value={`${deliveryOrder.logistics_shipping.port_of_departure} ${t('deliveryOrders.routeConnector')} ${deliveryOrder.logistics_shipping.port_of_destination}`}
              />
              <Info label={t('deliveryOrders.ofAfDebitNote')} value={gates.find((gate) => gate.id === 'documents')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingDocuments')} />
              <Info label={t('deliveryOrders.finalDebitNote')} value={gates.find((gate) => gate.id === 'finance')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingOpsGates')} />
              <Info label={t('deliveryOrders.podArchive')} value={deliveryOrder.warehouse_tracking.actual_entry_date ? t('deliveryOrders.ready') : t('deliveryOrders.waitingWarehouse')} />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <DocumentUploadPanel deliveryOrder={deliveryOrder} documentLabel={documentLabel} />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={700}>{t('deliveryOrders.closureGate')}</Text>
                <Text size="sm" c="dimmed">
                  {t('deliveryOrders.closureGateDescription')}
                </Text>
              </div>
              <Badge color={taskProgress === 100 ? 'teal' : 'orange'}>{t('deliveryOrders.tasksDone', { percent: taskProgress })}</Badge>
            </Group>
            <Progress value={taskProgress} color={taskProgress === 100 ? 'teal' : 'orange'} />
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Info label={t('tasks.totalTasks')} value={String(deliveryOrder.task_summary.total_tasks)} />
              <Info label={t('workflow.blockedTasks')} value={String(deliveryOrder.task_summary.blocked_tasks)} />
              <Info label={t('deliveryOrders.requiredRemaining')} value={String(deliveryOrder.task_summary.required_tasks_remaining)} />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="source-lines" pt="md">
          <SourceLineTable lines={deliveryOrder.source_lines} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function DocumentUploadPanel({
  deliveryOrder,
  documentLabel,
}: {
  deliveryOrder: DeliveryOrder;
  documentLabel: (documentName: string) => string;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const orderNumber = deliveryOrder.order_info.order_number;
  const attachmentsQuery = useQuery({
    queryKey: ['delivery-order-attachments', orderNumber],
    queryFn: () => fetchDeliveryOrderAttachments(orderNumber),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) =>
      uploadDeliveryOrderAttachment({
        documentType,
        file,
        orderNumber,
      }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['delivery-order-attachments', orderNumber] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ]);
    },
  });
  const attachments = attachmentsQuery.data ?? [];

  return (
    <Stack gap="md">
      {uploadMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {getApiErrorMessage(uploadMutation.error)}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {['Invoice', 'Packing List', 'B/L', 'CO'].map((documentName) => {
          const uploadedFiles = attachments.filter((attachment) => attachment.documentType === documentName);
          const checked = deliveryOrder.logistics_shipping.documents_list.includes(documentName) || uploadedFiles.length > 0;
          const selectedFile = selectedFiles[documentName] ?? null;

          return (
            <Paper key={documentName} withBorder p="md" className={checked ? undefined : 'risk-panel'}>
              <Group justify="space-between" align="flex-start" gap="xs">
                <div>
                  <Checkbox checked={checked} readOnly label={documentLabel(documentName)} />
                  <Text size="sm" c={checked ? 'teal' : 'red'} mt={6}>
                    {checked ? t('deliveryOrders.received') : t('deliveryOrders.missingForCustoms')}
                  </Text>
                </div>
                <Badge color={uploadedFiles.length > 0 ? 'teal' : 'gray'} variant="light">
                  {t('deliveryOrders.uploadedFiles', { count: uploadedFiles.length })}
                </Badge>
              </Group>

              <FileInput
                accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                clearable
                leftSection={<IconFileUpload size={16} />}
                mt="md"
                placeholder={t('deliveryOrders.selectAttachment')}
                value={selectedFile}
                onChange={(file) =>
                  setSelectedFiles((current) => ({
                    ...current,
                    [documentName]: file,
                  }))
                }
              />
              <Button
                fullWidth
                disabled={!selectedFile}
                loading={uploadMutation.isPending}
                mt="sm"
                onClick={() => {
                  if (selectedFile) {
                    uploadMutation.mutate({ documentType: documentName, file: selectedFile });
                    setSelectedFiles((current) => ({ ...current, [documentName]: null }));
                  }
                }}
                leftSection={<IconFileUpload size={16} />}
              >
                {t('deliveryOrders.uploadAttachment')}
              </Button>

              {uploadedFiles.length > 0 ? <AttachmentList attachments={uploadedFiles} /> : null}
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function AttachmentList({ attachments }: { attachments: LogisticsAttachment[] }) {
  const { t } = useI18n();

  return (
    <Stack gap={6} mt="sm">
      {attachments.map((attachment) => (
        <Group key={attachment.id} justify="space-between" gap="xs" wrap="nowrap">
          <div>
            <Text size="sm" fw={600}>
              {attachment.fileName}
            </Text>
            <Text size="xs" c="dimmed">
              {formatBytes(attachment.size)} · {new Date(attachment.uploadedAt).toLocaleString()}
            </Text>
          </div>
          <Button
            component="a"
            href={attachment.storageUrl}
            target="_blank"
            rel="noreferrer"
            size="compact-xs"
            variant="subtle"
            rightSection={<IconExternalLink size={12} />}
          >
            {t('deliveryOrders.openAttachment')}
          </Button>
        </Group>
      ))}
    </Stack>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function OperationalGateSummary({
  deliveryOrder,
  gates,
  risks,
}: {
  deliveryOrder: DeliveryOrder;
  gates: ReturnType<typeof getOperationalGates>;
  risks: ReturnType<typeof getDeliveryOrderRisks>;
}) {
  const { t, taskRoleLabel } = useI18n();
  const passedCount = gates.filter((gate) => gate.passed).length;
  const delay = calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });

  return (
    <Paper withBorder p="md" className={risks.length > 0 ? 'ops-panel ops-panel-risk' : 'ops-panel'}>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('deliveryOrders.opsGateScore')}
          </Text>
          <Title order={3}>
            {passedCount}/{gates.length}
          </Title>
          <Text size="sm" c="dimmed">
            {t('deliveryOrders.opsGateScoreDescription')}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('common.delay')}
          </Text>
          <Title order={3} c={delay.isLate ? 'red' : 'teal'}>
            {delay.days}d
          </Title>
          <Text size="sm" c="dimmed">
            {deliveryOrder.warehouse_tracking.warehouse_deadline}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('deliveryOrders.nextAction')}
          </Text>
          <Title order={4}>{risks[0] ? riskLabel(risks[0].code, t) : t('deliveryOrders.readyForClosure')}</Title>
          <Text size="sm" c="dimmed">
            {risks[0]
              ? `${taskRoleLabel(risks[0].owner)} · ${t('deliveryOrders.sla', { sla: slaLabel(risks[0].sla, t) })}`
              : t('deliveryOrders.noOpsRisk')}
          </Text>
        </div>
      </SimpleGrid>
    </Paper>
  );
}

function gateLabel(id: string, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<string, string> = {
    customs: t('deliveryOrders.gateCustoms'),
    documents: t('deliveryOrders.gateDocuments'),
    finance: t('deliveryOrders.gateFinance'),
    tasks: t('deliveryOrders.gateTasks'),
    warehouse: t('deliveryOrders.gateWarehouse'),
  };

  return labels[id] ?? id;
}

function riskLabel(code: OperationalRiskCode, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<OperationalRiskCode, string> = {
    BLOCKED_TASKS: t('opsRisk.blockedTasks'),
    FINANCE_NOT_READY: t('opsRisk.financeNotReady'),
    MISSING_DOCUMENTS: t('opsRisk.missingDocuments'),
    REQUIRED_TASKS: t('opsRisk.requiredTasks'),
    WAREHOUSE_DELAY: t('opsRisk.warehouseDelay'),
    QUOTATION_SLA: t('opsRisk.quotationSla'),
    DRAFT_BL_SLA: t('opsRisk.draftBlSla'),
  };

  return labels[code];
}

function gateDetail(gate: OperationalGate, t: ReturnType<typeof useI18n>['t']) {
  if (gate.id === 'documents') {
    return gate.passed ? t('deliveryOrders.gateDocumentsReadyDetail') : gate.detail;
  }
  if (gate.id === 'customs') {
    return gate.passed
      ? t('deliveryOrders.gateCustomsReadyDetail')
      : t('deliveryOrders.gateWaitingDocumentCrossCheckDetail');
  }
  if (gate.id === 'tasks') {
    return gate.passed
      ? t('deliveryOrders.gateRequiredTasksClearDetail')
      : t('deliveryOrders.gateTasksBlockedDetail', extractTaskGateCounts(gate.detail));
  }
  if (gate.id === 'warehouse') {
    const days = Number.parseInt(gate.detail, 10);
    return gate.passed
      ? t('deliveryOrders.gateWithinWarehouseDeadlineDetail')
      : t('deliveryOrders.gateWarehouseLateDetail', { days: Number.isFinite(days) ? days : 0 });
  }
  if (gate.id === 'finance') {
    return gate.passed ? t('deliveryOrders.gateFinanceProceedDetail') : t('deliveryOrders.gateFinanceWaitsDetail');
  }
  return gate.detail;
}

function riskDetail(risk: OperationalRisk, t: ReturnType<typeof useI18n>['t']) {
  if (risk.code === 'BLOCKED_TASKS') {
    const count = Number.parseInt(risk.detail, 10);
    return t('deliveryOrders.riskBlockedTasksDetail', { count: Number.isFinite(count) ? count : 0 });
  }
  if (risk.code === 'REQUIRED_TASKS') {
    const count = Number.parseInt(risk.detail, 10);
    return t('deliveryOrders.riskRequiredTasksDetail', { count: Number.isFinite(count) ? count : 0 });
  }
  if (risk.code === 'FINANCE_NOT_READY') {
    return t('deliveryOrders.financeBlockedDetail');
  }
  return risk.detail;
}

function slaLabel(sla: OperationalRisk['sla'], t: ReturnType<typeof useI18n>['t']) {
  if (sla === 'Today') return t('deliveryOrders.slaToday');
  if (sla === 'Before close') return t('deliveryOrders.slaBeforeClose');
  return sla;
}

function extractTaskGateCounts(detail: string) {
  const matches = detail.match(/\d+/g) ?? [];
  return {
    blocked: Number(matches[1] ?? 0),
    required: Number(matches[0] ?? 0),
  };
}

function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} style={{ lineHeight: 1.1 }}>
            <NumberFormatter value={value} thousandSeparator />
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
