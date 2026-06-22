import { Badge, Button, Group, Stack, Text, Title } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { IconArrowBackUp, IconPlus, IconTruckDelivery } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  fetchPurchaseOrders,
  type ListPurchaseOrdersParams,
  type PurchaseOrderV1,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchSuppliers,
  type Supplier,
} from '@shared/api/tradeMasterData';
import { useAuth } from '@shared/auth/useAuth';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useEntityParam } from '@shared/hooks/useEntityParam';

import {
  PAGE_SIZE,
  getDelayedDays,
  getPurchaseOrderSummary,
  resolvePoStage,
  type PurchaseOrderWorkbench,
} from './model/purchaseOrderModel';
import { mapStatusFilterToApi } from './model/poStageConfig';
import { usePurchaseOrdersUiStore } from './model/purchaseOrdersUiStore';
import { PurchaseOrderDetailPanel } from './components/PurchaseOrderDetailPanel';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';
import { PurchaseOrderListView } from './components/PurchaseOrderListView';

export function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const { user } = useAuth();
  const { close: closePoParam, open: openPoParam, value: focusedPo } = useEntityParam('po');
  const [workbench, setWorkbench] = useState<PurchaseOrderWorkbench>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const search = usePurchaseOrdersUiStore((s) => s.search);
  const statusFilter = usePurchaseOrdersUiStore((s) => s.statusFilter);
  const supplierFilter = usePurchaseOrdersUiStore((s) => s.supplierFilter);
  const dateFrom = usePurchaseOrdersUiStore((s) => s.dateFrom);
  const dateTo = usePurchaseOrdersUiStore((s) => s.dateTo);
  const [page, setPage] = useState(1);
  const canManagePurchaseOrders = user?.role === 'ADMIN' || user?.role === 'PIC_MANAGER';
  const supplierParams = useMemo(() => ({ page: 1, limit: 100, role: 'SUPPLIER', is_active: true }), []);
  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(supplierParams),
    queryFn: () => fetchSuppliers(supplierParams),
  });
  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data?.data ?? []).map((supplier: Supplier) => ({
        label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
        value: supplier.id,
      })),
    [suppliersQuery.data?.data],
  );

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, search, statusFilter, supplierFilter, monthParam]);

  const statusFilterRoute = useMemo(() => mapStatusFilterToApi(statusFilter), [statusFilter]);

  const listParams = useMemo<ListPurchaseOrdersParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || monthParam || undefined,
      status: statusFilterRoute.apiStatus,
      supplier_id: supplierFilter || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined,
    }),
    [dateFrom, dateTo, monthParam, page, search, statusFilterRoute.apiStatus, supplierFilter],
  );

  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrdersList(listParams),
    queryFn: () => fetchPurchaseOrders(listParams),
    placeholderData: keepPreviousData,
  });

  const rawPurchaseOrders = purchaseOrdersQuery.data?.data ?? [];
  const purchaseOrders = useMemo(() => {
    const clientFilter = statusFilterRoute.clientStageFilter;
    if (!clientFilter) return rawPurchaseOrders;
    return rawPurchaseOrders.filter((order) => {
      const resolvedStage = resolvePoStage(order);
      if (clientFilter.kind === 'stage') return resolvedStage.stageKey === clientFilter.stageKey;
      return resolvedStage.statusCode === clientFilter.statusCode;
    });
  }, [rawPurchaseOrders, statusFilterRoute.clientStageFilter]);
  // Stage chip counts use the UNFILTERED page so the chips stay switchable even
  // while a stage filter is active.
  const stageCounts = useMemo(
    () =>
      rawPurchaseOrders.reduce<Record<string, number>>((acc, order) => {
        const { stageKey } = resolvePoStage(order);
        acc[stageKey] = (acc[stageKey] ?? 0) + 1;
        return acc;
      }, {}),
    [rawPurchaseOrders],
  );
  // Sub-status chip counts, keyed by the resolved lifecycle status code, so a
  // drilled-down chip shows how many POs it will match before clicking.
  const subStageCounts = useMemo(
    () =>
      rawPurchaseOrders.reduce<Record<string, number>>((acc, order) => {
        const { statusCode } = resolvePoStage(order);
        acc[statusCode] = (acc[statusCode] ?? 0) + 1;
        return acc;
      }, {}),
    [rawPurchaseOrders],
  );
  const pagination = purchaseOrdersQuery.data?.meta.pagination;
  const total = purchaseOrdersQuery.data?.meta.total ?? rawPurchaseOrders.length;
  const purchaseOrderSummary = useMemo(() => getPurchaseOrderSummary(purchaseOrders), [purchaseOrders]);
  const delayedPurchaseOrders = purchaseOrders.filter((order) => getDelayedDays(order) > 0).length;

  useEffect(() => {
    if (!focusedPo) {
      // The ?po param was cleared (e.g. browser back) — leave the detail view.
      if (workbench === 'detail') {
        setSelectedId(null);
        setWorkbench('list');
      }
      return;
    }
    if (purchaseOrders.length === 0) return;
    const matchedOrder = purchaseOrders.find((order) => order.po_no === focusedPo);
    if (matchedOrder) {
      setSelectedId(matchedOrder.id);
      setWorkbench('detail');
    }
  }, [focusedPo, purchaseOrders, workbench]);

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
    <Stack gap="lg" className="purchase-orders-workbench">
      {workbench === 'list' ? (
        <Group justify="space-between" align="flex-start" className="purchase-orders-page-header">
          <div className="purchase-orders-page-title">
            <Title order={1}>Purchase Orders</Title>
            <Text c="dimmed" mt={4}>
              Operational PO intake, supplier confirmation, and LOT planning.
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap" className="purchase-orders-page-actions">
            {canManagePurchaseOrders ? (
              <Button
                className="purchase-orders-primary-action"
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
        <Group justify="space-between" className="purchase-orders-subheader">
          <Button className="purchase-orders-back-action" leftSection={<IconArrowBackUp size={16} />} variant="subtle" onClick={closeWorkbench}>
            Back to list
          </Button>
          <Badge className="purchase-orders-api-badge" leftSection={<IconTruckDelivery size={14} />} variant="light">
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
        <PurchaseOrderListView
          delayedPurchaseOrders={delayedPurchaseOrders}
          isClientSideStatusFilter={Boolean(statusFilterRoute.clientStageFilter)}
          isFetching={purchaseOrdersQuery.isFetching}
          onOpenDetail={openDetail}
          onRefresh={() => {
            void purchaseOrdersQuery.refetch();
          }}
          page={page}
          pageCount={pagination?.totalPages ?? 1}
          purchaseOrderSummary={purchaseOrderSummary}
          purchaseOrders={purchaseOrders}
          setPage={setPage}
          stageCounts={stageCounts}
          subStageCounts={subStageCounts}
          supplierOptions={supplierOptions}
          total={total}
        />
      ) : null}
    </Stack>
  );
}
