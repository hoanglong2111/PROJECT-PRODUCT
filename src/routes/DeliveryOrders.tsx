import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
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
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChecklist,
  IconClipboardCheck,
  IconEye,
  IconFileCheck,
  IconGitBranch,
  IconPlane,
  IconPlus,
  IconSearch,
  IconShip,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateDeliveryOrderDrawer } from '../components/CreateOrderForms';
import { DelayBadge } from '../components/DelayBadge';
import { EmptyState } from '../components/EmptyState';
import { EntityLink } from '../components/EntityLink';
import { FlowTagBadge } from '../components/FlowTagBadge';
import { PageError, PageLoading } from '../components/PageFeedback';
import { SourceLineTable } from '../components/SourceLineTable';
import { StatusBadge } from '../components/StatusBadge';
import { UpdateDeliveryOrderForm } from '../components/UpdateOrderForms';
import {
  fetchDeliveryOrders,
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  type DeliveryOrder,
  type DeliveryOrderStatus,
  type BusinessFlowTag,
} from '../api/logistics';
import { useEntityParam } from '../hooks/useEntityParam';
import { useI18n } from '../i18n';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { calcDelay } from '../utils/delay';
import {
  getDeliveryOrderRisks,
  getOperationalGates,
  getRiskColor,
  type OperationalRiskCode,
} from '../utils/operations';

const shippingIcon = {
  SEA: IconShip,
  AIR: IconPlane,
  ROAD: IconTruckDelivery,
};

type DeliveryOrderTab = 'processing' | 'handover' | 'completed' | 'issues' | 'all';

const deliveryOrderStatusTabs: Record<Exclude<DeliveryOrderTab, 'all'>, DeliveryOrderStatus[]> = {
  processing: ['CREATED', 'CONFIRMED', 'IN_PRODUCTION'],
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
  const { flowTagLabel, statusLabel, t } = useI18n();
  const { close: closeDoParam, open: openDoParam, value: focusedDo } = useEntityParam('do');
  const { value: focusedPr } = useEntityParam('pr');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryOrderTab>('processing');
  const [flowFilter, setFlowFilter] = useState<BusinessFlowTag | 'all'>('all');
  const [createOpened, createHandlers] = useDisclosure(false);
  const search = useWorkspaceStore((state) => state.doSearch);
  const riskOnly = useWorkspaceStore((state) => state.doRiskOnly);
  const setSearch = useWorkspaceStore((state) => state.setDoSearch);
  const setRiskOnly = useWorkspaceStore((state) => state.setDoRiskOnly);

  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: fetchPurchaseRequests,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });
  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const isFetching = deliveryOrdersQuery.isFetching;

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
      const statusMatchesTab =
        activeTab === 'all' ||
        deliveryOrderStatusTabs[activeTab].includes(deliveryOrder.order_info.status);
      const matchesFlow = flowFilter === 'all' || deliveryOrder.flow_tags.includes(flowFilter);
      const matchesRisk = !riskOnly || hasOperationalRisk(deliveryOrder) || deliveryOrder.sap_integration.sync_status !== 'SYNCED';
      const matchesSearch = [
        deliveryOrder.order_info.order_number,
        deliveryOrder.order_info.request_code,
        deliveryOrder.sap_integration.po_number,
        deliveryOrder.sap_integration.supplier_name,
        deliveryOrder.product_details.item_name_requested,
        ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      return statusMatchesTab && matchesFlow && matchesRisk && matchesSearch;
    });
  }, [activeTab, deliveryOrders, flowFilter, riskOnly, search]);

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
        tableColumns={['DO', 'PR/PO', t('common.supplier'), t('common.item'), t('common.route'), 'ETA', t('forms.warehouse'), t('shell.tasks'), t('common.documents'), t('common.status')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('deliveryOrders.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('deliveryOrders.subtitle')}
          </Text>
        </div>
        <Group gap="xs">
          <Button onClick={createHandlers.open} leftSection={<IconPlus size={16} />}>
            {t('deliveryOrders.create')}
          </Button>
          <Button component={Link} to="/workflow" leftSection={<IconGitBranch size={16} />} variant="light">
            {t('purchaseRequests.inspectWorkflow')}
          </Button>
        </Group>
      </Group>

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

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('deliveryOrders.activeDo')} value={deliveryOrders.filter((deliveryOrder) => deliveryOrder.order_info.status !== 'DELIVERED').length} />
        <Metric label={t('deliveryOrders.riskQueue')} value={riskCount} color="red" />
        <Metric
          label={t('deliveryOrders.completedTasks')}
          value={deliveryOrders.reduce((total, deliveryOrder) => total + deliveryOrder.task_summary.completed_tasks, 0)}
          color="teal"
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
        <ScrollArea>
          <Table miw={960} verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>DO</Table.Th>
                <Table.Th>
                  {t('common.supplier')} / {t('common.item')}
                </Table.Th>
                <Table.Th>{t('common.route')}</Table.Th>
                <Table.Th>
                  {t('forms.warehouse')} / {t('shell.tasks')}
                </Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDeliveryOrders.map((deliveryOrder) => {
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
                    <Table.Td>
                      <Text fw={700}>{deliveryOrder.order_info.order_number}</Text>
                      <Text size="xs" c="dimmed">
                        {deliveryOrder.order_info.tracking_number ?? t('deliveryOrders.noTracking')}
                      </Text>
                      <Group gap="xs">
                        <EntityLink type="pr" id={deliveryOrder.order_info.request_code} compact />
                        <EntityLink type="po" id={deliveryOrder.sap_integration.po_number} compact />
                      </Group>
                      <FlowTagBadge compact tags={deliveryOrder.flow_tags} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending')}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {deliveryOrder.sap_integration.actual_item_code ?? '-'} ·{' '}
                        {deliveryOrder.product_details.quantity.toLocaleString()} {deliveryOrder.product_details.unit}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <ShippingIcon size={18} />
                        <div>
                          <Text size="sm">{deliveryOrder.logistics_shipping.port_of_departure}</Text>
                          <Text size="sm" c="dimmed">
                            {deliveryOrder.logistics_shipping.port_of_destination}
                          </Text>
                        </div>
                      </Group>
                      <Text size="xs" c="dimmed" mt={4}>
                        ETA {deliveryOrder.logistics_shipping.eta_planned ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{deliveryOrder.warehouse_tracking.warehouse_code}</Text>
                      <Text size="xs" c={delay.isLate ? 'red' : 'dimmed'}>
                        {t('common.deadline')} {deliveryOrder.warehouse_tracking.warehouse_deadline}
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
                          <Badge
                            size="xs"
                            color={deliveryOrder.sap_integration.sync_status === 'SYNCED' ? 'teal' : 'orange'}
                            variant="light"
                          >
                            {statusLabel(deliveryOrder.sap_integration.sync_status)}
                          </Badge>
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
                          onClick={() => {
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
      </Paper>

      <Drawer opened={Boolean(selectedDeliveryOrder)} onClose={closeDetail} title={t('deliveryOrders.detailTitle')} position="right" size="xl">
        {selectedDeliveryOrder ? <DeliveryOrderDetail deliveryOrder={selectedDeliveryOrder} /> : null}
      </Drawer>

      <CreateDeliveryOrderDrawer
        opened={createOpened}
        onClose={createHandlers.close}
        deliveryOrders={deliveryOrders}
        purchaseOrders={purchaseOrders}
        purchaseRequests={purchaseRequests}
        onCreated={(order) => {
          setActiveTab('processing');
          setSelectedId(order.id);
          openDoParam(order.order_info.order_number, { clear: ['pr', 'po', 'task'] });
        }}
      />
    </Stack>
  );
}

function DeliveryOrderDetail({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const { documentLabel, statusLabel, t } = useI18n();
  const gates = getOperationalGates(deliveryOrder);
  const risks = getDeliveryOrderRisks(deliveryOrder);
  const taskProgress =
    deliveryOrder.task_summary.total_tasks > 0
      ? Math.round((deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100)
      : 0;

  return (
    <Paper withBorder p="lg">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={2}>{deliveryOrder.order_info.order_number}</Title>
          <Text c="dimmed">
            {deliveryOrder.sap_integration.po_number ?? t('deliveryOrders.poPending')} - {deliveryOrder.product_details.item_name_requested}
          </Text>
          <FlowTagBadge tags={deliveryOrder.flow_tags} />
        </div>
        <Group gap="xs">
          <StatusBadge status={deliveryOrder.order_info.status} />
        </Group>
      </Group>

      <Group gap="xs" mb="md">
        <EntityLink type="workflow" id={deliveryOrder.order_info.order_number} />
        <EntityLink type="pr" id={deliveryOrder.order_info.request_code} />
        <EntityLink type="po" id={deliveryOrder.sap_integration.po_number} />
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
        <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="md">
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
              <Info label={t('common.supplier')} value={deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending')} />
              <Info label={t('forms.incoterms')} value={deliveryOrder.logistics_shipping.incoterms} />
              <Info label="ETD / ETA" value={`${deliveryOrder.logistics_shipping.etd_planned ?? '-'} / ${deliveryOrder.logistics_shipping.eta_planned ?? '-'}`} />
              <Info label={t('forms.plannedWarehouseEntry')} value={deliveryOrder.warehouse_tracking.planned_entry_date ?? '-'} />
            </Stack>
            <Timeline active={1} bulletSize={26} lineWidth={2}>
              <Timeline.Item title={t('deliveryOrders.productionReady')}>
                <Text size="sm" c="dimmed">
                  {deliveryOrder.warehouse_tracking.production_ready_date ?? statusLabel('PENDING')}
                </Text>
              </Timeline.Item>
              <Timeline.Item title={statusLabel('IN_TRANSIT')}>
                <Text size="sm" c="dimmed">
                  {deliveryOrder.logistics_shipping.port_of_departure} to {deliveryOrder.logistics_shipping.port_of_destination}
                </Text>
              </Timeline.Item>
              <Timeline.Item title={t('deliveryOrders.warehouseEntry')}>
                <Text size="sm" c="dimmed">
                  {t('common.deadline')} {deliveryOrder.warehouse_tracking.warehouse_deadline}
                </Text>
              </Timeline.Item>
            </Timeline>
          </SimpleGrid>
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
                        {gate.detail || '-'}
                      </Text>
                    </div>
                    <Badge color={gate.passed ? 'teal' : 'orange'} variant="light">
                      {gate.passed ? t('deliveryOrders.gatePassed') : t('deliveryOrders.gateBlocked')}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('common.owner')}: {gate.owner}
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
                        <Text size="sm">{risk.detail}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {risk.owner} · SLA {risk.sla}
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
              <Info label="eFMS Booking" value={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number} />
              <Info label="MBL / Vessel" value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
              <Info label="POL / POD" value={`${deliveryOrder.logistics_shipping.port_of_departure} -> ${deliveryOrder.logistics_shipping.port_of_destination}`} />
              <Info label={t('deliveryOrders.ofAfDebitNote')} value={gates.find((gate) => gate.id === 'documents')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingDocuments')} />
              <Info label={t('deliveryOrders.finalDebitNote')} value={gates.find((gate) => gate.id === 'finance')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingOpsGates')} />
              <Info label={t('deliveryOrders.podArchive')} value={deliveryOrder.warehouse_tracking.actual_entry_date ? t('deliveryOrders.ready') : t('deliveryOrders.waitingWarehouse')} />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {['Invoice', 'Packing List', 'B/L', 'CO'].map((documentName) => {
              const checked = deliveryOrder.logistics_shipping.documents_list.includes(documentName);

              return (
                <Paper key={documentName} withBorder p="md">
                  <Checkbox checked={checked} readOnly label={documentLabel(documentName)} />
                  <Text size="sm" c={checked ? 'teal' : 'red'} mt={6}>
                    {checked ? t('deliveryOrders.received') : t('deliveryOrders.missingForCustoms')}
                  </Text>
                </Paper>
              );
            })}
          </SimpleGrid>
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
    </Paper>
  );
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
  const { t } = useI18n();
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
            {risks[0] ? `${risks[0].owner} · SLA ${risks[0].sla}` : t('deliveryOrders.noOpsRisk')}
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
    sap: t('deliveryOrders.gateSap'),
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
    SAP_SYNC: t('opsRisk.sapSync'),
    WAREHOUSE_DELAY: t('opsRisk.warehouseDelay'),
  };

  return labels[code];
}

function Metric({ color = 'blue', label, value }: { color?: string; label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2} c={color}>
        <NumberFormatter value={value} thousandSeparator />
      </Title>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
