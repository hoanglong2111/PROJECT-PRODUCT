import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  NumberFormatter,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCircleCheck,
  IconDeviceFloppy,
  IconEye,
  IconGitBranch,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconTrash,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchItems, type Item } from '@shared/api/items';
import {
  confirmPurchaseOrder,
  createLot,
  createPurchaseOrder,
  deletePoLot,
  fetchPurchaseOrder,
  fetchPurchaseOrderLotPlanning,
  fetchPurchaseOrders,
  movePoLotLine,
  reorderPoLotLines,
  reorderPoLots,
  sendPurchaseOrder,
  splitPoLotLine,
  updatePoLot,
  updatePurchaseOrder,
  type ConfirmPurchaseOrderPayload,
  type CreateLotPayload,
  type CreatePurchaseOrderV1Payload,
  type ListPurchaseOrdersParams,
  type PoLot,
  type PoLotLine,
  type PoLotStatus,
  type PurchaseOrderLinePayload,
  type PurchaseOrderLineV1,
  type PurchaseOrderLotPlanning,
  type PurchaseOrderStatusV1,
  type PurchaseOrderTypeV1,
  type PurchaseOrderV1,
  type UpdatePurchaseOrderV1Payload,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchCurrencies,
  fetchIncoterms,
  fetchSuppliers,
  fetchTransportModes,
  type Currency,
  type Incoterm,
  type Supplier,
  type TransportMode,
} from '@shared/api/tradeMasterData';
import { useAuth } from '@shared/auth/useAuth';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { getApiErrorMessage } from '@shared/lib/errors';

type PurchaseOrderWorkbench = 'list' | 'create' | 'detail';
type PurchaseOrderStatusFilter = 'all' | PurchaseOrderStatusV1;

const PAGE_SIZE = 20;
const purchaseOrderStatusOptions: PurchaseOrderStatusV1[] = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'CANCELLED',
];
const poTypeOptions: PurchaseOrderTypeV1[] = ['SEA', 'AIR', 'DOMESTIC'];
const lotStatusOptions: PoLotStatus[] = ['PLANNED', 'READY', 'ASSIGNED_TO_SHIPMENT', 'SHIPPED', 'CANCELLED'];
const lockedLotStatuses = new Set<PoLotStatus>(['ASSIGNED_TO_SHIPMENT', 'SHIPPED', 'CANCELLED']);

type SelectOption = {
  label: string;
  value: string;
};

type PoLineDraft = {
  clientId: string;
  line_no: number;
  item_id: string;
  item_customs_profile_id: string;
  item_description: string;
  qty_ordered: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
  expected_eta_line: string;
  notes: string;
};

type PoFormDraft = {
  po_no: string;
  contract_no: string;
  supplier_id: string;
  currency_id: string;
  incoterm_id: string;
  transport_mode_id: string;
  po_type: string;
  payment_term: string;
  exchange_rate: number;
  expected_etd: string;
  expected_eta: string;
  notes: string;
  lines: PoLineDraft[];
};

type LotDraft = {
  id?: string;
  lot_no: string;
  lot_name: string;
  status: PoLotStatus;
  planned_cargo_ready_date: string;
  planned_etd: string;
  planned_eta: string;
  sort_order: number;
  notes: string;
};

type SplitDraft = {
  sourceLot: PoLot;
  sourceLine: PoLotLine;
  target_lot_id: string;
  split_qty: number;
};

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function nullIfEmpty(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function newLineDraft(index: number): PoLineDraft {
  return {
    clientId: `line-${Date.now()}-${index}`,
    line_no: index + 1,
    item_id: '',
    item_customs_profile_id: '',
    item_description: '',
    qty_ordered: 1,
    unit: 'PCS',
    unit_price: 0,
    tax_rate: 0,
    discount_pct: 0,
    expected_eta_line: '',
    notes: '',
  };
}

function createInitialPoDraft(order?: PurchaseOrderV1): PoFormDraft {
  return {
    po_no: order?.po_no ?? `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    contract_no: order?.contract_no ?? '',
    supplier_id: order?.supplier_id ?? '',
    currency_id: order?.currency_id ?? '',
    incoterm_id: order?.incoterm_id ?? '',
    transport_mode_id: order?.transport_mode_id ?? '',
    po_type: order?.po_type ?? '',
    payment_term: order?.payment_term ?? '',
    exchange_rate: toNumber(order?.exchange_rate, 1) || 1,
    expected_etd: dateOnly(order?.expected_etd),
    expected_eta: dateOnly(order?.expected_eta),
    notes: order?.notes ?? '',
    lines: order?.lines?.length
      ? order.lines.map((line, index) => ({
          clientId: line.id,
          line_no: line.line_no,
          item_id: line.item_id,
          item_customs_profile_id: line.item_customs_profile_id ?? '',
          item_description: line.item_description ?? '',
          qty_ordered: toNumber(line.qty_ordered, 1),
          unit: line.unit ?? 'PCS',
          unit_price: toNumber(line.unit_price),
          tax_rate: toNumber(line.tax_rate),
          discount_pct: toNumber(line.discount_pct),
          expected_eta_line: dateOnly(line.expected_eta_line),
          notes: line.notes ?? '',
        }))
      : [newLineDraft(0)],
  };
}

function buildPoPayload(draft: PoFormDraft): CreatePurchaseOrderV1Payload {
  return {
    po_no: draft.po_no.trim(),
    supplier_id: draft.supplier_id,
    contract_no: nullIfEmpty(draft.contract_no),
    currency_id: nullIfEmpty(draft.currency_id),
    incoterm_id: nullIfEmpty(draft.incoterm_id),
    transport_mode_id: nullIfEmpty(draft.transport_mode_id),
    po_type: nullIfEmpty(draft.po_type) as PurchaseOrderTypeV1 | null,
    payment_term: nullIfEmpty(draft.payment_term),
    exchange_rate: draft.exchange_rate || 1,
    expected_etd: nullIfEmpty(draft.expected_etd),
    expected_eta: nullIfEmpty(draft.expected_eta),
    notes: nullIfEmpty(draft.notes),
    lines: draft.lines
      .filter((line) => line.item_id && Number(line.qty_ordered) > 0)
      .map<PurchaseOrderLinePayload>((line, index) => ({
        line_no: line.line_no || index + 1,
        item_id: line.item_id,
        item_customs_profile_id: nullIfEmpty(line.item_customs_profile_id),
        item_description: nullIfEmpty(line.item_description),
        qty_ordered: Number(line.qty_ordered),
        unit: nullIfEmpty(line.unit),
        unit_price: Number(line.unit_price) || 0,
        tax_rate: Number(line.tax_rate) || 0,
        discount_pct: Number(line.discount_pct) || 0,
        expected_eta_line: nullIfEmpty(line.expected_eta_line),
        notes: nullIfEmpty(line.notes),
      })),
  };
}

function buildPoPatchPayload(draft: PoFormDraft): UpdatePurchaseOrderV1Payload {
  const payload = buildPoPayload(draft);
  const { lines: _lines, ...header } = payload;
  return header;
}

function totalPoAmount(lines: PurchaseOrderLineV1[] | PoLineDraft[] | undefined) {
  return (lines ?? []).reduce((total, line) => {
    if ('qty_ordered' in line) {
      return total + toNumber(line.qty_ordered) * toNumber(line.unit_price);
    }
    return total;
  }, 0);
}

function usePoInvalidation(purchaseOrderId?: string) {
  const queryClient = useQueryClient();
  return () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      purchaseOrderId
        ? queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrderDetail(purchaseOrderId) })
        : Promise.resolve(),
      purchaseOrderId
        ? queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrderLotPlanning(purchaseOrderId) })
        : Promise.resolve(),
    ]);
  };
}

export function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const { user } = useAuth();
  const { close: closePoParam, open: openPoParam, value: focusedPo } = useEntityParam('po');
  const [workbench, setWorkbench] = useState<PurchaseOrderWorkbench>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatusFilter>('all');
  const [page, setPage] = useState(1);
  const canManagePurchaseOrders = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, monthParam]);

  const listParams = useMemo<ListPurchaseOrdersParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || monthParam || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [monthParam, page, search, statusFilter],
  );

  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrdersList(listParams),
    queryFn: () => fetchPurchaseOrders(listParams),
  });

  const purchaseOrders = purchaseOrdersQuery.data?.data ?? [];
  const pagination = purchaseOrdersQuery.data?.meta.pagination;
  const total = purchaseOrdersQuery.data?.meta.total ?? purchaseOrders.length;

  useEffect(() => {
    if (!focusedPo || purchaseOrders.length === 0) return;
    const matchedOrder = purchaseOrders.find((order) => order.po_no === focusedPo);
    if (matchedOrder) {
      setSelectedId(matchedOrder.id);
      setWorkbench('detail');
    }
  }, [focusedPo, purchaseOrders]);

  const openDetail = (order: PurchaseOrderV1) => {
    setSelectedId(order.id);
    setWorkbench('detail');
    openPoParam(order.po_no, { clear: ['pr', 'do', 'task'] });
  };

  const closeWorkbench = () => {
    setWorkbench('list');
    setSelectedId(null);
    closePoParam({ clear: ['pr', 'do', 'task'] });
  };

  if (purchaseOrdersQuery.isLoading) {
    return (
      <PageLoading
        title="Purchase Orders"
        description="Loading PO list from the mock API."
        tableColumns={['PO', 'Supplier', 'Status', 'ETA', 'Amount']}
      />
    );
  }

  if (purchaseOrdersQuery.isError) {
    return (
      <PageError
        title="Purchase Orders"
        description="Could not load purchase orders."
        error={purchaseOrdersQuery.error}
        onRetry={() => {
          void purchaseOrdersQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack gap="lg">
      {workbench === 'list' ? (
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>Purchase Orders</Title>
            <Text c="dimmed" mt={4}>
              Operational PO intake, supplier confirmation, and LOT planning.
            </Text>
          </div>
          <Group gap="xs">
            <Badge leftSection={<IconTruckDelivery size={14} />} size="lg" variant="light">
              PO - LOT
            </Badge>
            {canManagePurchaseOrders ? (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  closePoParam({ clear: ['pr', 'do', 'task'] });
                  setSelectedId(null);
                  setWorkbench('create');
                }}
              >
                Create PO
              </Button>
            ) : null}
          </Group>
        </Group>
      ) : (
        <Group justify="space-between">
          <Button leftSection={<IconArrowBackUp size={16} />} variant="subtle" onClick={closeWorkbench}>
            Back to list
          </Button>
          <Badge leftSection={<IconTruckDelivery size={14} />} variant="light">
            Live API V1
          </Badge>
        </Group>
      )}

      {workbench === 'create' ? (
        <PurchaseOrderForm
          mode="create"
          onCancel={closeWorkbench}
          onSaved={(order) => {
            setSelectedId(order.id);
            setWorkbench('detail');
            openPoParam(order.po_no, { clear: ['pr', 'do', 'task'] });
          }}
        />
      ) : null}

      {workbench === 'detail' && selectedId ? (
        <PurchaseOrderDetailPanel id={selectedId} onClose={closeWorkbench} canManage={canManagePurchaseOrders} />
      ) : null}

      {workbench === 'list' ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Metric label="Total rows" value={total} color="blue" />
            <Metric label="Draft" value={purchaseOrders.filter((order) => order.status === 'DRAFT').length} color="gray" />
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
                onChange={(event) => setSearch(event.currentTarget.value)}
                w={{ base: '100%', sm: 360 }}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(value) => setStatusFilter((value || 'all') as PurchaseOrderStatusFilter)}
                data={[
                  { label: 'All', value: 'all' },
                  ...purchaseOrderStatusOptions.map((status) => ({ label: status.replace(/_/g, ' '), value: status })),
                ]}
                w={{ base: '100%', sm: 180 }}
              />
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                loading={purchaseOrdersQuery.isFetching}
                onClick={() => {
                  void purchaseOrdersQuery.refetch();
                }}
              >
                Refresh
              </Button>
            </Group>
          </Paper>

          <Paper withBorder p={0}>
            {purchaseOrders.length === 0 ? (
              <EmptyState title="No purchase orders" description="Create a PO or adjust the filters." />
            ) : (
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1160} verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>PO</Table.Th>
                      <Table.Th>Supplier</Table.Th>
                      <Table.Th>Terms</Table.Th>
                      <Table.Th>ETD / ETA</Table.Th>
                      <Table.Th>Lines</Table.Th>
                      <Table.Th>Amount</Table.Th>
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
                            {dateOnly(order.create_at)}
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
                          <Text size="sm">{dateOnly(order.expected_etd) || '-'}</Text>
                          <Text size="xs" c="dimmed">
                            {dateOnly(order.expected_eta) || '-'}
                          </Text>
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
                          <StatusBadge status={order.status} />
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label="Open detail">
                            <ActionIcon variant="subtle" aria-label="Open detail" onClick={() => openDetail(order)}>
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
              pageCount={pagination?.totalPages ?? 1}
              pageEnd={Math.min(total, page * PAGE_SIZE)}
              pageStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              setPage={setPage}
              total={total}
            />
          </Paper>
        </>
      ) : null}
    </Stack>
  );
}

function PurchaseOrderDetailPanel({ canManage, id, onClose }: { canManage: boolean; id: string; onClose: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invalidatePo = usePoInvalidation(id);

  const detailQuery = useQuery({
    queryKey: queryKeys.purchaseOrderDetail(id),
    queryFn: () => fetchPurchaseOrder(id),
  });

  const planningQuery = useQuery({
    queryKey: queryKeys.purchaseOrderLotPlanning(id),
    queryFn: () => fetchPurchaseOrderLotPlanning(id),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendPurchaseOrder(id),
    onSuccess: invalidatePo,
  });

  if (detailQuery.isLoading) {
    return (
      <Paper withBorder p="xl">
        <Group justify="center">
          <Loader size="sm" />
          <Text c="dimmed">Loading PO detail...</Text>
        </Group>
      </Paper>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageError
        title="PO detail"
        description="Could not load this purchase order."
        error={detailQuery.error}
        onRetry={() => {
          void detailQuery.refetch();
        }}
      />
    );
  }

  const order = detailQuery.data;
  const lines = order.lines ?? [];
  const canEdit = canManage && order.status === 'DRAFT';
  const canSend = canManage && order.status === 'DRAFT';
  const canConfirm = canManage && order.status === 'SENT';

  return (
    <Stack gap="lg">
      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <Title order={3}>{order.po_no}</Title>
              <StatusBadge status={order.status} />
              <Badge size="sm" variant="light">
                {order.po_type || 'STANDARD'}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm" mt={4}>
              {order.supplier?.supplier_name ?? order.supplier_id} - {order.contract_no || 'No contract'}
            </Text>
          </div>
          <Group gap="xs">
            <Button variant="subtle" leftSection={<IconX size={16} />} onClick={onClose}>
              Close
            </Button>
            <Button
              variant="light"
              leftSection={<IconPencil size={16} />}
              disabled={!canEdit}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              loading={sendMutation.isPending}
              disabled={!canSend}
              onClick={() => sendMutation.mutate()}
            >
              Send PO
            </Button>
            <Button
              color="teal"
              leftSection={<IconCircleCheck size={16} />}
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              Confirm
            </Button>
          </Group>
        </Group>
        {sendMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="md">
            {getApiErrorMessage(sendMutation.error)}
          </Alert>
        ) : null}
        {!canConfirm ? (
          <Text size="xs" c="dimmed" mt="xs">
            Supplier confirmation is enabled only after the PO is sent.
          </Text>
        ) : null}
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 4 }}>
        <Info label="Currency" value={order.currency?.currency_code ?? '-'} />
        <Info label="Incoterm" value={order.incoterm?.incoterm_code ?? '-'} />
        <Info label="Transport" value={order.transport_mode?.mode_code ?? '-'} />
        <Info label="Amount" value={`${totalPoAmount(lines).toLocaleString()} ${order.currency?.currency_code ?? ''}`} />
        <Info label="ETD" value={dateOnly(order.expected_etd) || '-'} />
        <Info label="ETA" value={dateOnly(order.expected_eta) || '-'} />
        <Info label="Payment" value={order.payment_term || '-'} />
        <Info label="Exchange rate" value={String(order.exchange_rate ?? '-')} />
      </SimpleGrid>

      <PoLinesTable lines={lines} currencyCode={order.currency?.currency_code ?? ''} />

      {planningQuery.isLoading ? (
        <Paper withBorder p="lg">
          <Group justify="center">
            <Loader size="sm" />
            <Text c="dimmed">Loading LOT planning...</Text>
          </Group>
        </Paper>
      ) : planningQuery.isError || !planningQuery.data ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(planningQuery.error)}
        </Alert>
      ) : (
        <LotPlanningBoard planning={planningQuery.data} canManage={canManage} />
      )}

      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Edit PO" size="xl">
        <PurchaseOrderForm
          mode="edit"
          order={order}
          onCancel={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            invalidatePo();
          }}
        />
      </Modal>

      <SupplierConfirmationModal
        order={order}
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => {
          setConfirmOpen(false);
          invalidatePo();
        }}
      />
    </Stack>
  );
}

function PurchaseOrderForm({
  mode,
  onCancel,
  onSaved,
  order,
}: {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSaved: (order: PurchaseOrderV1) => void;
  order?: PurchaseOrderV1;
}) {
  const [draft, setDraft] = useState(() => createInitialPoDraft(order));
  const invalidatePo = usePoInvalidation(order?.id);
  const masterData = usePoMasterData();

  useEffect(() => {
    setDraft(createInitialPoDraft(order));
  }, [order]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderV1Payload) => createPurchaseOrder(payload),
    onSuccess: (createdOrder) => {
      invalidatePo();
      onSaved(createdOrder);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePurchaseOrderV1Payload) => updatePurchaseOrder(order?.id ?? '', payload),
    onSuccess: (updatedOrder) => {
      invalidatePo();
      onSaved(updatedOrder);
    },
  });

  const mutation = mode === 'create' ? createMutation : updateMutation;

  const updateLine = (clientId: string, patch: Partial<PoLineDraft>) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.clientId === clientId ? { ...line, ...patch } : line)),
    }));
  };

  const removeLine = (clientId: string) => {
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((line) => line.clientId !== clientId).map((line, index) => ({ ...line, line_no: index + 1 })),
    }));
  };

  const addLine = () => {
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, newLineDraft(current.lines.length)],
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.po_no.trim() || !draft.supplier_id) return;
    if (mode === 'create') {
      const payload = buildPoPayload(draft);
      if (!payload.lines?.length) return;
      createMutation.mutate(payload);
      return;
    }
    updateMutation.mutate(buildPoPatchPayload(draft));
  };

  return (
    <Paper withBorder={mode === 'create'} p={mode === 'create' ? 'md' : 0} component="form" onSubmit={handleSubmit}>
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700}>{mode === 'create' ? 'Create PO' : 'PO header'}</Text>
            <Text size="xs" c="dimmed">
              Header fields use master data IDs required by the V1 API.
            </Text>
          </div>
          <Group gap="xs">
            <Button type="button" variant="subtle" onClick={onCancel} leftSection={<IconX size={16} />}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending} leftSection={<IconDeviceFloppy size={16} />}>
              Save
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 4 }}>
          <TextInput
            label="PO no"
            value={draft.po_no}
            onChange={(event) => setDraft((current) => ({ ...current, po_no: event.currentTarget.value }))}
            required
          />
          <TextInput
            label="Contract no"
            value={draft.contract_no}
            onChange={(event) => setDraft((current) => ({ ...current, contract_no: event.currentTarget.value }))}
          />
          <Select
            label="Supplier"
            data={masterData.supplierOptions}
            value={draft.supplier_id}
            onChange={(value) => {
              const supplier = masterData.suppliers.find((item) => item.id === value);
              setDraft((current) => ({
                ...current,
                supplier_id: value ?? '',
                currency_id: supplier?.default_currency_id ?? current.currency_id,
                incoterm_id: supplier?.default_incoterm_id ?? current.incoterm_id,
                payment_term: supplier?.payment_term ?? current.payment_term,
                transport_mode_id:
                  supplier?.supplier_transport_modes?.find((mode) => mode.is_default)?.transport_mode_id ??
                  current.transport_mode_id,
              }));
            }}
            searchable
            required
          />
          <Select
            label="Currency"
            data={masterData.currencyOptions}
            value={draft.currency_id}
            onChange={(value) => setDraft((current) => ({ ...current, currency_id: value ?? '' }))}
            searchable
            clearable
          />
          <Select
            label="Incoterm"
            data={masterData.incotermOptions}
            value={draft.incoterm_id}
            onChange={(value) => setDraft((current) => ({ ...current, incoterm_id: value ?? '' }))}
            searchable
            clearable
          />
          <Select
            label="Transport mode"
            data={masterData.transportModeOptions}
            value={draft.transport_mode_id}
            onChange={(value) => setDraft((current) => ({ ...current, transport_mode_id: value ?? '' }))}
            searchable
            clearable
          />
          <Select
            label="PO type"
            data={poTypeOptions.map((type) => ({ label: type, value: type }))}
            value={draft.po_type}
            onChange={(value) => setDraft((current) => ({ ...current, po_type: value ?? '' }))}
            clearable
          />
          <TextInput
            label="Payment term"
            value={draft.payment_term}
            onChange={(event) => setDraft((current) => ({ ...current, payment_term: event.currentTarget.value }))}
          />
          <NumberInput
            label="Exchange rate"
            min={0}
            value={draft.exchange_rate}
            onChange={(value) => setDraft((current) => ({ ...current, exchange_rate: toNumber(value, 1) }))}
          />
          <TextInput
            label="Expected ETD"
            type="date"
            value={draft.expected_etd}
            onChange={(event) => setDraft((current) => ({ ...current, expected_etd: event.currentTarget.value }))}
          />
          <TextInput
            label="Expected ETA"
            type="date"
            value={draft.expected_eta}
            onChange={(event) => setDraft((current) => ({ ...current, expected_eta: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <Textarea
          label="Notes"
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
          autosize
          minRows={2}
        />

        {mode === 'create' ? (
          <>
            <Divider label="PO lines" labelPosition="left" />
            <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
              <Table miw={1180} verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 72 }}>Line</Table.Th>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Customs profile</Table.Th>
                    <Table.Th style={{ width: 130 }}>Qty</Table.Th>
                    <Table.Th style={{ width: 110 }}>Unit</Table.Th>
                    <Table.Th style={{ width: 135 }}>Unit price</Table.Th>
                    <Table.Th style={{ width: 140 }}>Line ETA</Table.Th>
                    <Table.Th style={{ width: 44 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {draft.lines.map((line, index) => {
                    const item = masterData.items.find((candidate) => candidate.id === line.item_id);
                    const customsOptions = buildCustomsOptions(item);
                    return (
                      <Table.Tr key={line.clientId}>
                        <Table.Td>
                          <Text fw={700} size="sm">
                            #{index + 1}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={masterData.itemOptions}
                            value={line.item_id}
                            onChange={(value) => {
                              const selectedItem = masterData.items.find((candidate) => candidate.id === value);
                              updateLine(line.clientId, {
                                item_id: value ?? '',
                                item_customs_profile_id:
                                  selectedItem?.customs_profiles?.find((profile) => profile.is_default)?.id ??
                                  selectedItem?.customs_profiles?.[0]?.id ??
                                  '',
                                item_description: selectedItem?.item_description ?? selectedItem?.item_name ?? '',
                                unit: selectedItem?.unit ?? line.unit,
                              });
                            }}
                            searchable
                            required
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={customsOptions}
                            value={line.item_customs_profile_id}
                            onChange={(value) => updateLine(line.clientId, { item_customs_profile_id: value ?? '' })}
                            searchable
                            clearable
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0.0001}
                            value={line.qty_ordered}
                            onChange={(value) => updateLine(line.clientId, { qty_ordered: toNumber(value, 1) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            value={line.unit}
                            onChange={(event) => updateLine(line.clientId, { unit: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0}
                            value={line.unit_price}
                            onChange={(value) => updateLine(line.clientId, { unit_price: toNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            type="date"
                            value={line.expected_eta_line}
                            onChange={(event) => updateLine(line.clientId, { expected_eta_line: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Remove line"
                            disabled={draft.lines.length === 1}
                            onClick={() => removeLine(line.clientId)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            <Group justify="space-between">
              <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
                Add line
              </Button>
              <Text fw={700} size="sm">
                Total: <NumberFormatter value={totalPoAmount(draft.lines)} thousandSeparator />
              </Text>
            </Group>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}

function LotPlanningBoard({ canManage, planning }: { canManage: boolean; planning: PurchaseOrderLotPlanning }) {
  const [lotDraft, setLotDraft] = useState<LotDraft | null>(null);
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const purchaseOrderId = planning.purchase_order.id;
  const invalidatePo = usePoInvalidation(purchaseOrderId);

  const sortedLots = useMemo(
    () =>
      [...planning.lots].sort((a, b) => {
        const sortDiff = a.sort_order - b.sort_order;
        return sortDiff || a.lot_no.localeCompare(b.lot_no);
      }),
    [planning.lots],
  );

  const createLotMutation = useMutation({
    mutationFn: (payload: CreateLotPayload) => createLot(purchaseOrderId, payload),
    onSuccess: () => {
      setLotDraft(null);
      invalidatePo();
    },
  });

  const updateLotMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LotDraft }) =>
      updatePoLot(id, {
        lot_no: payload.lot_no,
        lot_name: nullIfEmpty(payload.lot_name),
        status: payload.status,
        planned_cargo_ready_date: nullIfEmpty(payload.planned_cargo_ready_date),
        planned_etd: nullIfEmpty(payload.planned_etd),
        planned_eta: nullIfEmpty(payload.planned_eta),
        sort_order: payload.sort_order,
        notes: nullIfEmpty(payload.notes),
      }),
    onSuccess: () => {
      setLotDraft(null);
      invalidatePo();
    },
  });

  const deleteLotMutation = useMutation({
    mutationFn: (lotId: string) => deletePoLot(lotId),
    onSuccess: () => {
      setBoardError(null);
      invalidatePo();
    },
    onError: (error) => {
      setBoardError(`Cannot delete this LOT. ${getApiErrorMessage(error, 'Only empty, unlocked LOTs can be deleted.')}`);
    },
  });

  const moveLineMutation = useMutation({
    mutationFn: ({ lineId, targetLotId, sortOrder }: { lineId: string; targetLotId: string; sortOrder?: number }) =>
      movePoLotLine(lineId, { target_lot_id: targetLotId, target_sort_order: sortOrder }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const reorderLotsMutation = useMutation({
    mutationFn: (orderedLotIds: string[]) =>
      reorderPoLots({ purchase_order_id: purchaseOrderId, ordered_lot_ids: orderedLotIds }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const reorderLinesMutation = useMutation({
    mutationFn: ({ lotId, orderedLineIds }: { lotId: string; orderedLineIds: string[] }) =>
      reorderPoLotLines({ lot_id: lotId, ordered_lot_line_ids: orderedLineIds }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const splitMutation = useMutation({
    mutationFn: ({ lineId, targetLotId, splitQty }: { lineId: string; targetLotId: string; splitQty: number }) =>
      splitPoLotLine(lineId, { target_lot_id: targetLotId, split_qty: splitQty }),
    onSuccess: () => {
      setSplitDraft(null);
      setBoardError(null);
      invalidatePo();
    },
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const openCreateLot = () => {
    setLotDraft({
      lot_no: `LOT-${String(sortedLots.length + 1).padStart(3, '0')}`,
      lot_name: '',
      status: 'PLANNED',
      planned_cargo_ready_date: '',
      planned_etd: '',
      planned_eta: '',
      sort_order: sortedLots.length + 1,
      notes: '',
    });
  };

  const openEditLot = (lot: PoLot) => {
    setLotDraft({
      id: lot.id,
      lot_no: lot.lot_no,
      lot_name: lot.lot_name ?? '',
      status: lot.status,
      planned_cargo_ready_date: dateOnly(lot.planned_cargo_ready_date),
      planned_etd: dateOnly(lot.planned_etd),
      planned_eta: dateOnly(lot.planned_eta),
      sort_order: lot.sort_order,
      notes: lot.notes ?? '',
    });
  };

  const openSplitLine = (lot: PoLot, line: PoLotLine) => {
    const targetLot = sortedLots.find((candidate) => candidate.id !== lot.id && !lockedLotStatuses.has(candidate.status));
    setSplitDraft({
      sourceLot: lot,
      sourceLine: line,
      target_lot_id: targetLot?.id ?? '',
      split_qty: 0,
    });
  };

  const reorderLotCards = (lotId: string, targetLotId?: string) => {
    const dragged = sortedLots.find((lot) => lot.id === lotId);
    if (!dragged) return;
    const withoutDragged = sortedLots.filter((lot) => lot.id !== lotId);
    const targetIndex = targetLotId ? withoutDragged.findIndex((lot) => lot.id === targetLotId) : withoutDragged.length;
    const insertIndex = targetIndex < 0 ? withoutDragged.length : targetIndex;
    const nextLots = [...withoutDragged.slice(0, insertIndex), dragged, ...withoutDragged.slice(insertIndex)];
    reorderLotsMutation.mutate(nextLots.map((lot) => lot.id));
  };

  const reorderLinesInLot = (lot: PoLot, lineId: string, targetLineId?: string) => {
    const lines = [...(lot.items ?? [])];
    const dragged = lines.find((line) => line.id === lineId);
    if (!dragged) return;
    const withoutDragged = lines.filter((line) => line.id !== lineId);
    const targetIndex = targetLineId ? withoutDragged.findIndex((line) => line.id === targetLineId) : withoutDragged.length;
    const insertIndex = targetIndex < 0 ? withoutDragged.length : targetIndex;
    const nextLines = [...withoutDragged.slice(0, insertIndex), dragged, ...withoutDragged.slice(insertIndex)];
    reorderLinesMutation.mutate({ lotId: lot.id, orderedLineIds: nextLines.map((line) => line.id) });
  };

  const handleDropOnLot = (event: DragEvent<HTMLDivElement>, targetLot?: PoLot, targetLine?: PoLotLine) => {
    event.preventDefault();
    event.stopPropagation();
    const dragType = event.dataTransfer.getData('dragType');

    if (dragType === 'lot') {
      const lotId = event.dataTransfer.getData('lotId');
      if (!lotId) return;
      reorderLotCards(lotId, targetLot?.id);
      return;
    }

    if (dragType !== 'lotLine' || !targetLot) return;
    if (lockedLotStatuses.has(targetLot.status)) {
      setBoardError('Cannot move item lines into a locked LOT.');
      return;
    }

    const lineId = event.dataTransfer.getData('lotLineId');
    const sourceLotId = event.dataTransfer.getData('sourceLotId');
    if (!lineId) return;

    if (sourceLotId === targetLot.id) {
      reorderLinesInLot(targetLot, lineId, targetLine?.id);
      return;
    }

    moveLineMutation.mutate({
      lineId,
      targetLotId: targetLot.id,
      sortOrder: targetLine?.sort_order ?? (targetLot.items?.length ?? 0) + 1,
    });
  };

  const lotMutationError = createLotMutation.error ?? updateLotMutation.error;

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconTruckDelivery size={20} />
              <Text fw={700}>LOT planning</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Drag LOT cards to reorder. Drag item lines between LOTs, or split a line into another LOT.
            </Text>
          </div>
          <Group gap="xs">
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateLot} disabled={!canManage}>
              Add LOT
            </Button>
          </Group>
        </Group>

        {boardError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} onClose={() => setBoardError(null)} withCloseButton>
            {boardError}
          </Alert>
        ) : null}

        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Group
            align="stretch"
            gap="sm"
            wrap="nowrap"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDropOnLot(event)}
            style={{ minHeight: 360 }}
          >
            {sortedLots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                onDrop={(event) => handleDropOnLot(event, lot)}
                onDropLine={(event, line) => handleDropOnLot(event, lot, line)}
                onDelete={() => deleteLotMutation.mutate(lot.id)}
                onEdit={() => openEditLot(lot)}
                onSplitLine={(line) => openSplitLine(lot, line)}
                canManage={canManage}
                hasMoveTargets={sortedLots.some((candidate) => candidate.id !== lot.id && !lockedLotStatuses.has(candidate.status))}
              />
            ))}
            {sortedLots.length === 0 ? (
              <Paper withBorder p="md" style={{ flex: '0 0 330px', borderStyle: 'dashed' }}>
                <Text size="xs" c="dimmed" ta="center">
                  Add a LOT to start planning.
                </Text>
              </Paper>
            ) : null}
          </Group>
        </ScrollArea>
      </Stack>

      <LotModal
        draft={lotDraft}
        error={lotMutationError}
        loading={createLotMutation.isPending || updateLotMutation.isPending}
        onClose={() => setLotDraft(null)}
        onSubmit={(nextDraft) => {
          if (nextDraft.id) {
            updateLotMutation.mutate({ id: nextDraft.id, payload: nextDraft });
          } else {
            createLotMutation.mutate({
              lot_no: nextDraft.lot_no.trim(),
              lot_name: nullIfEmpty(nextDraft.lot_name),
              status: nextDraft.status,
              planned_cargo_ready_date: nullIfEmpty(nextDraft.planned_cargo_ready_date),
              planned_etd: nullIfEmpty(nextDraft.planned_etd),
              planned_eta: nullIfEmpty(nextDraft.planned_eta),
              sort_order: nextDraft.sort_order,
              notes: nullIfEmpty(nextDraft.notes),
            });
          }
        }}
      />

      <SplitLotModal
        draft={splitDraft}
        lots={sortedLots}
        error={splitMutation.error}
        loading={splitMutation.isPending}
        onClose={() => setSplitDraft(null)}
        onSubmit={(nextDraft) => {
          splitMutation.mutate({
            lineId: nextDraft.sourceLine.id,
            targetLotId: nextDraft.target_lot_id,
            splitQty: Number(nextDraft.split_qty),
          });
        }}
      />
    </Paper>
  );
}

function LotCard({
  canManage,
  hasMoveTargets,
  lot,
  onDelete,
  onDrop,
  onDropLine,
  onEdit,
  onSplitLine,
}: {
  canManage: boolean;
  hasMoveTargets: boolean;
  lot: PoLot;
  onDelete: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDropLine: (event: DragEvent<HTMLDivElement>, line: PoLotLine) => void;
  onEdit: () => void;
  onSplitLine: (line: PoLotLine) => void;
}) {
  const lines = lot.items ?? [];
  const isLocked = lockedLotStatuses.has(lot.status);
  const canDelete = canManage && !isLocked && lines.length === 0;

  return (
    <Paper
      withBorder
      p="sm"
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      draggable={canManage && !isLocked}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData('dragType', 'lot');
        event.dataTransfer.setData('lotId', lot.id);
      }}
      style={{ flex: '0 0 330px', cursor: canManage && !isLocked ? 'grab' : 'default', backgroundColor: 'white' }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
            <div style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>
                {lot.lot_no}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {lot.lot_name || 'Empty LOT'}
              </Text>
            </div>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" color={lot.status === 'READY' ? 'teal' : undefined} variant="light">
              {lot.status}
            </Badge>
            <ActionIcon variant="subtle" size="sm" aria-label="Edit LOT" disabled={!canManage} onClick={onEdit}>
              <IconPencil size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label="Split an item line"
              disabled={!canManage || isLocked || lines.length === 0}
              onClick={() => {
                const firstLine = lines[0];
                if (firstLine) onSplitLine(firstLine);
              }}
            >
              <IconGitBranch size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label="Delete empty LOT"
              disabled={!canDelete}
              onClick={onDelete}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Group>
        </Group>
        <Group gap={8}>
          <Text size="xs" c="dimmed">
            CRD {dateOnly(lot.planned_cargo_ready_date) || '-'}
          </Text>
          <Text size="xs" c="dimmed">
            ETA {dateOnly(lot.planned_eta) || '-'}
          </Text>
        </Group>
        <Stack gap={4}>
          {lines.length > 0 ? (
            lines.map((line) => (
              <Paper
                key={line.id}
                withBorder
                p={6}
                draggable={canManage && !isLocked}
                onDragStart={(event: DragEvent<HTMLDivElement>) => {
                  event.stopPropagation();
                  event.dataTransfer.setData('dragType', 'lotLine');
                  event.dataTransfer.setData('lotLineId', line.id);
                  event.dataTransfer.setData('sourceLotId', lot.id);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDropLine(event, line)}
                style={{ cursor: canManage && !isLocked ? 'grab' : 'default' }}
              >
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="xs" fw={700} truncate>
                      {line.item_code ?? line.item?.item_code ?? line.purchase_order_line?.item?.item_code ?? line.item_id}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {line.item_name ?? line.item?.item_name ?? line.purchase_order_line?.item?.item_name ?? '-'}
                    </Text>
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" fw={700} style={{ whiteSpace: 'nowrap' }}>
                      <NumberFormatter value={line.qty_lotted} thousandSeparator /> {line.unit ?? ''}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      aria-label="Split line"
                      disabled={!canManage || isLocked || !hasMoveTargets || toNumber(line.qty_lotted) <= 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSplitLine(line);
                      }}
                    >
                      <IconGitBranch size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              No item lines
            </Text>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function SupplierConfirmationModal({
  onClose,
  onConfirmed,
  opened,
  order,
}: {
  onClose: () => void;
  onConfirmed: () => void;
  opened: boolean;
  order: PurchaseOrderV1;
}) {
  const [confirmedBy, setConfirmedBy] = useState('');
  const [supplierRefNo, setSupplierRefNo] = useState('');
  const [isFullShipment, setIsFullShipment] = useState(true);
  const [allowPartialShipment, setAllowPartialShipment] = useState(false);
  const [note, setNote] = useState('');
  const [lineDrafts, setLineDrafts] = useState<Record<string, { confirmed_qty: number; cargo_ready_date: string; can_fulfill: boolean }>>({});

  useEffect(() => {
    setLineDrafts(
      Object.fromEntries(
        (order.lines ?? []).map((line) => [
          line.id,
          {
            confirmed_qty: toNumber(line.qty_ordered),
            cargo_ready_date: dateOnly(line.expected_eta_line ?? order.expected_eta),
            can_fulfill: true,
          },
        ]),
      ),
    );
  }, [order]);

  const mutation = useMutation({
    mutationFn: (payload: ConfirmPurchaseOrderPayload) => confirmPurchaseOrder(order.id, payload),
    onSuccess: onConfirmed,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const lines = Object.entries(lineDrafts)
      .filter(([, line]) => Number(line.confirmed_qty) > 0)
      .map(([purchaseOrderLineId, line]) => ({
        purchase_order_line_id: purchaseOrderLineId,
        confirmed_qty: Number(line.confirmed_qty),
        cargo_ready_date: nullIfEmpty(line.cargo_ready_date),
        can_fulfill: line.can_fulfill,
        allow_partial_shipment: allowPartialShipment,
      }));

    if (!lines.length) return;
    mutation.mutate({
      confirmed_by: nullIfEmpty(confirmedBy),
      supplier_ref_no: nullIfEmpty(supplierRefNo),
      is_full_shipment: isFullShipment,
      allow_partial_shipment: allowPartialShipment,
      note: nullIfEmpty(note),
      lines,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Supplier confirmation" size="xl">
      <Stack component="form" gap="md" onSubmit={handleSubmit}>
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <TextInput label="Confirmed by" value={confirmedBy} onChange={(event) => setConfirmedBy(event.currentTarget.value)} />
          <TextInput label="Supplier ref no" value={supplierRefNo} onChange={(event) => setSupplierRefNo(event.currentTarget.value)} />
          <Switch label="Full shipment" checked={isFullShipment} onChange={(event) => setIsFullShipment(event.currentTarget.checked)} />
          <Switch
            label="Allow partial shipment"
            checked={allowPartialShipment}
            onChange={(event) => setAllowPartialShipment(event.currentTarget.checked)}
          />
        </SimpleGrid>
        <Textarea label="Note" value={note} onChange={(event) => setNote(event.currentTarget.value)} autosize minRows={2} />
        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={860} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Line</Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th style={{ width: 150 }}>Ordered</Table.Th>
                <Table.Th style={{ width: 160 }}>Confirmed qty</Table.Th>
                <Table.Th style={{ width: 160 }}>Cargo ready</Table.Th>
                <Table.Th style={{ width: 90 }}>Can fulfill</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(order.lines ?? []).map((line) => {
                const lineDraft = lineDrafts[line.id];
                return (
                  <Table.Tr key={line.id}>
                    <Table.Td>#{line.line_no}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {line.item?.item_code ?? line.item_id}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {line.item?.item_name ?? line.item_description ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <NumberFormatter value={line.qty_ordered} thousandSeparator /> {line.unit ?? ''}
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        max={toNumber(line.qty_ordered)}
                        value={lineDraft?.confirmed_qty ?? 0}
                        onChange={(value) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], confirmed_qty: toNumber(value) },
                          }))
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="date"
                        value={lineDraft?.cargo_ready_date ?? ''}
                        onChange={(event) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], cargo_ready_date: event.currentTarget.value },
                          }))
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Checkbox
                        checked={lineDraft?.can_fulfill ?? true}
                        onChange={(event) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], can_fulfill: event.currentTarget.checked },
                          }))
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} leftSection={<IconCircleCheck size={16} />}>
            Confirm PO
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function LotModal({
  draft,
  error,
  loading,
  onClose,
  onSubmit,
}: {
  draft: LotDraft | null;
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onSubmit: (draft: LotDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState<LotDraft | null>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  return (
    <Modal opened={!!draft} onClose={onClose} title={draft?.id ? 'Edit LOT' : 'Create empty LOT'} size="lg">
      {localDraft ? (
        <Stack
          component="form"
          gap="md"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(localDraft);
          }}
        >
          {error ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="LOT no"
              value={localDraft.lot_no}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_no: event.currentTarget.value })}
              required
            />
            <TextInput
              label="LOT name"
              value={localDraft.lot_name}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_name: event.currentTarget.value })}
            />
            <Select
              label="Status"
              value={localDraft.status}
              data={lotStatusOptions}
              onChange={(value) => setLocalDraft({ ...localDraft, status: (value || 'PLANNED') as PoLotStatus })}
            />
            <TextInput
              label="Cargo ready"
              type="date"
              value={localDraft.planned_cargo_ready_date}
              onChange={(event) => setLocalDraft({ ...localDraft, planned_cargo_ready_date: event.currentTarget.value })}
            />
            <TextInput
              label="ETD"
              type="date"
              value={localDraft.planned_etd}
              onChange={(event) => setLocalDraft({ ...localDraft, planned_etd: event.currentTarget.value })}
            />
            <TextInput
              label="ETA"
              type="date"
              value={localDraft.planned_eta}
              onChange={(event) => setLocalDraft({ ...localDraft, planned_eta: event.currentTarget.value })}
            />
            <NumberInput
              label="Sort order"
              min={1}
              value={localDraft.sort_order}
              onChange={(value) => setLocalDraft({ ...localDraft, sort_order: toNumber(value, 1) })}
            />
          </SimpleGrid>
          <Textarea
            label="Notes"
            value={localDraft.notes}
            onChange={(event) => setLocalDraft({ ...localDraft, notes: event.currentTarget.value })}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}

function SplitLotModal({
  draft,
  error,
  loading,
  lots,
  onClose,
  onSubmit,
}: {
  draft: SplitDraft | null;
  error: unknown;
  loading: boolean;
  lots: PoLot[];
  onClose: () => void;
  onSubmit: (draft: SplitDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState<SplitDraft | null>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  const targetOptions = useMemo(
    () =>
      lots
        .filter((lot) => lot.id !== localDraft?.sourceLot.id && !lockedLotStatuses.has(lot.status))
        .map((lot) => ({
          label: `${lot.lot_no} - ${lot.lot_name || 'Unnamed'}`,
          value: lot.id,
        })),
    [localDraft?.sourceLot.id, lots],
  );
  const availableQty = toNumber(localDraft?.sourceLine.qty_lotted);
  const canSubmit =
    Boolean(localDraft?.target_lot_id) &&
    Number(localDraft?.split_qty) > 0 &&
    Number(localDraft?.split_qty) < availableQty;

  return (
    <Modal opened={!!draft} onClose={onClose} title="Split item line" size="lg">
      {localDraft ? (
        <Stack
          component="form"
          gap="md"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(localDraft);
          }}
        >
          {error ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(error)}
            </Alert>
          ) : null}
          <Paper withBorder p="sm">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Source
            </Text>
            <Text fw={700}>{localDraft.sourceLot.lot_no}</Text>
            <Text size="sm" c="dimmed">
              {localDraft.sourceLine.item_code ??
                localDraft.sourceLine.item?.item_code ??
                localDraft.sourceLine.purchase_order_line?.item?.item_code ??
                localDraft.sourceLine.item_id}{' '}
              · <NumberFormatter value={localDraft.sourceLine.qty_lotted} thousandSeparator />{' '}
              {localDraft.sourceLine.unit ?? ''}
            </Text>
          </Paper>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Target LOT"
              data={targetOptions}
              value={localDraft.target_lot_id}
              onChange={(value) => setLocalDraft({ ...localDraft, target_lot_id: value ?? '' })}
              searchable
              required
            />
            <NumberInput
              label="Split qty"
              min={0}
              max={Math.max(availableQty - 0.0001, 0)}
              value={localDraft.split_qty}
              onChange={(value) => setLocalDraft({ ...localDraft, split_qty: toNumber(value) })}
              required
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!canSubmit} leftSection={<IconGitBranch size={16} />}>
              Split line
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}

function PoLinesTable({ currencyCode, lines }: { currencyCode: string; lines: PurchaseOrderLineV1[] }) {
  return (
    <Paper withBorder p={0}>
      <Group justify="space-between" p="sm">
        <Text fw={700}>PO lines</Text>
        <Badge variant="light">{lines.length} rows</Badge>
      </Group>
      <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={1060} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 80 }}>Line</Table.Th>
              <Table.Th>Item</Table.Th>
              <Table.Th>Customs</Table.Th>
              <Table.Th style={{ width: 130 }}>Ordered</Table.Th>
              <Table.Th style={{ width: 130 }}>Confirmed</Table.Th>
              <Table.Th style={{ width: 130 }}>Lotted</Table.Th>
              <Table.Th style={{ width: 135 }}>Unit price</Table.Th>
              <Table.Th style={{ width: 135 }}>ETA</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>#{line.line_no}</Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '22rem' }}>
                  <Text size="sm" fw={700} lineClamp={1}>
                    {line.item?.item_code ?? line.item_id}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {line.item?.item_name ?? line.item_description ?? '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{line.item_customs_profile?.hs_code ?? '-'}</Text>
                  <Text size="xs" c="dimmed">
                    {line.item_customs_profile?.co_form ?? '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <NumberFormatter value={line.qty_ordered} thousandSeparator /> {line.unit ?? ''}
                </Table.Td>
                <Table.Td>
                  <NumberFormatter value={line.qty_confirmed} thousandSeparator /> {line.unit ?? ''}
                </Table.Td>
                <Table.Td>
                  <NumberFormatter value={line.qty_lotted} thousandSeparator /> {line.unit ?? ''}
                </Table.Td>
                <Table.Td>
                  <NumberFormatter value={line.unit_price ?? 0} thousandSeparator /> {currencyCode}
                </Table.Td>
                <Table.Td>{dateOnly(line.expected_eta_line) || '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

function usePoMasterData() {
  const supplierParams = useMemo(() => ({ page: 1, limit: 100, role: 'SUPPLIER', is_active: true }), []);
  const activeParams = useMemo(() => ({ page: 1, limit: 100, is_active: true }), []);
  const itemParams = useMemo(() => ({ page: 1, limit: 100 }), []);

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(supplierParams),
    queryFn: () => fetchSuppliers(supplierParams),
  });
  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(activeParams),
    queryFn: () => fetchCurrencies(activeParams),
  });
  const incotermsQuery = useQuery({
    queryKey: queryKeys.incoterms(activeParams),
    queryFn: () => fetchIncoterms(activeParams),
  });
  const transportModesQuery = useQuery({
    queryKey: queryKeys.transportModes(activeParams),
    queryFn: () => fetchTransportModes(activeParams),
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.items(itemParams),
    queryFn: () => fetchItems(itemParams),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const currencies = currenciesQuery.data?.data ?? [];
  const incoterms = incotermsQuery.data?.data ?? [];
  const transportModes = transportModesQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];

  return {
    suppliers,
    currencies,
    incoterms,
    transportModes,
    items,
    supplierOptions: suppliers.map((supplier: Supplier) => ({
      label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
      value: supplier.id,
    })),
    currencyOptions: currencies.map((currency: Currency) => ({
      label: `${currency.currency_code} - ${currency.currency_name}`,
      value: currency.id,
    })),
    incotermOptions: incoterms.map((incoterm: Incoterm) => ({
      label: `${incoterm.incoterm_code} - ${incoterm.incoterm_name}`,
      value: incoterm.id,
    })),
    transportModeOptions: transportModes.map((mode: TransportMode) => ({
      label: `${mode.mode_code} - ${mode.mode_name}`,
      value: mode.id,
    })),
    itemOptions: items.map((item: Item) => ({
      label: `${item.item_code} - ${item.item_name}`,
      value: item.id,
    })),
  };
}

function buildCustomsOptions(item: Item | undefined): SelectOption[] {
  return (item?.customs_profiles ?? []).map((profile) => ({
    label: [profile.hs_code, profile.co_form, profile.customs_type].filter(Boolean).join(' / ') || profile.id,
    value: profile.id,
  }));
}

function Metric({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <Paper withBorder p="md">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} size="xl" c={color}>
        {value.toLocaleString()}
      </Text>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600} lineClamp={1} title={value}>
        {value}
      </Text>
    </Paper>
  );
}
