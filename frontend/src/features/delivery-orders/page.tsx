import { Paper, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { WorkbenchHeader } from '@shared/components/WorkbenchHeader';
import { fetchDeliveryOrders } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import {
  deliveryOrderStatusTabs,
  deliveryOrderTabItems,
  hasOperationalRisk,
  type DeliveryOrderTab,
} from './model/deliveryOrderModel';
import { useDeliveryOrdersUiStore } from './model/deliveryOrdersUiStore';
import { DeliveryOrderDetail } from './components/DeliveryOrderDetail';
import { DeliveryOrderListView } from './components/DeliveryOrderListView';

export function DeliveryOrders() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const { close: closeDoParam, open: openDoParam, value: focusedDo } = useEntityParam('do');
  const { value: focusedPo } = useEntityParam('po');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeTab = useDeliveryOrdersUiStore((s) => s.activeTab);
  const flowFilter = useDeliveryOrdersUiStore((s) => s.flowFilter);
  const supplierFilter = useDeliveryOrdersUiStore((s) => s.supplierFilter);
  const search = useDeliveryOrdersUiStore((s) => s.search);
  const riskOnly = useDeliveryOrdersUiStore((s) => s.riskOnly);
  const setActiveTab = useDeliveryOrdersUiStore((s) => s.setActiveTab);

  const deliveryOrdersQuery = useQuery({
    queryKey: queryKeys.deliveryOrders,
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
    if (!focusedDo && !focusedPo) {
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

      if (focusedPo) {
        return (
          deliveryOrder.source_po_number === focusedPo ||
          deliveryOrder.sap_integration.po_number === focusedPo
        );
      }

      return false;
    });

    if (matchedOrder) {
      setSelectedId(matchedOrder.id);
    }
  }, [deliveryOrders, focusedDo, focusedPo]);

  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          deliveryOrders
            .map((deliveryOrder) => deliveryOrder.sap_integration.supplier_name)
            .filter((name): name is string => Boolean(name)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    [deliveryOrders],
  );

  const filteredDeliveryOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return deliveryOrders.filter((deliveryOrder) => {
      const statusMatchesTab = statusParam
        ? deliveryOrder.order_info.status === statusParam
        : (activeTab === 'all' || deliveryOrderStatusTabs[activeTab].includes(deliveryOrder.order_info.status));
      const matchesFlow = flowFilter === 'all' || deliveryOrder.flow_tags.includes(flowFilter);
      const matchesSupplier = !supplierFilter || deliveryOrder.sap_integration.supplier_name === supplierFilter;
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

      return statusMatchesTab && matchesFlow && matchesSupplier && matchesRisk && matchesSearch;
    });
  }, [activeTab, deliveryOrders, flowFilter, riskOnly, search, statusParam, supplierFilter]);

  const tabCounts = useMemo(
    () =>
      deliveryOrderTabItems.reduce<Record<DeliveryOrderTab, number>>(
        (counts, tab) => {
          if (tab.value === 'all') {
            counts[tab.value] = deliveryOrders.length;
            return counts;
          }

          const statusTab = tab.value as Exclude<DeliveryOrderTab, 'all'>;
          counts[tab.value] = deliveryOrders.filter((deliveryOrder) =>
            deliveryOrderStatusTabs[statusTab].includes(deliveryOrder.order_info.status),
          ).length;
          return counts;
        },
        {
          all: 0,
          completed: 0,
          customsCleared: 0,
          customsWaiting: 0,
          delivering: 0,
          handover: 0,
          internationalTransit: 0,
          issues: 0,
          processing: 0,
        },
      ),
    [deliveryOrders],
  );

  const selectedDeliveryOrder =
    selectedId === null
      ? null
      : filteredDeliveryOrders.find((deliveryOrder) => deliveryOrder.id === selectedId) ??
      deliveryOrders.find((deliveryOrder) => deliveryOrder.id === selectedId) ??
      null;
  const closeDetail = () => {
    setSelectedId(null);
    closeDoParam({ clear: ['po', 'task'] });
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
          t('deliveryOrders.sourcePoLot'),
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
    <Stack gap="md">
      {!selectedDeliveryOrder ? (
        <PageHeader title={t('deliveryOrders.title')} subtitle={t('deliveryOrders.subtitle')} />
      ) : (
        <WorkbenchHeader onBack={closeDetail} />
      )}

      {focusedDo || focusedPo ? (
        <Paper withBorder p="md" className="flow-context">
          <Text size="sm">
            {t('deliveryOrders.context', { kind: focusedDo ? 'DO' : 'PO', id: focusedDo ?? focusedPo })}
          </Text>
        </Paper>
      ) : null}

      {selectedDeliveryOrder ? (
        <DeliveryOrderDetail deliveryOrder={selectedDeliveryOrder} onClose={closeDetail} />
      ) : (
        <DeliveryOrderListView
          deliveryOrders={deliveryOrders}
          filteredDeliveryOrders={filteredDeliveryOrders}
          isFetching={isFetching}
          onInspect={(deliveryOrder) => {
            setSelectedId(deliveryOrder.id);
            openDoParam(deliveryOrder.order_info.order_number, { clear: ['pr', 'po', 'task'] });
          }}
          statusParam={statusParam}
          supplierOptions={supplierOptions}
          tabCounts={tabCounts}
        />
      )}

    </Stack>
  );
}
