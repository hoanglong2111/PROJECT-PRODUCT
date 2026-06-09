import { useQuery } from '@tanstack/react-query';

import {
  fetchDashboardStats,
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  fetchPurchaseOrders,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';

export function useDashboardData() {
  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrders,
    queryFn: fetchPurchaseOrders,
  });
  const deliveryOrdersQuery = useQuery({
    queryKey: queryKeys.deliveryOrders,
    queryFn: fetchDeliveryOrders,
  });
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: fetchLogisticsTasks,
  });
  const dashboardStatsQuery = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: fetchDashboardStats,
  });

  const queries = [purchaseOrdersQuery, deliveryOrdersQuery, tasksQuery, dashboardStatsQuery] as const;

  return {
    dashboardStats: dashboardStatsQuery.data,
    deliveryOrders: deliveryOrdersQuery.data ?? [],
    errorQuery: queries.find((query) => query.isError),
    loading: queries.some((query) => query.isLoading),
    purchaseOrders: purchaseOrdersQuery.data ?? [],
    queries,
    tasks: tasksQuery.data ?? [],
  };
}
