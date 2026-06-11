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

  it('builds item master data keys with query params', () => {
    expect(queryKeys.itemGroups({ page: 1, limit: 20 })).toEqual([
      'item-groups',
      { page: 1, limit: 20 },
    ]);
    expect(queryKeys.items({ page: 2, limit: 20, q: 'steel' })).toEqual([
      'items',
      { page: 2, limit: 20, q: 'steel' },
    ]);
    expect(queryKeys.itemTaxProfiles('item-1')).toEqual(['items', 'item-1', 'tax-profiles']);
  });

  it('builds trade master data keys with query params', () => {
    expect(queryKeys.currencies({ page: 1, limit: 100 })).toEqual([
      'currencies',
      { page: 1, limit: 100 },
    ]);
    expect(queryKeys.suppliers({ role: 'SUPPLIER', search: 'seal' })).toEqual([
      'suppliers',
      { role: 'SUPPLIER', search: 'seal' },
    ]);
    expect(queryKeys.incotermDetail('incoterm-1')).toEqual([
      'incoterms',
      'detail',
      'incoterm-1',
    ]);
    expect(queryKeys.transportModes({ mode_type: 'SEA' })).toEqual([
      'transport-modes',
      { mode_type: 'SEA' },
    ]);
    expect(queryKeys.masterDataOptions({ types: 'currencies,suppliers' })).toEqual([
      'master-data-options',
      { types: 'currencies,suppliers' },
    ]);
  });
});
