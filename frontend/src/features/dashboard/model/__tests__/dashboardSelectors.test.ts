import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import type { DeliveryOrder, LogisticsTask, PurchaseOrder } from '@shared/api/logistics';

import {
  getActiveDeliveryOrders,
  getBlockedTasks,
  getMissingDocumentOrders,
  getMonthlyPurchaseOrderData,
} from '../dashboardSelectors';

describe('dashboard selectors', () => {
  it('derives active delivery orders without mutating input', () => {
    const deliveryOrders = [
      makeDeliveryOrder('DO-1', 'IN_TRANSIT', []),
      makeDeliveryOrder('DO-2', 'DELIVERED', []),
    ];

    expect(getActiveDeliveryOrders(deliveryOrders).map((order) => order.order_info.order_number)).toEqual(['DO-1']);
    expect(deliveryOrders).toHaveLength(2);
  });

  it('finds blocked tasks and missing-document orders', () => {
    const tasks = [
      { status: 'BLOCKED' },
      { status: 'TODO' },
    ] as LogisticsTask[];
    const deliveryOrders = [
      makeDeliveryOrder('DO-1', 'IN_TRANSIT', ['Invoice']),
      makeDeliveryOrder('DO-2', 'IN_TRANSIT', []),
    ];

    expect(getBlockedTasks(tasks)).toHaveLength(1);
    expect(getMissingDocumentOrders(deliveryOrders).map((order) => order.order_info.order_number)).toEqual(['DO-1']);
  });

  it('groups purchase orders into the last six months', () => {
    const purchaseOrders = [
      { order_date: '2026-01-12' },
      { order_date: '2026-06-01' },
      { order_date: '2026-06-20' },
    ] as PurchaseOrder[];

    const points = getMonthlyPurchaseOrderData(purchaseOrders, dayjs('2026-06-09'));

    expect(points.map((point) => point.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
    expect(points.map((point) => point.po)).toEqual([1, 0, 0, 0, 0, 2]);
  });
});

function makeDeliveryOrder(
  orderNumber: string,
  status: DeliveryOrder['order_info']['status'],
  missingDocuments: string[],
): DeliveryOrder {
  return {
    id: orderNumber,
    order_info: {
      order_number: orderNumber,
      request_code: '',
      tracking_number: null,
      purchase_contract_number: '',
      status,
      notes: '',
      xnk_notes: '',
    },
    logistics_shipping: {
      missing_documents: missingDocuments,
    },
  } as DeliveryOrder;
}
