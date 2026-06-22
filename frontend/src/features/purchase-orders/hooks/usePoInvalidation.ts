import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@shared/api/queryKeys';

export function usePoInvalidation(purchaseOrderId?: string) {
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
