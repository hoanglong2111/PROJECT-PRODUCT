import { Group, NumberFormatter, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconChecklist, IconShoppingCart, IconTruckDelivery } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type {
  DashboardStats,
  DeliveryOrder,
  DeliveryOrderStatus,
  LogisticsTask,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

type MetricColor = 'blue' | 'orange' | 'teal' | 'yellow' | 'red';

type ListMetric = {
  color: MetricColor;
  label: string;
  value: number;
};

type Translate = (key: string, params?: Record<string, number | string>) => string;

export function DashboardCharts({
  deliveryOrders,
  purchaseOrders,
  stats,
  tasks,
}: {
  stats: DashboardStats;
  deliveryOrders: DeliveryOrder[];
  purchaseOrders: PurchaseOrder[];
  tasks: LogisticsTask[];
}) {
  const { t } = useI18n();
  const maxMonthly = Math.max(...stats.monthlyThroughput.flatMap((item) => [item.deliveryOrders, item.completedTasks]), 1);
  const poDelivered = purchaseOrders.filter((purchaseOrder) =>
    deliveredPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const poProcessing = purchaseOrders.filter((purchaseOrder) =>
    processingPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const poBars = [
    { color: 'orange' as const, label: t('dashboard.poTotal'), value: purchaseOrders.length },
    { color: 'teal' as const, label: t('dashboard.poDelivered'), value: poDelivered },
    { color: 'blue' as const, label: t('dashboard.poProcessing'), value: poProcessing },
  ];

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-chart-card">
          <CardHeader
            title={t('dashboard.purchaseOrderChartTitle')}
            description={t('dashboard.purchaseOrderChartDescription')}
          />
          <PoBarChart ariaLabel={t('dashboard.purchaseOrderChartAria')} data={poBars} />
        </Paper>

        <MetricListCard title={t('dashboard.deliveryDelayTitle')} metrics={getDeliveryDelayMetrics(deliveryOrders, t)} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <MetricListCard title={t('dashboard.overdueWorkTitle')} metrics={getOverdueTaskMetrics(tasks, deliveryOrders, t)} />
        <MetricListCard title={t('dashboard.delayAgeTitle')} metrics={getDelayAgeMetrics(deliveryOrders, t)} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-chart-card">
          <CardHeader title={t('dashboard.monthlyThroughputChart')} description={t('dashboard.monthlyThroughputDescription')} />
          <Stack gap="sm">
            {stats.monthlyThroughput.map((item) => (
              <div key={item.month} className="dashboard-progress-row">
                <Group justify="space-between" mb={6}>
                  <Text size="sm" fw={700}>
                    {item.month}
                  </Text>
                  <Text size="sm" fw={800} className="tabular-nums">
                    {t('dashboard.throughputLegend', {
                      completedTasks: item.completedTasks,
                      deliveryOrders: item.deliveryOrders,
                    })}
                  </Text>
                </Group>
                <Stack gap={4}>
                  <Link to="/delivery-orders" title={t('dashboard.viewDeliveryOrders')}>
                    <Progress value={Math.round((item.deliveryOrders / maxMonthly) * 100)} color="blue" />
                  </Link>
                  <Link to="/tasks" title={t('dashboard.viewTasks')}>
                    <Progress value={Math.round((item.completedTasks / maxMonthly) * 100)} color="teal" />
                  </Link>
                </Stack>
              </div>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-chart-card">
          <CardHeader title={t('dashboard.modulesTitle')} description={t('dashboard.modulesDescription')} />
          <Stack gap="sm" mt="md">
            <ModuleLink
              to="/purchase-orders"
              icon={<IconShoppingCart size={20} />}
              title={t('dashboard.modulePurchaseOrdersTitle')}
              description={t('dashboard.modulePurchaseOrdersDescription')}
            />
            <ModuleLink
              to="/delivery-orders"
              icon={<IconTruckDelivery size={20} />}
              title={t('dashboard.moduleDeliveryOrdersTitle')}
              description={t('dashboard.moduleDeliveryOrdersDescription')}
            />
            <ModuleLink
              to="/tasks"
              icon={<IconChecklist size={20} />}
              title={t('dashboard.moduleTasksTitle')}
              description={t('dashboard.moduleTasksDescription')}
            />
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

function CardHeader({ description, title }: { description?: string; title: string }) {
  return (
    <Stack gap={4} mb="md">
      <Title order={3}>{title}</Title>
      {description ? (
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}

function PoBarChart({ ariaLabel, data }: { ariaLabel: string; data: Array<{ color: MetricColor; label: string; value: number }> }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Stack gap="md">
      <div className="dashboard-bar-chart" aria-label={ariaLabel}>
        {data.map((item) => {
          const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 4);
          return (
            <div key={item.label} className="dashboard-bar-column">
              <Text size="sm" fw={900} className="tabular-nums">
                <NumberFormatter value={item.value} thousandSeparator />
              </Text>
              <div
                className={`dashboard-bar dashboard-bar-${item.color}`}
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <Text size="xs" c="dimmed" ta="center" fw={800}>
                {item.label}
              </Text>
            </div>
          );
        })}
      </div>

      <Group justify="center" gap="lg">
        {data.map((item) => (
          <Group key={item.label} gap={6} wrap="nowrap">
            <span className={`dashboard-legend-dot dashboard-legend-dot-${item.color}`} />
            <Text size="xs" fw={800}>
              {item.label}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

function MetricListCard({ metrics, title }: { metrics: ListMetric[]; title: string }) {
  return (
    <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-list-card">
      <CardHeader title={title} />
      <Stack gap="xs">
        {metrics.map((metric) => (
          <Group key={metric.label} justify="space-between" gap="md" wrap="nowrap" className="dashboard-list-row">
            <Text size="sm" fw={750} truncate>
              {metric.label}
            </Text>
            <span className={`dashboard-number-badge dashboard-number-badge-${metric.color}`}>
              <NumberFormatter value={metric.value} thousandSeparator />
            </span>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

function ModuleLink({ description, icon, title, to }: { description: string; icon: ReactNode; title: string; to: string }) {
  return (
    <Paper component={Link} to={to} withBorder p="md" className="module-link">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <span className="module-link-icon">{icon}</span>
          <div>
            <Text fw={800}>{title}</Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </div>
        </Group>
        <IconArrowRight size={18} />
      </Group>
    </Paper>
  );
}

const deliveredPurchaseOrderStatuses: PurchaseOrderStatus[] = ['RECEIVED', 'CLOSED'];
const processingPurchaseOrderStatuses: PurchaseOrderStatus[] = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'PARTIALLY_DELIVERED',
];

const supplierPendingStatuses: DeliveryOrderStatus[] = [
  'DRAFT',
  'CREATED',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'READY_FOR_QUOTATION',
  'QUOTATION_CONFIRMED',
];
const transportStatuses: DeliveryOrderStatus[] = ['ASSIGNED_TO_SHIPMENT', 'IN_TRANSIT'];
const portStatuses: DeliveryOrderStatus[] = ['ARRIVED_PORT', 'CUSTOMS_PROCESSING', 'WAREHOUSE_PENDING'];
const finalDeliveryStatuses: DeliveryOrderStatus[] = ['WAREHOUSE_PENDING', 'DELAYED'];

function getDeliveryDelayMetrics(deliveryOrders: DeliveryOrder[], t: Translate): ListMetric[] {
  return [
    { color: 'orange', label: t('dashboard.deliveryDelaySupplier'), value: countDelayedOrders(deliveryOrders, supplierPendingStatuses) },
    { color: 'blue', label: t('dashboard.deliveryDelayTransport'), value: countDelayedOrders(deliveryOrders, transportStatuses, 'eta') },
    { color: 'yellow', label: t('dashboard.deliveryDelayCustoms'), value: countDelayedOrders(deliveryOrders, portStatuses) },
    { color: 'red', label: t('dashboard.deliveryDelayFinal'), value: countDelayedOrders(deliveryOrders, finalDeliveryStatuses) },
  ];
}

function getOverdueTaskMetrics(tasks: LogisticsTask[], deliveryOrders: DeliveryOrder[], t: Translate): ListMetric[] {
  return [
    {
      color: 'orange',
      label: t('dashboard.overdueQuotation'),
      value: countOverdueTasks(tasks, ['bao gia', 'quotation']) + countOrdersByStatus(deliveryOrders, ['READY_FOR_QUOTATION']),
    },
    {
      color: 'blue',
      label: t('dashboard.overdueBooking'),
      value: countOverdueTasks(tasks, ['booking']) + countOrdersByStatus(deliveryOrders, ['QUOTATION_CONFIRMED']),
    },
    {
      color: 'yellow',
      label: t('dashboard.overdueDocuments'),
      value: countOverdueTasks(tasks, ['chung tu', 'document']) + countMissingDocumentOrders(deliveryOrders),
    },
    {
      color: 'teal',
      label: t('dashboard.overdueCustomsOpen'),
      value: countOverdueTasks(tasks, ['to khai', 'customs']) + countOrdersByStatus(deliveryOrders, ['CUSTOMS_PROCESSING']),
    },
    {
      color: 'red',
      label: t('dashboard.overdueDelivery'),
      value: countOverdueTasks(tasks, ['giao hang', 'delivery']) + countDelayedOrders(deliveryOrders, finalDeliveryStatuses),
    },
  ];
}

function getDelayAgeMetrics(deliveryOrders: DeliveryOrder[], t: Translate): ListMetric[] {
  const delayDays = deliveryOrders.map(getDelayDays).filter((days) => days > 0);

  return [
    { color: 'yellow', label: t('dashboard.delayUnder3Days'), value: delayDays.filter((days) => days < 3).length },
    { color: 'orange', label: t('dashboard.delay3To7Days'), value: delayDays.filter((days) => days >= 3 && days <= 7).length },
    { color: 'red', label: t('dashboard.delayOver7Days'), value: delayDays.filter((days) => days > 7).length },
  ];
}

function countDelayedOrders(deliveryOrders: DeliveryOrder[], statuses: DeliveryOrderStatus[], dateKind: 'warehouse' | 'eta' = 'warehouse') {
  return deliveryOrders.filter((deliveryOrder) => {
    if (!statuses.includes(deliveryOrder.order_info.status)) return false;
    return dateKind === 'eta' ? isPastDue(deliveryOrder.logistics_shipping.eta_planned) : getDelayDays(deliveryOrder) > 0;
  }).length;
}

function countOrdersByStatus(deliveryOrders: DeliveryOrder[], statuses: DeliveryOrderStatus[]) {
  return deliveryOrders.filter((deliveryOrder) => statuses.includes(deliveryOrder.order_info.status)).length;
}

function countMissingDocumentOrders(deliveryOrders: DeliveryOrder[]) {
  return deliveryOrders.filter((deliveryOrder) => deliveryOrder.logistics_shipping.missing_documents.length > 0).length;
}

function countOverdueTasks(tasks: LogisticsTask[], keywords: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter((task) => {
    const unresolved = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
    const text = removeVietnameseTones(`${task.task_name} ${task.notes}`).toLowerCase();
    return unresolved && task.due_date < today && keywords.some((keyword) => text.includes(removeVietnameseTones(keyword).toLowerCase()));
  }).length;
}

function getDelayDays(deliveryOrder: DeliveryOrder) {
  if (deliveryOrder.warehouse_tracking.actual_entry_date) {
    return Math.max(deliveryOrder.warehouse_tracking.delay_days, 0);
  }

  const deadline = deliveryOrder.warehouse_tracking.planned_entry_date || deliveryOrder.warehouse_tracking.warehouse_deadline;
  if (!deadline) return Math.max(deliveryOrder.warehouse_tracking.delay_days, 0);

  const due = new Date(`${deadline.slice(0, 10)}T00:00:00`);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return Math.max(days, deliveryOrder.warehouse_tracking.delay_days, 0);
}

function isPastDue(value: string | null) {
  if (!value) return false;
  return value.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function removeVietnameseTones(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D');
}
