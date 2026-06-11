import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  NumberFormatter,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDeviceFloppy,
  IconEye,
  IconGitBranch,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconX,
  IconChecklist,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EntityLink } from '@shared/components/EntityLink';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { FlowTagBadge } from '@shared/components/FlowTagBadge';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { getApiErrorMessage } from '@shared/lib/errors';
import {
  advancePurchaseOrderStage,
  createPurchaseOrder,
  fetchDeliveryOrders,
  fetchPurchaseOrders,
  fetchPurchaseOrderStageTasks,
  updatePoStageTask,
  updatePurchaseOrderLotAllocation,
  type CreatePurchaseOrderPayload,
  type Gd1PoStatus,
  type PurchaseOrder,
  type PurchaseOrderLineItem,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { useAuth } from '@shared/auth/useAuth';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { findSupplierByCode, useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';

type PurchaseOrderTab = 'all' | 'single' | 'bulk' | 'awaiting' | 'partial' | 'closed';
type PurchaseOrderWorkbench = 'list' | 'create' | 'detail';

type CreatePoLine = {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lotNumber: string;
  expectedEta: string;
};

const DEFAULT_LOT = 'Lot 1';

function newCreateLine(index: number): CreatePoLine {
  return {
    id: `new-line-${Date.now()}-${index}`,
    itemCode: '',
    itemName: '',
    quantity: 1,
    unit: 'PCS',
    unitPrice: 0,
    lotNumber: DEFAULT_LOT,
    expectedEta: '',
  };
}

function normalizeLotName(value: string) {
  return value.trim() || DEFAULT_LOT;
}

export function PurchaseOrders() {
  const { flowTagLabel, t } = useI18n();
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const { user } = useAuth();
  const { close: closePoParam, open: openPoParam, value: focusedPo } = useEntityParam('po');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<PurchaseOrderTab>('all');
  const [search, setSearch] = useState('');
  const [workbench, setWorkbench] = useState<PurchaseOrderWorkbench>('list');

  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrders,
    queryFn: fetchPurchaseOrders,
  });
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const isFetching = purchaseOrdersQuery.isFetching;
  const canCreatePurchaseOrders = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';

  useEffect(() => {
    if (!focusedPo) {
      if (workbench === 'detail') {
        setSelectedPo(null);
        setWorkbench('list');
      }
      return;
    }

    if (purchaseOrders.length === 0) return;

    const matchedOrder = purchaseOrders.find((order) => order.po_number === focusedPo);
    if (matchedOrder) {
      setSelectedPo(matchedOrder);
      setWorkbench('detail');
    }
  }, [focusedPo, purchaseOrders, workbench]);

  const filteredPurchaseOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return purchaseOrders.filter((order) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'single' && order.flow_tags.includes('LINEAR')) ||
        (activeTab === 'bulk' && order.flow_tags.includes('BULK_PURCHASE')) ||
        (activeTab === 'awaiting' && order.linked_do_numbers.length === 0) ||
        (activeTab === 'partial' && order.status === 'PARTIALLY_DELIVERED') ||
        (activeTab === 'closed' && order.status === 'CLOSED');
      const matchesSearch = [order.po_number, order.supplier_code, order.supplier_name, order.linked_do_numbers.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesMonth = !monthParam || (order.order_date && order.order_date.startsWith(monthParam));

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
      single: purchaseOrders.filter((order) => order.flow_tags.includes('LINEAR')).length,
    }),
    [purchaseOrders],
  );

  const openDetail = (order: PurchaseOrder) => {
    setSelectedPo(order);
    setWorkbench('detail');
    openPoParam(order.po_number, { clear: ['pr', 'do', 'task'] });
  };

  const closeWorkbench = () => {
    setWorkbench('list');
    setSelectedPo(null);
    closePoParam({ clear: ['pr', 'do', 'task'] });
  };

  const openCreate = () => {
    setSelectedPo(null);
    setWorkbench('create');
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
        tableColumns={['PO', t('common.supplier'), t('common.linkedDo'), 'Lots', t('purchaseOrders.total'), t('common.status')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      {workbench === 'list' ? (
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Title order={1}>{t('purchaseOrders.title')}</Title>
            <Text c="dimmed" mt={4}>
              {t('purchaseOrders.subtitle')}
            </Text>
          </div>
          <Group gap="xs">
            {canCreatePurchaseOrders ? (
              <Button onClick={openCreate} leftSection={<IconPlus size={16} />} variant="light">
                {t('purchaseOrders.create')}
              </Button>
            ) : null}
            <Badge leftSection={<IconGitBranch size={14} />} size="lg" variant="light">
              {'PO -> Lot -> DO'}
            </Badge>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" align="center" gap="md">
          <Group gap="xs" align="center">
            <Button onClick={closeWorkbench} leftSection={<IconX size={16} />} variant="subtle" size="sm">
              {t('common.backToList')}
            </Button>
            <Text c="dimmed" size="sm">·</Text>
            <Text fw={600} size="sm">
              {workbench === 'create' ? t('purchaseOrders.create') : selectedPo?.po_number ?? ''}
            </Text>
          </Group>
          <Badge leftSection={<IconGitBranch size={14} />} size="md" variant="light">
            {'PO -> Lot -> DO'}
          </Badge>
        </Group>
      )}

      {workbench === 'create' ? (
        <PurchaseOrderCreatePanel onCancel={closeWorkbench} onCreated={openDetail} />
      ) : null}

      {workbench === 'detail' && selectedPo ? (
        <PurchaseOrderDetailPanel order={selectedPo} onClose={closeWorkbench} onUpdated={setSelectedPo} />
      ) : null}

      {workbench === 'list' ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Metric label={t('purchaseOrders.totalPo')} value={purchaseOrders.length} color="blue" icon={<IconShoppingCart size={22} />} />
            <Metric label={t('purchaseOrders.lotsPlanned')} value={purchaseOrders.reduce((total, order) => total + (order.lots?.length ?? 1), 0)} color="teal" icon={<IconGitBranch size={22} />} />
            <Metric label="Generated DOs" value={purchaseOrders.reduce((total, order) => total + order.linked_do_numbers.length, 0)} color="blue" icon={<IconCircleCheck size={22} />} />
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
                      <Table.Th>{t('common.linkedDo')}</Table.Th>
                      <Table.Th>Lots</Table.Th>
                      <Table.Th>{t('purchaseOrders.total')}</Table.Th>
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
                            {order.linked_do_numbers.map((doCode) => (
                              <EntityLink key={doCode} type="do" id={doCode} compact />
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="teal" variant="light">
                            {order.lots?.length ?? 1} lot / {order.linked_do_numbers.length} DO
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>
                            <NumberFormatter value={order.total_amount} thousandSeparator /> {order.currency}
                          </Text>
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
        </>
      ) : null}
    </Stack>
  );
}

function PurchaseOrderCreatePanel({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (order: PurchaseOrder) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [lots, setLots] = useState<string[]>([DEFAULT_LOT]);
  const [lines, setLines] = useState<CreatePoLine[]>([newCreateLine(0)]);
  const [poNumber, setPoNumber] = useState(`PO-2026-${String(Date.now()).slice(-6)}`);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseCode, setWarehouseCode] = useState('WH001');
  const { currencyOptions, incotermOptions, supplierOptions, suppliers } = useTradeMasterDataOptions({
    supplierRole: 'SUPPLIER',
  });

  const totalAmount = lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);

  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      onCreated(order);
    },
  });

  const updateLine = (lineId: string, patch: Partial<CreatePoLine>) => {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addLot = () => {
    setLots((current) => [...current, `Lot ${current.length + 1}`]);
  };

  const removeLot = (lotName: string) => {
    if (lotName === DEFAULT_LOT) return;
    if (lines.some((line) => line.lotNumber === lotName)) return;
    setLots((current) => current.filter((lot) => lot !== lotName));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validLines = lines.filter((line) => line.itemCode.trim() && line.itemName.trim() && Number(line.quantity) > 0);
    if (!poNumber.trim() || !supplierCode.trim() || !supplierName.trim() || validLines.length === 0) return;

    const payload: CreatePurchaseOrderPayload = {
      currency: currency.trim().toUpperCase(),
      incoterm: incoterm.trim() || undefined,
      orderDate,
      poNumber: poNumber.trim(),
      sourceLines: validLines.map((line) => ({
        itemCode: line.itemCode.trim(),
        itemName: line.itemName.trim(),
        quantity: Number(line.quantity),
        unit: line.unit.trim(),
        lotNumber: line.lotNumber,
        unitPrice: Number(line.unitPrice) || 0,
        expectedEta: line.expectedEta || undefined,
      })),
      supplierCode: supplierCode.trim(),
      supplierName: supplierName.trim(),
      totalAmount,
      warehouseCode: warehouseCode.trim(),
    } as CreatePurchaseOrderPayload;

    mutation.mutate(payload);
  };

  return (
    <Stack gap="lg">
      {mutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}

      {/* Section: PO Header Info */}
      <Paper withBorder p="md" component="form" id="po-create-form" onSubmit={handleSubmit} className="workbench-section">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={700} size="sm" tt="uppercase" lts="0.04em" c="dimmed">{t('forms.createPoTitle')}</Text>
              <Text size="xs" c="dimmed" mt={2}>Supplier order, item rows, and initial LOT plan.</Text>
            </div>
            <Group gap="xs">
              <Button type="button" variant="subtle" onClick={onCancel} leftSection={<IconX size={16} />}>
                {t('common.cancel')}
              </Button>
              <Button form="po-create-form" type="submit" loading={mutation.isPending} leftSection={<IconShoppingCart size={16} />}>
                {t('common.save')}
              </Button>
            </Group>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 4 }}>
            <TextInput label="PO number" value={poNumber} onChange={(event) => setPoNumber(event.currentTarget.value)} required />
            <Select
              label={t('purchaseOrders.supplierCode')}
              value={supplierCode}
              onChange={(value) => {
                const matched = findSupplierByCode(suppliers, value);
                setSupplierCode(value || '');
                if (matched) {
                  setSupplierName(matched.supplier_name);
                  setCurrency(matched.default_currency_code || currency);
                  setIncoterm(matched.default_incoterm_code || incoterm);
                }
              }}
              data={supplierOptions}
              searchable
              clearable
              required
            />
            <TextInput label={t('purchaseOrders.supplierName')} value={supplierName} onChange={(event) => setSupplierName(event.currentTarget.value)} required />
            <TextInput label={t('purchaseOrders.orderDate')} type="date" value={orderDate} onChange={(event) => setOrderDate(event.currentTarget.value)} />
            <Select
              label={t('forms.currency')}
              value={currency}
              onChange={(value) => setCurrency(value || 'USD')}
              data={currencyOptions}
              searchable
              clearable
            />
            <Select
              label={t('forms.incoterms')}
              value={incoterm}
              onChange={(value) => setIncoterm(value || '')}
              data={incotermOptions}
              searchable
              clearable
            />
            <TextInput label={t('forms.warehouse')} value={warehouseCode} onChange={(event) => setWarehouseCode(event.currentTarget.value)} />
            <Info label="Lots" value={String(lots.length)} />
            <Info label={t('purchaseOrders.total')} value={`${totalAmount.toLocaleString()} ${currency}`} />
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Section: Item Lines */}
      <CompactPoItemTable
        lines={lines}
        lots={lots}
        onAddLine={() => setLines((current) => [...current, newCreateLine(current.length)])}
        onRemoveLine={(lineId) => setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)))}
        onUpdateLine={updateLine}
      />

      {/* Section: Lot Board */}
      <LotDraftBoard
        lots={lots}
        lineSummaries={lines.map((line) => ({
          id: line.id,
          itemCode: line.itemCode || t('purchaseOrders.newItem'),
          itemName: line.itemName || t('purchaseOrders.unnamedItem'),
          quantity: line.quantity,
          unit: line.unit,
          lotNo: line.lotNumber,
        }))}
        onAddLot={addLot}
        onRemoveLot={removeLot}
        onMoveLine={(lineId, lotNo) => updateLine(lineId, { lotNumber: lotNo })}
        saveActions={null}
      />
    </Stack>
  );
}

function CompactPoItemTable({
  lines,
  lots,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}: {
  lines: CreatePoLine[];
  lots: string[];
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onUpdateLine: (lineId: string, patch: Partial<CreatePoLine>) => void;
}) {
  const { t } = useI18n();
  return (
    <Paper withBorder p={0}>
      <Group justify="space-between" p="sm">
        <Text fw={700}>{t('purchaseOrders.poItems')}</Text>
        <Button size="xs" variant="light" onClick={onAddLine} leftSection={<IconPlus size={14} />}>
          {t('purchaseOrders.addItem')}
        </Button>
      </Group>
      <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={980} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 105 }}>{t('common.item')} #</Table.Th>
              <Table.Th>{t('masterData.itemCode')}</Table.Th>
              <Table.Th>{t('masterData.itemName')}</Table.Th>
              <Table.Th style={{ width: 120 }}>{t('forms.quantity')}</Table.Th>
              <Table.Th style={{ width: 100 }}>{t('forms.unit')}</Table.Th>
              <Table.Th style={{ width: 130 }}>{t('purchaseOrders.unitPrice')}</Table.Th>
              <Table.Th style={{ width: 135 }}>LOT</Table.Th>
              <Table.Th style={{ width: 140 }}>ETA</Table.Th>
              <Table.Th style={{ width: 56 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line, index) => (
              <Table.Tr key={line.id}>
                <Table.Td>
                  <Text size="sm" fw={700}>#{index + 1}</Text>
                </Table.Td>
                <Table.Td>
                  <TextInput size="xs" value={line.itemCode} onChange={(event) => onUpdateLine(line.id, { itemCode: event.currentTarget.value })} required />
                </Table.Td>
                <Table.Td>
                  <TextInput size="xs" value={line.itemName} onChange={(event) => onUpdateLine(line.id, { itemName: event.currentTarget.value })} required />
                </Table.Td>
                <Table.Td>
                  <NumberInput size="xs" min={1} value={line.quantity} onChange={(value) => onUpdateLine(line.id, { quantity: Number(value) || 1 })} />
                </Table.Td>
                <Table.Td>
                  <TextInput size="xs" value={line.unit} onChange={(event) => onUpdateLine(line.id, { unit: event.currentTarget.value })} />
                </Table.Td>
                <Table.Td>
                  <NumberInput size="xs" min={0} value={line.unitPrice} onChange={(value) => onUpdateLine(line.id, { unitPrice: Number(value) || 0 })} />
                </Table.Td>
                <Table.Td>
                  <Select size="xs" data={lots} value={line.lotNumber} onChange={(value) => onUpdateLine(line.id, { lotNumber: value ?? DEFAULT_LOT })} />
                </Table.Td>
                <Table.Td>
                  <TextInput size="xs" type="date" value={line.expectedEta} onChange={(event) => onUpdateLine(line.id, { expectedEta: event.currentTarget.value })} />
                </Table.Td>
                <Table.Td>
                  <ActionIcon variant="subtle" color="red" disabled={lines.length === 1} onClick={() => onRemoveLine(line.id)} aria-label={t('purchaseOrders.removeItem')}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: ReactNode;
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
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrderTasks(order.po_number) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      ]);
      onUpdated?.(order);
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
          <Button onClick={() => selectedStage && mutation.mutate(selectedStage)} loading={mutation.isPending} disabled={!selectedStage} color="blue">
            {t('common.save')}
          </Button>
        </Group>
        {mutation.isError ? (
          <Alert color="red" mt="xs">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}

function Gd1PoStageChecklist({ order }: { order: PurchaseOrder }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const tasksQuery = useQuery({
    queryKey: queryKeys.purchaseOrderTasks(order.po_number),
    queryFn: () => fetchPurchaseOrderStageTasks(order.po_number),
    enabled: !!order.po_number,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => updatePoStageTask(taskId, { status }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrderTasks(order.po_number) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
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
              completed: tasks.filter((task) => task.status === 'DONE').length,
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
                <Paper key={task.id} withBorder p="sm" style={{ backgroundColor: isCompleted ? 'rgba(46, 125, 50, 0.05)' : undefined }}>
                  <Group gap="sm" wrap="nowrap">
                    <Checkbox
                      checked={isCompleted}
                      onChange={(event) =>
                        completeMutation.mutate({
                          taskId: task.id,
                          status: event.currentTarget.checked ? 'DONE' : 'PENDING',
                        })
                      }
                      color="teal"
                    />
                    <div>
                      <Text fw={600} size="sm" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {task.task_name}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Badge size="xs" color="gray" variant="light">{task.po_stage}</Badge>
                        <Badge size="xs" color="blue" variant="light">{task.assignee_id}</Badge>
                        {task.due_date ? <Text size="xs" c="dimmed">{new Date(task.due_date).toLocaleDateString()}</Text> : null}
                      </Group>
                    </div>
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

function PurchaseOrderDetailPanel({
  onClose,
  onUpdated,
  order,
}: {
  onClose: () => void;
  onUpdated?: (order: PurchaseOrder) => void;
  order: PurchaseOrder;
}) {
  const { formatNumber, t } = useI18n();
  const queryClient = useQueryClient();
  const sourceSummary = `${order.lots?.length ?? 1} lot / ${order.linked_do_numbers.length} generated DO`;
  const [draftLots, setDraftLots] = useState<string[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const deliveryOrdersQuery = useQuery({
    queryKey: queryKeys.deliveryOrders,
    queryFn: fetchDeliveryOrders,
  });
  const deliveryOrders = deliveryOrdersQuery.data ?? [];

  useEffect(() => {
    const lotNames = order.lots?.map((lot) => lot.lot_no) ?? [];
    const initialLots = lotNames.length > 0 ? lotNames : Array.from(new Set(order.line_items.map((item) => item.lot_number || DEFAULT_LOT)));
    setDraftLots(initialLots.includes(DEFAULT_LOT) ? initialLots : [DEFAULT_LOT, ...initialLots]);
    setDraftAssignments(
      Object.fromEntries(order.line_items.map((line) => [line.id, line.lot_number || order.lots?.find((lot) => lot.allocations.some((allocation) => allocation.po_line_id === line.id))?.lot_no || DEFAULT_LOT])),
    );
  }, [order]);

  const hasAllocationChanges = useMemo(() => {
    const currentLots = (order.lots?.map((lot) => lot.lot_no) ?? [DEFAULT_LOT]).join('|');
    const nextLots = draftLots.join('|');
    if (currentLots !== nextLots) return true;
    return order.line_items.some((line) => (line.lot_number || DEFAULT_LOT) !== (draftAssignments[line.id] || DEFAULT_LOT));
  }, [draftAssignments, draftLots, order]);

  const saveAllocationMutation = useMutation({
    mutationFn: () =>
      updatePurchaseOrderLotAllocation(order.po_number, {
        lots: draftLots.map((lotNo) => {
          const existingLot = order.lots?.find((lot) => lot.lot_no === lotNo);
          return { id: existingLot?.id, lotNo, doNumber: existingLot?.do_number };
        }),
        lineAllocations: order.line_items.map((line) => ({
          poLineId: line.id,
          lotNo: draftAssignments[line.id] || DEFAULT_LOT,
          quantity: line.quantity,
        })),
      }),
    onSuccess: async (updatedOrder) => {
      onUpdated?.(updatedOrder);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
    },
  });

  const resetDraft = () => {
    const lotNames = order.lots?.map((lot) => lot.lot_no) ?? [DEFAULT_LOT];
    setDraftLots(lotNames);
    setDraftAssignments(Object.fromEntries(order.line_items.map((line) => [line.id, line.lot_number || DEFAULT_LOT])));
  };

  const hasLinkedShipment = (lotName: string) => {
    const existingLot = order.lots?.find((lot) => lot.lot_no === lotName);
    if (!existingLot?.do_number) return false;

    return deliveryOrders.some(
      (deliveryOrder) =>
        deliveryOrder.order_info.order_number === existingLot.do_number && Boolean(deliveryOrder.linked_shipment_number),
    );
  };

  const canRemoveLot = (lotName: string, itemCount: number) =>
    lotName !== DEFAULT_LOT && itemCount === 0 && !hasLinkedShipment(lotName);

  const addLot = () => {
    setDraftLots((current) => {
      let index = current.length + 1;
      let lotName = `Lot ${index}`;
      while (current.includes(lotName)) {
        index += 1;
        lotName = `Lot ${index}`;
      }
      return [...current, lotName];
    });
  };

  const removeLot = (lotName: string) => {
    if (!canRemoveLot(lotName, 0)) return;
    setDraftLots((current) => current.filter((lot) => lot !== lotName));
  };

  const moveLine = (lineId: string, lotNo: string) => {
    setDraftAssignments((current) => ({ ...current, [lineId]: lotNo }));
  };

  const lineSummaries = order.line_items.map((line) => ({
    id: line.id,
    itemCode: line.item_code,
    itemName: line.item_name,
    quantity: line.quantity,
    unit: line.unit,
    lotNo: draftAssignments[line.id] || DEFAULT_LOT,
  }));

  return (
    <Stack gap="lg">
      {/* Section: PO Identity & Status */}
      <Paper withBorder p="md" className="workbench-section">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb={4}>
              <Title order={3}>{order.po_number}</Title>
              <StatusBadge status={order.status} />
            </Group>
            <Text c="dimmed" size="sm">
              {order.supplier_name} · {order.warehouse_code}
            </Text>
            <FlowTagBadge tags={order.flow_tags ?? []} />
          </div>
          <Badge color={hasAllocationChanges ? 'orange' : 'teal'} variant="light">
            {hasAllocationChanges ? 'Unsaved allocation changes' : sourceSummary}
          </Badge>
        </Group>
      </Paper>

      {/* Section: PO Metadata */}
      <Paper withBorder p="md">
        <Text fw={700} size="sm" tt="uppercase" lts="0.04em" c="dimmed" mb="sm">{t('forms.orderInfo')}</Text>
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <Info label={t('forms.supplierCode')} value={order.supplier_code} />
          <Info label={t('forms.orderDate')} value={order.order_date} />
          <Info label={t('forms.totalAmount')} value={`${formatNumber(order.total_amount)} ${order.currency}`} />
          <Info label="Version" value={`v${order.version ?? 1}`} />
          <Info label="PO type" value={order.po_type ?? '-'} />
          <Info label="Incoterm" value={order.incoterm ?? '-'} />
          <Info label="Payment" value={order.payment_term ?? '-'} />
          <Info label="ETA" value={order.expected_eta ?? '-'} />
        </SimpleGrid>
      </Paper>

      {/* Section: Item Allocation */}
      <PoLineAllocationTable lines={order.line_items} lots={draftLots} assignments={draftAssignments} onMoveLine={moveLine} />

      {/* Section: Lot Board */}
      <LotDraftBoard
        lots={draftLots}
        lineSummaries={lineSummaries}
        onAddLot={addLot}
        onRemoveLot={removeLot}
        onMoveLine={moveLine}
        canRemoveLot={canRemoveLot}
        saveActions={(
          <Group gap="xs">
            <Button variant="subtle" onClick={resetDraft} disabled={!hasAllocationChanges || saveAllocationMutation.isPending} leftSection={<IconRefresh size={16} />}>
              Reset changes
            </Button>
            <Button
              onClick={() => saveAllocationMutation.mutate()}
              disabled={!hasAllocationChanges}
              loading={saveAllocationMutation.isPending}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Save allocation
            </Button>
          </Group>
        )}
      />

      {saveAllocationMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(saveAllocationMutation.error)}
        </Alert>
      ) : null}

      {/* Section: Stage Control */}
      <Gd1PoStageControlPanel order={order} onUpdated={onUpdated} />
      <Gd1PoStageChecklist order={order} />

      {/* Section: Linked DOs */}
      <Paper withBorder p="md">
        <Text fw={700} size="sm" tt="uppercase" lts="0.04em" c="dimmed" mb="sm">Linked DOs</Text>
        <Group gap="xs">
          {order.linked_do_numbers.map((doCode) => (
            <EntityLink key={doCode} type="do" id={doCode} />
          ))}
        </Group>
      </Paper>
    </Stack>
  );
}

function PoLineAllocationTable({
  assignments,
  lines,
  lots,
  onMoveLine,
}: {
  assignments: Record<string, string>;
  lines: PurchaseOrderLineItem[];
  lots: string[];
  onMoveLine: (lineId: string, lotNo: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Paper withBorder p={0}>
      <Group justify="space-between" p="sm">
        <Text fw={700}>{t('purchaseOrders.itemAllocation')}</Text>
        <Badge variant="light">{t('purchaseOrders.itemAllocationRows', { count: lines.length })}</Badge>
      </Group>
      <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={980} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 105 }}>{t('purchaseOrders.itemNumHeader')}</Table.Th>
              <Table.Th>{t('purchaseOrders.itemHeader')}</Table.Th>
              <Table.Th style={{ width: 120 }}>{t('purchaseOrders.qtyHeader')}</Table.Th>
              <Table.Th style={{ width: 100 }}>{t('purchaseOrders.unitHeader')}</Table.Th>
              <Table.Th style={{ width: 135 }}>{t('purchaseOrders.unitPriceHeader')}</Table.Th>
              <Table.Th style={{ width: 135 }}>{t('purchaseOrders.lotHeader')}</Table.Th>
              <Table.Th style={{ width: 145 }}>{t('purchaseOrders.expectedEtaHeader')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line, index) => (
              <Table.Tr key={line.id} draggable onDragStart={(event: DragEvent<HTMLTableRowElement>) => event.dataTransfer.setData('lineId', line.id)}>
                <Table.Td>
                  <Text size="sm" fw={700}>#{index + 1}</Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '24rem' }}>
                  <Text size="sm" fw={700} lineClamp={1}>{line.item_code}</Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>{line.item_name}</Text>
                </Table.Td>
                <Table.Td>{line.quantity.toLocaleString()}</Table.Td>
                <Table.Td>{line.unit}</Table.Td>
                <Table.Td>{line.unit_price ? <NumberFormatter value={line.unit_price} thousandSeparator /> : '-'}</Table.Td>
                <Table.Td>
                  <Select size="xs" data={lots} value={assignments[line.id] || DEFAULT_LOT} onChange={(value) => onMoveLine(line.id, value ?? DEFAULT_LOT)} />
                </Table.Td>
                <Table.Td>{line.expected_eta ?? line.warehouse_deadline_date}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

function LotDraftBoard({
  lineSummaries,
  lots,
  onAddLot,
  onMoveLine,
  onRemoveLot,
  canRemoveLot,
  saveActions,
}: {
  lineSummaries: Array<{ id: string; itemCode: string; itemName: string; quantity: number; unit: string; lotNo: string }>;
  lots: string[];
  onAddLot: () => void;
  onMoveLine: (lineId: string, lotNo: string) => void;
  onRemoveLot: (lotName: string) => void;
  canRemoveLot?: (lotName: string, itemCount: number) => boolean;
  saveActions: ReactNode;
}) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconGitBranch size={20} />
              <Text fw={700}>LOT allocation</Text>
            </Group>
            <Text size="sm" c="dimmed">
              PO line allocation by LOT before confirmation.
            </Text>
          </div>
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={onAddLot} leftSection={<IconPlus size={14} />}>
              Add LOT
            </Button>
            {saveActions}
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: Math.min(Math.max(lots.length, 1), 4) }} spacing="sm">
          {lots.map((lotName) => {
            const itemsInLot = lineSummaries.filter((line) => normalizeLotName(line.lotNo) === lotName);
            const canRemove = canRemoveLot
              ? canRemoveLot(lotName, itemsInLot.length)
              : lotName !== DEFAULT_LOT && itemsInLot.length === 0;
            return (
              <Paper
                key={lotName}
                withBorder
                p="sm"
                onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  const lineId = event.dataTransfer.getData('lineId');
                  if (lineId) onMoveLine(lineId, lotName);
                }}
                style={{ minHeight: 140, borderStyle: 'dashed' }}
              >
                <Group justify="space-between" mb="xs">
                  <div>
                    <Text fw={700} size="sm">{lotName}</Text>
                    <Text size="xs" c="dimmed">{itemsInLot.length} item rows</Text>
                  </div>
                  <ActionIcon variant="subtle" color="red" disabled={!canRemove} onClick={() => onRemoveLot(lotName)} aria-label={`Remove ${lotName}`}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Stack gap="xs">
                  {itemsInLot.map((line) => (
                    <Paper
                      key={line.id}
                      withBorder
                      p="xs"
                      draggable
                      onDragStart={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData('lineId', line.id)}
                      style={{ cursor: 'grab' }}
                    >
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text size="xs" fw={700} truncate>{line.itemCode}</Text>
                          <Text size="xs" c="dimmed" truncate>{line.itemName}</Text>
                        </div>
                        <Text size="xs" fw={700} style={{ whiteSpace: 'nowrap' }}>
                          {line.quantity} {line.unit}
                        </Text>
                      </Group>
                    </Paper>
                  ))}
                  {itemsInLot.length === 0 ? (
                    <Text size="xs" c="dimmed" fs="italic" ta="center" mt="md">
                      Drop item rows here
                    </Text>
                  ) : null}
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
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
