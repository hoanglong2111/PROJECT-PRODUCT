import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconArrowRight,
  IconChecklist,
  IconFileInvoice,
  IconGitBranch,
  IconShip,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  type BusinessFlowTag,
  type DeliveryOrder,
  type PurchaseOrder,
  type PurchaseRequest,
} from '../api/logistics';
import { DelayBadge } from '../components/DelayBadge';
import { EntityLink } from '../components/EntityLink';
import { FlowTagBadge } from '../components/FlowTagBadge';
import { PageError, PageLoading } from '../components/PageFeedback';
import { useI18n } from '../i18n';
import { calcDelay } from '../utils/delay';

type FlowRow = {
  linkedPurchaseOrders: PurchaseOrder[];
  purchaseRequest: PurchaseRequest;
  deliveryOrder: DeliveryOrder | null;
};

type WorkflowTab = BusinessFlowTag | 'all' | 'issues';

export function Workflow() {
  const { flowTagLabel, t } = useI18n();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<WorkflowTab>('all');
  const focusedDo = searchParams.get('do');
  const focusedPr = searchParams.get('pr');

  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: fetchPurchaseRequests,
  });
  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchLogisticsTasks,
  });

  const queries = [purchaseRequestsQuery, purchaseOrdersQuery, deliveryOrdersQuery, tasksQuery] as const;
  const errorQuery = queries.find((query) => query.isError);

  if (errorQuery) {
    return (
      <PageError
        title={t('workflow.errorTitle')}
        description={t('workflow.errorDescription')}
        error={errorQuery.error}
        onRetry={() => {
          void Promise.all(queries.map((query) => query.refetch()));
        }}
      />
    );
  }

  if (queries.some((query) => query.isLoading)) {
    return (
      <PageLoading
        title={t('workflow.title')}
        description={t('workflow.loadingDescription')}
        tableColumns={[
          t('workflow.prDemand'),
          t('workflow.poDo'),
          t('workflow.currentStage'),
          t('workflow.documentReadiness'),
          t('workflow.taskClosure'),
          t('workflow.warehouseRisk'),
        ]}
      />
    );
  }

  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const rows: FlowRow[] = purchaseRequests.flatMap<FlowRow>((purchaseRequest) => {
    const linkedOrders = deliveryOrders.filter(
      (deliveryOrder) =>
        purchaseRequest.linked_do_numbers.includes(deliveryOrder.order_info.order_number) ||
        deliveryOrder.order_info.request_code === purchaseRequest.requested_order_id,
    );

    const linkedPurchaseOrders = purchaseOrders.filter((order) => order.source_pr_codes.includes(purchaseRequest.requested_order_id));

    if (linkedOrders.length === 0) {
      return [{ linkedPurchaseOrders, purchaseRequest, deliveryOrder: null }];
    }

    return linkedOrders.map((deliveryOrder) => ({ linkedPurchaseOrders, purchaseRequest, deliveryOrder }));
  });

  const visibleRows = rows.filter(({ deliveryOrder, linkedPurchaseOrders, purchaseRequest }) => {
    if (focusedDo) {
      return deliveryOrder?.order_info.order_number === focusedDo;
    }

    if (focusedPr) {
      return purchaseRequest.requested_order_id === focusedPr;
    }

    const tags = new Set<BusinessFlowTag>([
      ...purchaseRequest.flow_tags,
      ...linkedPurchaseOrders.flatMap((order) => order.flow_tags),
      ...(deliveryOrder?.flow_tags ?? []),
    ]);
    const hasIssue =
      purchaseRequest.delay_days > 0 ||
      Boolean(deliveryOrder?.logistics_shipping.missing_documents.length) ||
      Boolean(deliveryOrder?.task_summary.blocked_tasks);

    return activeTab === 'all' || (activeTab === 'issues' ? hasIssue : tags.has(activeTab));
  });

  const activeRows = visibleRows.length > 0 ? visibleRows : rows;
  const blockedTaskCount = tasks.filter((task) => task.status === 'BLOCKED').length;
  const missingDocumentCount = deliveryOrders.reduce(
    (total, deliveryOrder) => total + deliveryOrder.logistics_shipping.missing_documents.length,
    0,
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('workflow.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('workflow.subtitle')}
          </Text>
        </div>
        <Button component={Link} to="/delivery-orders" rightSection={<IconArrowRight size={16} />}>
          {t('workflow.openDoBoard')}
        </Button>
      </Group>

      {(focusedDo || focusedPr) && (
        <Alert color="blue" icon={<IconGitBranch size={18} />}>
          {t('workflow.focusContext', { kind: focusedDo ? 'DO' : 'PR', id: focusedDo ?? focusedPr })}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('workflow.prChains')} value={rows.length} color="blue" />
        <Metric label={t('workflow.missingDocuments')} value={missingDocumentCount} color={missingDocumentCount > 0 ? 'orange' : 'teal'} />
        <Metric label={t('workflow.blockedTasks')} value={blockedTaskCount} color={blockedTaskCount > 0 ? 'red' : 'teal'} />
      </SimpleGrid>

      <Tabs value={activeTab} onChange={(value) => setActiveTab((value ?? 'all') as WorkflowTab)} variant="pills">
        <Tabs.List>
          {[
            ['all', t('common.all')],
            ['LINEAR', flowTagLabel('LINEAR')],
            ['BULK_PURCHASE', flowTagLabel('BULK_PURCHASE')],
            ['SPLIT_PURCHASE', flowTagLabel('SPLIT_PURCHASE')],
            ['PARTIAL_DELIVERY', flowTagLabel('PARTIAL_DELIVERY')],
            ['CONTAINER_CONSOLIDATION', flowTagLabel('CONTAINER_CONSOLIDATION')],
            ['issues', t('common.issues')],
          ].map(([value, label]) => (
            <Tabs.Tab key={value} value={value}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Paper withBorder p="lg">
        <Title order={3} mb="md">
          {t('workflow.endToEndFlow')}
        </Title>
        <Timeline active={3} bulletSize={30} lineWidth={2}>
          <Timeline.Item bullet={<IconFileInvoice size={16} />} title={t('workflow.timelinePrTitle')}>
            <Text size="sm" c="dimmed">
              {t('workflow.timelinePrDescription')}
            </Text>
          </Timeline.Item>
          <Timeline.Item bullet={<IconTruckDelivery size={16} />} title={t('workflow.timelinePoDoTitle')}>
            <Text size="sm" c="dimmed">
              {t('workflow.timelinePoDoDescription')}
            </Text>
          </Timeline.Item>
          <Timeline.Item bullet={<IconShip size={16} />} title={t('workflow.timelineDocumentsTitle')}>
            <Text size="sm" c="dimmed">
              {t('workflow.timelineDocumentsDescription')}
            </Text>
          </Timeline.Item>
          <Timeline.Item bullet={<IconChecklist size={16} />} title={t('workflow.timelineTaskTitle')}>
            <Text size="sm" c="dimmed">
              {t('workflow.timelineTaskDescription')}
            </Text>
          </Timeline.Item>
        </Timeline>
      </Paper>

      <Paper withBorder p={0}>
        <ScrollArea>
          <Table miw={1180} verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('workflow.prDemand')}</Table.Th>
                <Table.Th>{t('workflow.poDo')}</Table.Th>
                <Table.Th>{t('workflow.currentStage')}</Table.Th>
                <Table.Th>{t('workflow.documentReadiness')}</Table.Th>
                <Table.Th>{t('workflow.taskClosure')}</Table.Th>
                <Table.Th>{t('workflow.warehouseRisk')}</Table.Th>
                <Table.Th>{t('workflow.flowActions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeRows.map(({ deliveryOrder, linkedPurchaseOrders, purchaseRequest }) => {
                const linkedPo = deliveryOrder?.sap_integration.po_number ?? purchaseRequest.linked_po_numbers[0] ?? null;
                const flowTags = Array.from(
                  new Set<BusinessFlowTag>([
                    ...purchaseRequest.flow_tags,
                    ...linkedPurchaseOrders.flatMap((order) => order.flow_tags),
                    ...(deliveryOrder?.flow_tags ?? []),
                  ]),
                );
                const flowTasks = tasks.filter((task) =>
                  deliveryOrder
                    ? task.do_number === deliveryOrder.order_info.order_number
                    : task.request_code === purchaseRequest.requested_order_id,
                );
                const delay = deliveryOrder
                  ? calcDelay({
                      actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
                      plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
                      warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
                    })
                  : calcDelay({
                      actualEntryDate: purchaseRequest.actual_warehouse_entry_date,
                      plannedEntryDate: purchaseRequest.expected_arrival_date,
                      warehouseDeadline: purchaseRequest.warehouse_deadline_date,
                    });
                const completedTasks = flowTasks.filter((task) => task.status === 'COMPLETED').length;
                const taskProgress = flowTasks.length > 0 ? Math.round((completedTasks / flowTasks.length) * 100) : 0;
                const rowKey = `${purchaseRequest.requested_order_id}-${deliveryOrder?.order_info.order_number ?? 'no-do'}`;

                return (
                  <Table.Tr key={rowKey}>
                    <Table.Td>
                      <Text fw={700}>{purchaseRequest.requested_order_id}</Text>
                      <Text size="sm" c="dimmed">
                        {purchaseRequest.item_code}
                      </Text>
                      <Badge size="xs" color={purchaseRequest.delay_days > 0 ? 'red' : 'teal'} variant="light">
                        {purchaseRequest.delay_days > 0 ? `${purchaseRequest.delay_days}d ${t('common.risk')}` : t('delay.onTime')}
                      </Badge>
                      <FlowTagBadge compact tags={flowTags} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {linkedPo ?? t('workflow.poPending')}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {deliveryOrder?.order_info.order_number ?? t('workflow.waitingForDo')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StageBadge deliveryOrder={deliveryOrder} purchaseRequest={purchaseRequest} />
                    </Table.Td>
                    <Table.Td>
                      {deliveryOrder ? (
                        deliveryOrder.logistics_shipping.missing_documents.length > 0 ? (
                          <Badge color="orange">
                            {deliveryOrder.logistics_shipping.missing_documents.join(', ')}
                          </Badge>
                        ) : (
                          <Badge color="teal" variant="light">
                            {t('workflow.ready')}
                          </Badge>
                        )
                      ) : (
                        <Text size="sm" c="dimmed">
                          {t('workflow.waitingForDo')}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {deliveryOrder ? (
                        <>
                          <Progress value={taskProgress} size="sm" color={taskProgress === 100 ? 'teal' : 'blue'} mb={4} />
                          <Text size="xs" c="dimmed">
                            {t('workflow.tasksDone', { completed: completedTasks, total: flowTasks.length })}
                          </Text>
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">
                          {t('workflow.noTasks')}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <DelayBadge days={delay.days} type={delay.type} />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <EntityLink type="pr" id={purchaseRequest.requested_order_id} compact />
                        <EntityLink type="po" id={linkedPo} compact />
                        <EntityLink
                          type="do"
                          id={deliveryOrder?.order_info.order_number}
                          compact
                          disabledReason={t('entityLink.disabled', { type: 'DO' })}
                        />
                        <Button
                          component={Link}
                          to={
                            deliveryOrder
                              ? `/tasks?do=${deliveryOrder.order_info.order_number}`
                              : `/tasks?pr=${purchaseRequest.requested_order_id}`
                          }
                          size="xs"
                          variant="light"
                          disabled={!deliveryOrder}
                        >
                          {t('workflow.viewTasks')}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}

function StageBadge({
  deliveryOrder,
  purchaseRequest,
}: {
  deliveryOrder: DeliveryOrder | null;
  purchaseRequest: PurchaseRequest;
}) {
  const { statusLabel } = useI18n();

  if (!deliveryOrder) {
    const color = purchaseRequest.status === 'APPROVED' ? 'teal' : 'yellow';

    return (
      <Badge color={color} variant="light">
        {statusLabel(purchaseRequest.status)}
      </Badge>
    );
  }

  const color =
    deliveryOrder.order_info.status === 'DELIVERED'
      ? 'teal'
      : deliveryOrder.order_info.status === 'DELAYED'
        ? 'red'
        : deliveryOrder.task_summary.blocked_tasks > 0
          ? 'orange'
          : 'blue';

  return (
    <Badge color={color} variant="light">
      {statusLabel(deliveryOrder.order_info.status)}
    </Badge>
  );
}

function Metric({ color = 'blue', label, value }: { color?: string; label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={2} c={color}>
        {value}
      </Title>
    </Paper>
  );
}
