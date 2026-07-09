import { Button, Stack } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { IconPlus, IconShoppingCart } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  fetchPurchaseOrders,
  type ListPurchaseOrdersParams,
  type PurchaseOrderV1,
} from '@shared/api/purchaseOrders';
import { fetchQuotationV1 } from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import {
  fetchSuppliers,
  type Supplier,
} from '@shared/api/tradeMasterData';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

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
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const createParam = searchParams.get('create');
  const fromQuotationId = searchParams.get('fromQuotation');
  const { close: closePoParam, open: openPoParam, value: focusedPo } = useEntityParam('po');
  const [workbench, setWorkbench] = useState<PurchaseOrderWorkbench>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const search = usePurchaseOrdersUiStore((s) => s.search);
  const statusFilter = usePurchaseOrdersUiStore((s) => s.statusFilter);
  const supplierFilter = usePurchaseOrdersUiStore((s) => s.supplierFilter);
  const dateFrom = usePurchaseOrdersUiStore((s) => s.dateFrom);
  const dateTo = usePurchaseOrdersUiStore((s) => s.dateTo);
  const [page, setPage] = useState(1);
  const canManagePurchaseOrders = true;
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

  // Create-from-quotation: when navigated here with ?create=1&fromQuotation=<id>,
  // open the create workbench and load the quotation to prefill the PO header.
  const fromQuotationQuery = useQuery({
    enabled: Boolean(fromQuotationId),
    queryKey: queryKeys.quotationDetail(fromQuotationId ?? ''),
    queryFn: () => fetchQuotationV1(fromQuotationId ?? ''),
  });

  useEffect(() => {
    if (createParam === '1') {
      setSelectedId(null);
      setWorkbench('create');
    }
  }, [createParam, fromQuotationId]);

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
        title={t('purchaseOrders.title')}
        description={t('purchaseOrders.loadingDescription')}
        tableColumns={['PO', t('purchaseOrders.supplier'), t('common.status'), 'ETA', t('purchaseOrders.poLinesHeaderAmount')]}
      />
    );
  }

  if (purchaseOrdersQuery.isError) {
    return (
      <PageError
        title={t('purchaseOrders.title')}
        description={t('purchaseOrders.errorDescription')}
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
        <PageHeader
          className="purchase-orders-page-header"
          titleClassName="purchase-orders-page-title"
          actionsClassName="purchase-orders-page-actions"
          icon={<IconShoppingCart size={20} />}
          title={t('purchaseOrders.title')}
          subtitle={t('purchaseOrders.subtitle')}
          actions={
            <Button
              className="purchase-orders-primary-action"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                closePoParam({ clear: ['pr', 'do', 'task'] });
                setSelectedId(null);
                setWorkbench('create');
              }}
            >
              {t('purchaseOrders.createPo')}
            </Button>
          }
        />
      ) : null}

      {workbench === 'create' ? (
        <PurchaseOrderForm
          mode="create"
          quotation={fromQuotationQuery.data}
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
