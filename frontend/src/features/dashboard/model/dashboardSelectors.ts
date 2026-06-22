import dayjs, { type Dayjs } from 'dayjs';

import type { DeliveryOrder, LogisticsTask, PurchaseOrder } from '@shared/api/logistics';
import {
  getDeliveryOrderRisks,
  getPrimaryOperationalRisk,
  type OperationalRisk,
} from '@entities/logistics';

export type DashboardRiskRow = {
  deliveryOrder: DeliveryOrder;
  primaryRisk: OperationalRisk;
  risks: OperationalRisk[];
};

export type MonthlyPurchaseOrderPoint = {
  label: string;
  month: string;
  po: number;
};

export function getActiveDeliveryOrders(deliveryOrders: DeliveryOrder[]) {
  return deliveryOrders.filter((deliveryOrder) => deliveryOrder.order_info.status !== 'DELIVERED');
}

export function getBlockedTasks(tasks: LogisticsTask[]) {
  return tasks.filter((task) => task.status === 'BLOCKED');
}

export function getMissingDocumentOrders(deliveryOrders: DeliveryOrder[]) {
  return deliveryOrders.filter((deliveryOrder) => deliveryOrder.logistics_shipping.missing_documents.length > 0);
}

export function getDashboardRiskRows(deliveryOrders: DeliveryOrder[]): DashboardRiskRow[] {
  return deliveryOrders
    .map((deliveryOrder) => ({
      deliveryOrder,
      primaryRisk: getPrimaryOperationalRisk(deliveryOrder),
      risks: getDeliveryOrderRisks(deliveryOrder),
    }))
    .filter((row): row is DashboardRiskRow => Boolean(row.primaryRisk))
    .sort((a, b) => b.risks.length - a.risks.length)
    .slice(0, 6);
}

export function getMonthlyPurchaseOrderData(
  purchaseOrders: PurchaseOrder[],
  currentMonth: Dayjs = dayjs(),
): MonthlyPurchaseOrderPoint[] {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(currentMonth.subtract(i, 'month').format('YYYY-MM'));
  }

  return months.map((month) => {
    const poCount = purchaseOrders.filter((po) => {
      const dateStr = po.order_date;
      return dateStr && dateStr.startsWith(month);
    }).length;

    return {
      month,
      label: dayjs(month, 'YYYY-MM').format('MM/YY'),
      po: poCount,
    };
  });
}
