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
    expect(queryKeys.deliveryOrderDetail('do-1')).toEqual([
      'delivery-orders',
      'detail',
      'do-1',
    ]);
    expect(queryKeys.purchaseOrderDeliveryOrders('po-1')).toEqual([
      'purchase-orders',
      'po-1',
      'delivery-orders',
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
    expect(queryKeys.forwarders({ q: 'fds' })).toEqual([
      'forwarders',
      { q: 'fds' },
    ]);
    expect(queryKeys.carriers({ carrier_type: 'SHIPPING_LINE' })).toEqual([
      'carriers',
      { carrier_type: 'SHIPPING_LINE' },
    ]);
    expect(queryKeys.taskTemplatesList({ milestone_code: 'MS3_LOADED' })).toEqual([
      'task-templates',
      { milestone_code: 'MS3_LOADED' },
    ]);
    expect(queryKeys.masterDataOptions({ types: 'currencies,suppliers' })).toEqual([
      'master-data-options',
      { types: 'currencies,suppliers' },
    ]);
  });

  it('builds delivery order V1 keys with query params', () => {
    expect(queryKeys.deliveryOrdersList({ page: 1, limit: 20, status: 'DRAFT' })).toEqual([
      'delivery-orders',
      'list',
      { page: 1, limit: 20, status: 'DRAFT' },
    ]);
    expect(queryKeys.deliveryOrderLots('do-1')).toEqual(['delivery-orders', 'do-1', 'lots']);
    expect(queryKeys.deliveryOrderLines('do-1')).toEqual(['delivery-orders', 'do-1', 'lines']);
  });

  it('builds domestic transport order V1 keys with query params and identifiers', () => {
    expect(queryKeys.domesticTransportOrders).toEqual(['domestic-transport-orders']);
    expect(queryKeys.domesticTransportOrdersList({ status: 'QUOTE_CONFIRMED' })).toEqual([
      'domestic-transport-orders',
      'list',
      { status: 'QUOTE_CONFIRMED' },
    ]);
    expect(queryKeys.domesticTransportOrderDetail('dto-1')).toEqual([
      'domestic-transport-orders',
      'detail',
      'dto-1',
    ]);
  });

  it('builds quotation V1 keys with query params and identifiers', () => {
    expect(queryKeys.quotationsList({ ref_type: 'DELIVERY_ORDER', ref_id: 'do-1' })).toEqual([
      'quotations',
      'list',
      { ref_type: 'DELIVERY_ORDER', ref_id: 'do-1' },
    ]);
    expect(queryKeys.quotationChargeLines('qt-1')).toEqual(['quotations', 'qt-1', 'charge-lines']);
    expect(queryKeys.quotationOptions('qt-1')).toEqual(['quotations', 'qt-1', 'options']);
    expect(queryKeys.quotationVersions('qt-1')).toEqual(['quotations', 'qt-1', 'versions']);
    expect(queryKeys.quotationEvents('qt-1')).toEqual(['quotations', 'qt-1', 'events']);
    expect(queryKeys.quotationRequests).toEqual(['quotation-requests']);
    expect(queryKeys.quotationRequestsList({ status: 'SUBMITTED' })).toEqual([
      'quotation-requests',
      'list',
      { status: 'SUBMITTED' },
    ]);
    expect(queryKeys.quotationRequestDetail('qr-1')).toEqual(['quotation-requests', 'detail', 'qr-1']);
  });

  it('builds shipment V1 keys with query params and identifiers', () => {
    expect(queryKeys.shipmentsList({ status: 'IN_TRANSIT', page: 1 })).toEqual([
      'shipments',
      'list',
      { status: 'IN_TRANSIT', page: 1 },
    ]);
    expect(queryKeys.shipmentDetail('shp-1')).toEqual(['shipments', 'detail', 'shp-1']);
    expect(queryKeys.shipmentMilestones('shp-1')).toEqual(['shipments', 'shp-1', 'milestones']);
    expect(queryKeys.shipmentDocuments('shp-1')).toEqual(['shipments', 'shp-1', 'documents']);
  });

  it('builds customs declaration V1 keys with shipment and declaration identifiers', () => {
    expect(queryKeys.customsDeclarationsByShipment('shp-1')).toEqual([
      'shipments',
      'shp-1',
      'customs-declarations',
    ]);
    expect(queryKeys.customsDeclarationDetail('cd-1')).toEqual(['customs-declarations', 'detail', 'cd-1']);
    expect(queryKeys.customsDeclarationLines('cd-1')).toEqual(['customs-declarations', 'cd-1', 'lines']);
  });
});
