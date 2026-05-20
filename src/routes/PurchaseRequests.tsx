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
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle, IconCheck, IconChecklist, IconEye, IconFileInvoice, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { CreatePurchaseRequestDrawer } from '../components/CreateOrderForms';
import { getApiErrorMessage } from '../api/http';
import { DelayBadge } from '../components/DelayBadge';
import { EmptyState } from '../components/EmptyState';
import { EntityLink } from '../components/EntityLink';
import { FilterToolbar } from '../components/FilterToolbar';
import { FlowTagBadge } from '../components/FlowTagBadge';
import { PageError, PageLoading } from '../components/PageFeedback';
import { SourceLineTable } from '../components/SourceLineTable';
import { StatusBadge } from '../components/StatusBadge';
import { UpdatePurchaseRequestForm } from '../components/UpdateOrderForms';
import {
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  type PurchaseOrder,
  type PurchaseRequest,
  type PurchaseRequestStatus,
  updatePurchaseRequestStatus,
} from '../api/logistics';
import { useAuth } from '../auth/useAuth';
import { useEntityParam } from '../hooks/useEntityParam';
import { useI18n } from '../i18n';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { calcDelay } from '../utils/delay';

const priorityColor = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
} as const;

type PurchaseRequestTab = 'all' | 'ready' | 'partial' | 'fulfilled' | 'split' | 'risk';

export function PurchaseRequests() {
  const { flowTagLabel, priorityLabel, statusLabel, t } = useI18n();
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const { user } = useAuth();
  const { close: closePrParam, open: openPrParam, value: focusedPr } = useEntityParam('pr');
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);
  const [activeTab, setActiveTab] = useState<PurchaseRequestTab>('all');
  const [createOpened, createHandlers] = useDisclosure(false);
  const search = useWorkspaceStore((state) => state.prSearch);
  const statusFilter = useWorkspaceStore((state) => state.prStatusFilter);
  const riskOnly = useWorkspaceStore((state) => state.prRiskOnly);
  const setSearch = useWorkspaceStore((state) => state.setPrSearch);
  const setStatusFilter = useWorkspaceStore((state) => state.setPrStatusFilter);
  const setRiskOnly = useWorkspaceStore((state) => state.setPrRiskOnly);

  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: fetchPurchaseRequests,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });
  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const isFetching = purchaseRequestsQuery.isFetching;

  useEffect(() => {
    if (!focusedPr) {
      setSelectedPr(null);
      return;
    }

    if (purchaseRequests.length === 0) {
      return;
    }

    const matchedRequest = purchaseRequests.find((request) => request.requested_order_id === focusedPr);

    if (matchedRequest) {
      setSelectedPr(matchedRequest);
    }
  }, [focusedPr, purchaseRequests]);

  const filteredPurchaseRequests = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return purchaseRequests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesRisk = !riskOnly || request.delay_days > 0;
      const fulfillment = getPurchaseRequestFulfillment(request, purchaseOrders);
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'ready' && request.status === 'APPROVED') ||
        (activeTab === 'partial' && fulfillment === 'partial') ||
        (activeTab === 'fulfilled' && fulfillment === 'fulfilled') ||
        (activeTab === 'split' && request.flow_tags.includes('SPLIT_PURCHASE')) ||
        (activeTab === 'risk' && request.delay_days > 0);
      const matchesSearch = [
        request.requested_order_id,
        request.item_code,
        request.item_name,
        request.production_contract_number,
        request.purchasing_manager.name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

      const dateStr = request.requested_order_date || request.expected_arrival_date;
      const matchesMonth = !monthParam || (dateStr && dateStr.startsWith(monthParam));

      return matchesTab && matchesStatus && matchesRisk && matchesSearch && matchesMonth;
    });
  }, [activeTab, purchaseOrders, purchaseRequests, riskOnly, search, statusFilter, monthParam]);

  const tabCounts = useMemo(
    () => ({
      all: purchaseRequests.length,
      fulfilled: purchaseRequests.filter((request) => getPurchaseRequestFulfillment(request, purchaseOrders) === 'fulfilled').length,
      partial: purchaseRequests.filter((request) => getPurchaseRequestFulfillment(request, purchaseOrders) === 'partial').length,
      ready: purchaseRequests.filter((request) => request.status === 'APPROVED').length,
      risk: purchaseRequests.filter((request) => request.delay_days > 0).length,
      split: purchaseRequests.filter((request) => request.flow_tags.includes('SPLIT_PURCHASE')).length,
    }),
    [purchaseOrders, purchaseRequests],
  );

  const approvedCount = purchaseRequests.filter(
    (request) => request.status === 'APPROVED' || request.status === 'CONVERTED_TO_PO',
  ).length;
  const riskCount = purchaseRequests.filter((request) => request.delay_days > 0).length;
  const pendingCount = purchaseRequests.filter((request) => request.status === 'PENDING_APPROVAL').length;
  const canManagePurchaseRequests = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';

  const openDetail = (request: PurchaseRequest) => {
    setSelectedPr(request);
    openPrParam(request.requested_order_id, { clear: ['po', 'do', 'task'] });
  };

  const closeDrawer = () => {
    setSelectedPr(null);
    closePrParam({ clear: ['po', 'do', 'task'] });
  };

  if (purchaseRequestsQuery.isError) {
    return (
      <PageError
        title={t('purchaseRequests.errorTitle')}
        description={t('purchaseRequests.errorDescription')}
        error={purchaseRequestsQuery.error}
        onRetry={() => {
          void purchaseRequestsQuery.refetch();
        }}
      />
    );
  }

  if (purchaseRequestsQuery.isLoading) {
    return (
      <PageLoading
        title={t('purchaseRequests.title')}
        description={t('purchaseRequests.loadingDescription')}
        tableColumns={['PR', 'Item', t('forms.quantity'), 'Contract', t('common.deadline'), t('common.status'), t('common.risk')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('purchaseRequests.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('purchaseRequests.subtitle')}
          </Text>
        </div>
        <Group gap="xs">
          {canManagePurchaseRequests ? (
            <Button onClick={createHandlers.open} leftSection={<IconPlus size={16} />}>
              {t('purchaseRequests.create')}
            </Button>
          ) : null}
          <Button component={Link} to="/workflow" leftSection={<IconFileInvoice size={16} />} variant="light">
            {t('purchaseRequests.inspectWorkflow')}
          </Button>
        </Group>
      </Group>

      {focusedPr ? (
        <Paper withBorder p="md" className="flow-context">
          <Group justify="space-between">
            <Text size="sm">
              {t('purchaseRequests.flowContext', { id: focusedPr })}
            </Text>
            <Button component={Link} to={`/workflow?pr=${focusedPr}`} size="xs" variant="light">
              {t('purchaseRequests.openFlow')}
            </Button>
          </Group>
        </Paper>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('purchaseRequests.totalPr')} value={purchaseRequests.length} color="blue" icon={<IconFileInvoice size={22} />} />
        <Metric label={t('purchaseRequests.approvedOrPoReady')} value={approvedCount} color="teal" icon={<IconChecklist size={22} />} />
        <Metric label={t('common.risk')} value={riskCount} color="red" icon={<IconAlertTriangle size={22} />} />
      </SimpleGrid>

      <FilterToolbar
        activeTab={activeTab}
        isFetching={isFetching}
        onTabChange={setActiveTab}
        shown={filteredPurchaseRequests.length}
        tabs={[
          { label: t('common.all'), value: 'all', count: tabCounts.all },
          { label: t('common.readyForPo'), value: 'ready', count: tabCounts.ready },
          { label: t('common.partiallySourced'), value: 'partial', count: tabCounts.partial },
          { label: t('common.fullySourced'), value: 'fulfilled', count: tabCounts.fulfilled },
          { label: flowTagLabel('SPLIT_PURCHASE'), value: 'split', count: tabCounts.split },
          { label: t('common.atRisk'), value: 'risk', count: tabCounts.risk },
        ]}
      >
        <SimpleGrid cols={{ base: 1, md: 3 }} style={{ flex: 1 }}>
          <TextInput
            label={t('common.search')}
            placeholder={t('purchaseRequests.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label={t('common.status')}
            value={statusFilter}
            onChange={(value) => setStatusFilter((value ?? 'all') as PurchaseRequestStatus | 'all')}
            data={[
              { label: t('common.allStatuses'), value: 'all' },
              { label: statusLabel('NEW'), value: 'NEW' },
              { label: statusLabel('PENDING_APPROVAL'), value: 'PENDING_APPROVAL' },
              { label: statusLabel('APPROVED'), value: 'APPROVED' },
              { label: statusLabel('CONVERTED_TO_PO'), value: 'CONVERTED_TO_PO' },
              { label: statusLabel('REJECTED'), value: 'REJECTED' },
              { label: statusLabel('CANCELLED'), value: 'CANCELLED' },
            ]}
          />
          <Switch
            className="filter-switch"
            checked={riskOnly}
            onChange={(event) => setRiskOnly(event.currentTarget.checked)}
            label={t('purchaseRequests.filterRiskOnly')}
          />
        </SimpleGrid>
      </FilterToolbar>

      <Paper withBorder p={0}>
        <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={1280} verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>PR</Table.Th>
                <Table.Th>{t('forms.itemName')}</Table.Th>
                <Table.Th>{t('forms.quantity')}</Table.Th>
                <Table.Th>{t('forms.productionContract')}</Table.Th>
                <Table.Th>{t('common.deadline')}</Table.Th>
                <Table.Th>{t('forms.expectedArrival')}</Table.Th>
                <Table.Th>{t('common.buyer')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th>{t('common.risk')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredPurchaseRequests.map((request) => {
                const delay = calcDelay({
                  actualEntryDate: request.actual_warehouse_entry_date,
                  plannedEntryDate: request.expected_arrival_date,
                  warehouseDeadline: request.warehouse_deadline_date,
                });

                return (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <Text fw={700}>{request.requested_order_id}</Text>
                      <Badge size="xs" color={priorityColor[request.priority]} variant="light">
                        {priorityLabel(request.priority)}
                      </Badge>
                      <FlowTagBadge compact tags={request.flow_tags} />
                    </Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                      <Text fw={600}>{request.item_code}</Text>
                      <Text size="sm" c="dimmed" lineClamp={1} title={request.item_name}>
                        {request.item_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={request.quantity} thousandSeparator /> {request.unit}
                      </Text>
                    </Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '12rem' }}>
                      <Text size="sm" lineClamp={1} title={request.production_contract_number}>
                        {request.production_contract_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>{request.warehouse_deadline_date}</Table.Td>
                    <Table.Td>{request.expected_arrival_date ?? '-'}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {request.purchasing_manager.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {request.purchasing_manager.department}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={request.status} />
                    </Table.Td>
                    <Table.Td>
                      <DelayBadge days={delay.days} type={delay.type} />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('purchaseRequests.openDetail')}>
                        <ActionIcon variant="subtle" aria-label={t('purchaseRequests.openDetail')} onClick={() => openDetail(request)}>
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
        {filteredPurchaseRequests.length === 0 ? (
          <EmptyState title={t('purchaseRequests.emptyTitle')} description={t('purchaseRequests.emptyDescription')} />
        ) : null}
      </Paper>

      <CreatePurchaseRequestDrawer
        opened={createOpened}
        onClose={createHandlers.close}
        onCreated={(request) => openDetail(request)}
      />

      <Drawer opened={Boolean(focusedPr && selectedPr)} onClose={closeDrawer} title={t('purchaseRequests.detailTitle')} position="right" size="lg">
        {selectedPr ? (
          <PurchaseRequestDetail canManagePurchaseRequests={canManagePurchaseRequests} request={selectedPr} onUpdated={setSelectedPr} />
        ) : null}
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

function PurchaseRequestDetail({
  canManagePurchaseRequests,
  onUpdated,
  request,
}: {
  canManagePurchaseRequests: boolean;
  onUpdated?: (request: PurchaseRequest) => void;
  request: PurchaseRequest;
}) {
  const { formatNumber, statusLabel, t } = useI18n();

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>{request.requested_order_id}</Title>
          <Text c="dimmed">{request.item_name}</Text>
        </div>
        <StatusBadge status={request.status} />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Info label={t('forms.itemCode')} value={request.item_code} />
        <Info label={t('forms.quantity')} value={`${formatNumber(request.quantity)} ${request.unit}`} />
        <Info label={t('forms.productionContract')} value={request.production_contract_number} />
        <Info label={t('forms.warehouse')} value={request.warehouse_code} />
        <Info label={t('forms.requestedDate')} value={request.requested_order_date} />
        <Info label={t('forms.warehouseDeadline')} value={request.warehouse_deadline_date} />
        <Info label={t('forms.supplierExpectedDelivery')} value={request.supplier_expected_delivery_date ?? '-'} />
        <Info label={t('forms.expectedArrival')} value={request.expected_arrival_date ?? '-'} />
      </SimpleGrid>

      <Paper withBorder p="md" className={request.delay_days > 0 ? 'risk-panel' : undefined}>
        <Group justify="space-between">
          <div>
            <Text fw={700}>{t('purchaseRequests.delayCalculation')}</Text>
            <Text size="sm" c="dimmed">
              {t('purchaseRequests.delayDescription')}
            </Text>
          </div>
          <DelayBadge
            days={
              calcDelay({
                actualEntryDate: request.actual_warehouse_entry_date,
                plannedEntryDate: request.expected_arrival_date,
                warehouseDeadline: request.warehouse_deadline_date,
              }).days
            }
            type={
              calcDelay({
                actualEntryDate: request.actual_warehouse_entry_date,
                plannedEntryDate: request.expected_arrival_date,
                warehouseDeadline: request.warehouse_deadline_date,
              }).type
            }
          />
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Info label={t('common.requester')} value={`${request.requester.name} - ${request.requester.department}`} />
        <Info label={t('common.buyer')} value={`${request.purchasing_manager.name} - ${request.purchasing_manager.department}`} />
      </SimpleGrid>

      <PurchaseRequestStatusActions request={request} onUpdated={onUpdated} statusLabel={statusLabel} />

      <SourceLineTable lines={request.line_items} />

      {canManagePurchaseRequests ? (
        <UpdatePurchaseRequestForm request={request} onUpdated={onUpdated} />
      ) : (
        <Paper withBorder p="md">
          <Text fw={700}>{t('purchaseRequests.readOnlyForRole')}</Text>
          <Text size="sm" c="dimmed">
            {t('purchaseRequests.readOnlyForRoleDescription')}
          </Text>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Text fw={700} mb={6}>
          {t('purchaseRequests.linkedRecords')}
        </Text>
        <Group gap="xs">
          {request.linked_po_numbers.map((po) => (
            <EntityLink key={po} type="po" id={po} compact />
          ))}
          {request.linked_do_numbers.map((deliveryOrder) => (
            <Group key={deliveryOrder} gap="xs">
              <EntityLink type="workflow" id={deliveryOrder} compact />
              <EntityLink type="do" id={deliveryOrder} compact />
              <Button component={Link} to={`/tasks?do=${deliveryOrder}`} size="xs" variant="light">
                {t('purchaseRequests.viewTasks')}
              </Button>
            </Group>
          ))}
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <Text fw={700} mb={6}>
          {t('common.notes')}
        </Text>
        <Text size="sm">{request.notes}</Text>
      </Paper>
    </Stack>
  );
}

function PurchaseRequestStatusActions({
  onUpdated,
  request,
  statusLabel,
}: {
  onUpdated?: (request: PurchaseRequest) => void;
  request: PurchaseRequest;
  statusLabel: (status: string) => string;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const canManageStatus = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';
  const mutation = useMutation({
    mutationFn: (status: PurchaseRequestStatus) =>
      updatePurchaseRequestStatus(request.requested_order_id, {
        reason: t('purchaseRequests.statusChangedByPic'),
        status,
      }),
    onSuccess: (updatedRequest) => {
      onUpdated?.(updatedRequest);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['global-search'] }),
      ]);
    },
  });
  const options = getPurchaseRequestStatusActions(request.status);

  if (!canManageStatus && options.length === 0) {
    return null;
  }

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Text fw={700}>{t('purchaseRequests.statusControl')}</Text>
          <Text size="sm" c="dimmed">
            {t('purchaseRequests.statusControlDescription')}
          </Text>
        </div>
        <Badge color={canManageStatus ? 'teal' : 'gray'} variant="light">
          {canManageStatus ? t('purchaseRequests.picCanApprove') : t('purchaseRequests.picOnly')}
        </Badge>
      </Group>

      {mutation.isError ? (
        <Alert color="red" mt="md">
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      <Group gap="xs" mt="md">
        {options.length > 0 ? (
          options.map((status) => (
            <Button
              key={status}
              disabled={!canManageStatus}
              loading={mutation.isPending}
              onClick={() => mutation.mutate(status)}
              leftSection={status === 'APPROVED' ? <IconCheck size={16} /> : status === 'REJECTED' ? <IconX size={16} /> : undefined}
              color={status === 'APPROVED' ? 'teal' : status === 'REJECTED' || status === 'CANCELLED' ? 'red' : 'blue'}
              variant={status === 'APPROVED' ? 'filled' : 'light'}
            >
              {statusLabel(status)}
            </Button>
          ))
        ) : (
          <Text size="sm" c="dimmed">
            {t('purchaseRequests.noStatusAction')}
          </Text>
        )}
      </Group>
    </Paper>
  );
}

function getPurchaseRequestStatusActions(status: PurchaseRequestStatus): PurchaseRequestStatus[] {
  if (status === 'NEW') {
    return ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'];
  }

  if (status === 'PENDING_APPROVAL') {
    return ['APPROVED', 'REJECTED', 'CANCELLED'];
  }

  if (status === 'APPROVED') {
    return ['CANCELLED'];
  }

  if (status === 'REJECTED') {
    return ['PENDING_APPROVAL'];
  }

  return [];
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

function getPurchaseRequestFulfillment(request: PurchaseRequest, purchaseOrders: PurchaseOrder[]) {
  const total = request.line_items.reduce((sum, line) => sum + line.quantity, 0);
  const ordered = request.line_items.reduce((sum, line) => {
    const lineOrdered = purchaseOrders.reduce(
      (orderTotal, order) =>
        orderTotal +
        order.line_items
          .filter((orderLine) => orderLine.source_pr_code === request.requested_order_id && orderLine.source_pr_line_id === line.id)
          .reduce((lineTotal, orderLine) => lineTotal + orderLine.quantity, 0),
      0,
    );
    return sum + lineOrdered;
  }, 0);

  if (ordered <= 0) {
    return 'none';
  }

  return ordered >= total ? 'fulfilled' : 'partial';
}
