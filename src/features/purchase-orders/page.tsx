import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  Tabs,
  Select,
  Checkbox,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconEye,
  IconPlugConnected,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShoppingCart,
  IconChecklist,
  IconGitBranch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CreatePurchaseOrderDrawer } from '@shared/components/CreateOrderForms';
import { EntityLink } from '@shared/components/EntityLink';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { FlowTagBadge } from '@shared/components/FlowTagBadge';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { SourceLineTable } from '@shared/components/SourceLineTable';
import { getApiErrorMessage } from '@shared/api/http';
import {
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  syncPurchaseOrderSap,
  type PurchaseOrder,
  advancePurchaseOrderStage,
  fetchPurchaseOrderStageTasks,
  type Gd1PoStageTask,
  type Gd1PoStatus,
  updatePoStageTask,
} from '@shared/api/logistics';
import { useAuth } from '@shared/auth/useAuth';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

type PurchaseOrderTab = 'all' | 'single' | 'bulk' | 'awaiting' | 'partial' | 'closed' | 'sap';

export function PurchaseOrders() {
  const { flowTagLabel, statusLabel, t } = useI18n();
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const { user } = useAuth();
  const { close: closePoParam, open: openPoParam, value: focusedPo } = useEntityParam('po');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<PurchaseOrderTab>('all');
  const [search, setSearch] = useState('');
  const [createOpened, createHandlers] = useDisclosure(false);

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });
  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: fetchPurchaseRequests,
  });
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const isFetching = purchaseOrdersQuery.isFetching;
  const canCreatePurchaseOrders = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';

  useEffect(() => {
    if (!focusedPo) {
      setSelectedPo(null);
      return;
    }

    if (purchaseOrders.length === 0) {
      return;
    }

    const matchedOrder = purchaseOrders.find((order) => order.po_number === focusedPo);

    if (matchedOrder) {
      setSelectedPo(matchedOrder);
    }
  }, [focusedPo, purchaseOrders]);

  const filteredPurchaseOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return purchaseOrders.filter((order) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'single' && order.flow_tags.includes('LINEAR')) ||
        (activeTab === 'bulk' && order.flow_tags.includes('BULK_PURCHASE')) ||
        (activeTab === 'awaiting' && order.linked_do_numbers.length === 0) ||
        (activeTab === 'partial' && order.status === 'PARTIALLY_DELIVERED') ||
        (activeTab === 'closed' && order.status === 'CLOSED') ||
        (activeTab === 'sap' && order.sap_sync_status !== 'SYNCED');
      const matchesSearch = [order.po_number, order.supplier_code, order.supplier_name, order.source_pr_codes.join(' '), order.linked_do_numbers.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      const dateStr = order.order_date;
      const matchesMonth = !monthParam || (dateStr && dateStr.startsWith(monthParam));

      return matchesTab && matchesSearch && matchesMonth;
    });
  }, [activeTab, purchaseOrders, search, monthParam]);
  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visiblePurchaseOrders,
  } = useListPagination(filteredPurchaseOrders, [activeTab, monthParam, search]);

  const tabCounts = useMemo(
    () => ({
      all: purchaseOrders.length,
      awaiting: purchaseOrders.filter((order) => order.linked_do_numbers.length === 0).length,
      bulk: purchaseOrders.filter((order) => order.flow_tags.includes('BULK_PURCHASE')).length,
      closed: purchaseOrders.filter((order) => order.status === 'CLOSED').length,
      partial: purchaseOrders.filter((order) => order.status === 'PARTIALLY_DELIVERED').length,
      sap: purchaseOrders.filter((order) => order.sap_sync_status !== 'SYNCED').length,
      single: purchaseOrders.filter((order) => order.flow_tags.includes('LINEAR')).length,
    }),
    [purchaseOrders],
  );

  const openDetail = (order: PurchaseOrder) => {
    setSelectedPo(order);
    openPoParam(order.po_number, { clear: ['pr', 'do', 'task'] });
  };

  const closeDrawer = () => {
    setSelectedPo(null);
    closePoParam({ clear: ['pr', 'do', 'task'] });
  };

  if (purchaseOrdersQuery.isError) {
    return (
      <PageError
        title={t('purchaseOrders.errorTitle')}
        description={t('purchaseOrders.errorDescription')}
        error={purchaseOrdersQuery.error}
        onRetry={() => {
          void purchaseOrdersQuery.refetch();
        }}
      />
    );
  }

  if (purchaseOrdersQuery.isLoading) {
    return (
      <PageLoading
        title={t('purchaseOrders.title')}
        description={t('purchaseOrders.loadingDescription')}
        tableColumns={['PO', t('common.supplier'), t('purchaseOrders.sourcePr'), t('common.linkedDo'), t('purchaseOrders.total'), 'SAP', t('common.status')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('purchaseOrders.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('purchaseOrders.subtitle')}
          </Text>
        </div>
        <Group gap="xs">
          {canCreatePurchaseOrders ? (
            <Button onClick={createHandlers.open} leftSection={<IconPlus size={16} />}>
              {t('purchaseOrders.create')}
            </Button>
          ) : null}
          <Badge leftSection={<IconShoppingCart size={14} />} size="lg" variant="light">
            {t('purchaseOrders.sapSource')}
          </Badge>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('purchaseOrders.totalPo')} value={purchaseOrders.length} color="blue" icon={<IconShoppingCart size={22} />} />
        <Metric label={t('purchaseOrders.synced')} value={purchaseOrders.filter((order) => order.sap_sync_status === 'SYNCED').length} color="teal" icon={<IconCircleCheck size={22} />} />
        <Metric label={t('purchaseOrders.pendingSap')} value={purchaseOrders.filter((order) => order.sap_sync_status !== 'SYNCED').length} color="orange" icon={<IconAlertTriangle size={22} />} />
      </SimpleGrid>

      <FilterToolbar
        activeTab={activeTab}
        isFetching={isFetching}
        onTabChange={setActiveTab}
        shown={filteredPurchaseOrders.length}
        tabs={[
          { label: t('common.all'), value: 'all', count: tabCounts.all },
          { label: t('common.singleSource'), value: 'single', count: tabCounts.single },
          { label: flowTagLabel('BULK_PURCHASE'), value: 'bulk', count: tabCounts.bulk },
          { label: t('common.awaitingDo'), value: 'awaiting', count: tabCounts.awaiting },
          { label: flowTagLabel('PARTIAL_DELIVERY'), value: 'partial', count: tabCounts.partial },
          { label: t('common.closed'), value: 'closed', count: tabCounts.closed },
          { label: t('common.sapIssues'), value: 'sap', count: tabCounts.sap },
        ]}
      >
        <TextInput
          label={t('common.search')}
          placeholder={t('purchaseOrders.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={{ base: '100%', sm: 360 }}
        />
      </FilterToolbar>

      <Paper withBorder p={0}>
        {filteredPurchaseOrders.length === 0 ? (
          <EmptyState title={t('purchaseOrders.emptyTitle')} description={t('purchaseOrders.emptyDescription')} />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={1220} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>PO</Table.Th>
                  <Table.Th>{t('common.supplier')}</Table.Th>
                  <Table.Th>{t('purchaseOrders.sourcePr')}</Table.Th>
                  <Table.Th>{t('common.linkedDo')}</Table.Th>
                  <Table.Th>{t('purchaseOrders.total')}</Table.Th>
                  <Table.Th>SAP</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visiblePurchaseOrders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '20rem' }}>
                      <Text fw={700} lineClamp={1} title={order.po_number}>{order.po_number}</Text>
                      <Text size="xs" c="dimmed">
                        {order.order_date}
                      </Text>
                      <FlowTagBadge compact tags={order.flow_tags} />
                    </Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                      <Text size="sm" fw={600} lineClamp={1} title={order.supplier_name}>
                        {order.supplier_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {order.supplier_code}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {order.source_pr_codes.map((prCode) => (
                          <EntityLink key={prCode} type="pr" id={prCode} compact />
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {order.linked_do_numbers.map((doCode) => (
                          <EntityLink key={doCode} type="do" id={doCode} compact />
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={order.total_amount} thousandSeparator /> {order.currency}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={order.sap_sync_status === 'SYNCED' ? 'teal' : 'orange'} variant="light">
                        {statusLabel(order.sap_sync_status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={order.status} />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('purchaseOrders.openDetail')}>
                        <ActionIcon variant="subtle" aria-label={t('purchaseOrders.openDetail')} onClick={() => openDetail(order)}>
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
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={filteredPurchaseOrders.length}
        />
      </Paper>

      <CreatePurchaseOrderDrawer
        opened={createOpened}
        onClose={createHandlers.close}
        purchaseOrders={purchaseOrders}
        purchaseRequests={purchaseRequests}
        onCreated={(order) => openDetail(order)}
      />

      <Drawer opened={Boolean(focusedPo && selectedPo)} onClose={closeDrawer} title={t('purchaseOrders.detailTitle')} position="right" size="lg">
        {selectedPo ? <PurchaseOrderDetail order={selectedPo} onUpdated={setSelectedPo} /> : null}
      </Drawer>
    </Stack>
  );
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
            {value}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}

function Gd1PoStageControlPanel({
  order,
  onUpdated,
}: {
  order: PurchaseOrder;
  onUpdated?: (order: PurchaseOrder) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const [selectedStage, setSelectedStage] = useState<Gd1PoStatus | ''>('');

  const canManageStage = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';

  const mutation = useMutation({
    mutationFn: (stage: Gd1PoStatus) => advancePurchaseOrderStage(order.po_number, stage),
    onSuccess: () => {
      setSelectedStage('');
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-order-tasks', order.po_number] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ]);
    },
  });

  if (!canManageStage) return null;

  return (
    <Paper withBorder p="md" className="ops-panel">
      <Stack gap="xs">
        <Text fw={700}>{t('purchaseOrders.stageUpdateTitle')}</Text>
        <Text size="sm" c="dimmed">
          {t('purchaseOrders.stageUpdateDescription')}
        </Text>
        <Group align="flex-end" gap="xs">
          <Select
            label={t('purchaseOrders.selectNextStage')}
            placeholder={t('purchaseOrders.selectStagePlaceholder')}
            data={[
              { label: t('purchaseOrders.stageSentNCC'), value: 'SENT' },
              { label: t('purchaseOrders.stageConfirmedNCC'), value: 'CONFIRMED' },
              { label: t('purchaseOrders.stageReadyToShip'), value: 'READY_TO_SHIP' },
              { label: t('purchaseOrders.stageShipped'), value: 'SHIPPED' },
              { label: t('purchaseOrders.stageReceived'), value: 'RECEIVED' },
              { label: t('purchaseOrders.stageClosed'), value: 'CLOSED' },
            ]}
            value={selectedStage}
            onChange={(val) => setSelectedStage((val || '') as Gd1PoStatus | '')}
            style={{ flex: 1 }}
          />
          <Button
            onClick={() => selectedStage && mutation.mutate(selectedStage)}
            loading={mutation.isPending}
            disabled={!selectedStage}
            color="blue"
          >
            {t('common.save')}
          </Button>
        </Group>
        {mutation.isError && (
          <Alert color="red" mt="xs">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

function Gd1PoStageChecklist({ order }: { order: PurchaseOrder }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();

  const tasksQuery = useQuery({
    queryKey: ['purchase-order-tasks', order.po_number],
    queryFn: () => fetchPurchaseOrderStageTasks(order.po_number),
    enabled: !!order.po_number,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updatePoStageTask(taskId, { status }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-order-tasks', order.po_number] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ]);
    },
  });

  const tasks = tasksQuery.data ?? [];

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconChecklist size={20} />
            <Text fw={700}>{t('purchaseOrders.stageChecklistTitle')}</Text>
          </Group>
          <Badge color="blue" variant="light">
            {t('purchaseOrders.stageChecklistCompleted', {
              completed: tasks.filter((t) => t.status === 'DONE').length,
              total: tasks.length,
            })}
          </Badge>
        </Group>

        {tasksQuery.isLoading ? (
          <Group justify="center" p="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">{t('purchaseOrders.stageChecklistLoading')}</Text>
          </Group>
        ) : tasks.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('purchaseOrders.stageChecklistEmpty')}
          </Text>
        ) : (
          <Stack gap="xs">
            {tasks.map((task) => {
              const isCompleted = task.status === 'DONE';
              return (
                <Paper
                  key={task.id}
                  withBorder
                  p="sm"
                  style={{
                    backgroundColor: isCompleted ? 'rgba(46, 125, 50, 0.05)' : undefined,
                    borderColor: isCompleted ? 'var(--mantine-color-teal-outline)' : undefined,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" style={{ flex: 1 }}>
                      <Checkbox
                        checked={isCompleted}
                        onChange={(e) =>
                          completeMutation.mutate({
                            taskId: task.id,
                            status: e.currentTarget.checked ? 'DONE' : 'PENDING',
                          })
                        }
                        color="teal"
                      />
                      <div>
                        <Text fw={600} size="sm" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {task.task_name}
                        </Text>
                        <Group gap="xs" mt={4}>
                          <Badge size="xs" color="gray" variant="light">
                            Chặng: {task.po_stage}
                          </Badge>
                          <Badge size="xs" color="blue" variant="light">
                            Vai trò: {task.assignee_id}
                          </Badge>
                          {task.due_date && (
                            <Text size="xs" c="dimmed">
                              Hạn: {new Date(task.due_date).toLocaleDateString()}
                            </Text>
                          )}
                        </Group>
                      </div>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function PurchaseOrderDetail({ onUpdated, order }: { onUpdated?: (order: PurchaseOrder) => void; order: PurchaseOrder }) {
  const { formatNumber, statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canSyncSap = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';
  const syncMutation = useMutation({
    mutationFn: () => syncPurchaseOrderSap(order.po_number),
    onSuccess: (updatedOrder) => {
      onUpdated?.(updatedOrder);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['global-search'] }),
      ]);
    },
  });
  const sapSynced = order.sap_sync_status === 'SYNCED';

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>{order.po_number}</Title>
          <Text c="dimmed">
            {order.supplier_name} - {order.warehouse_code}
          </Text>
        </div>
        <StatusBadge status={order.status} />
      </Group>

      <Paper withBorder p="md" className={sapSynced ? 'ops-panel' : 'ops-panel-risk'}>
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Text fw={700}>{t('purchaseOrders.sapSyncControl')}</Text>
            <Text size="sm" c="dimmed">
              {sapSynced ? t('purchaseOrders.sapSyncedDescription') : t('purchaseOrders.sapPendingDescription')}
            </Text>
          </div>
          <Button
            disabled={!canSyncSap || order.status === 'CLOSED'}
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            leftSection={sapSynced ? <IconRefresh size={16} /> : <IconPlugConnected size={16} />}
            variant={sapSynced ? 'light' : 'filled'}
          >
            {sapSynced ? t('purchaseOrders.retrySapSync') : t('purchaseOrders.syncSap')}
          </Button>
        </Group>
        {!canSyncSap ? (
          <Text size="sm" c="dimmed" mt="sm">
            {t('purchaseOrders.sapSyncPicOnly')}
          </Text>
        ) : null}
        {syncMutation.isError ? (
          <Alert color="red" mt="md">
            {getApiErrorMessage(syncMutation.error)}
          </Alert>
        ) : null}
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Info label={t('forms.supplierCode')} value={order.supplier_code} />
        <Info label={t('forms.orderDate')} value={order.order_date} />
        <Info label={t('forms.totalAmount')} value={`${formatNumber(order.total_amount)} ${order.currency}`} />
        <Info label={t('purchaseOrders.sap')} value={statusLabel(order.sap_sync_status)} />
      </SimpleGrid>

      <Gd1PoStageControlPanel order={order} onUpdated={onUpdated} />

      <Gd1PoStageChecklist order={order} />

      <SourceLineTable lines={order.line_items} />

      <Paper withBorder p="md">
        <Text fw={700} mb="sm">
          {t('purchaseOrders.entityLinks')}
        </Text>
        <Group gap="xs">
          {order.source_pr_codes.map((prCode) => (
            <EntityLink key={prCode} type="pr" id={prCode} />
          ))}
          {order.linked_do_numbers.map((doCode) => (
            <EntityLink key={doCode} type="do" id={doCode} />
          ))}
          {order.linked_do_numbers[0] ? <EntityLink type="workflow" id={order.linked_do_numbers[0]} /> : null}
        </Group>
      </Paper>
    </Stack>
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
