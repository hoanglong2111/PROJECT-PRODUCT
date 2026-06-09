import { describe, expect, it } from 'vitest';

import { queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  it('keeps stable collection keys', () => {
    expect(queryKeys.purchaseOrders).toEqual(['purchase-orders']);
    expect(queryKeys.deliveryOrders).toEqual(['delivery-orders']);
    expect(queryKeys.dashboardStats).toEqual(['dashboard-stats']);
  });

  it('builds scoped keys with identifiers', () => {
    expect(queryKeys.purchaseOrderTasks('PO-2026-000001')).toEqual([
      'purchase-order-tasks',
      'PO-2026-000001',
    ]);
    expect(queryKeys.deliveryOrderAttachments('DO-2026-000001')).toEqual([
      'delivery-order-attachments',
      'DO-2026-000001',
    ]);
    expect(queryKeys.globalSearchResults('po')).toEqual(['global-search', 'po']);
  });
});
