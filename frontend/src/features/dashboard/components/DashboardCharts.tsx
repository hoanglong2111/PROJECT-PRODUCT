import { Group, NumberFormatter, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowRight,
  IconChecklist,
  IconShoppingCart,
  IconTruckDelivery,
} from '@tabler/icons-react';
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
  const { flowTagLabel, t, taskRoleLabel } = useI18n();
  const maxRoleTasks = Math.max(...stats.taskRoleProgress.map((item) => item.total), 1);
  const maxMonthly = Math.max(
    ...stats.monthlyThroughput.flatMap((item) => [item.deliveryOrders, item.completedTasks]),
    1,
  );
  const maxBusinessFlow = Math.max(...(stats.businessFlowCounts ?? []).map((item) => item.count), 1);
  const poDelivered = purchaseOrders.filter((purchaseOrder) =>
    deliveredPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const poProcessing = purchaseOrders.filter((purchaseOrder) =>
    processingPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const poBars = [
    { color: 'orange' as const, label: 'Tổng PO', value: purchaseOrders.length },
    { color: 'teal' as const, label: 'PO Đã giao hàng', value: poDelivered },
    { color: 'blue' as const, label: 'PO đang xử lý', value: poProcessing },
  ];

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, xl: 2 }}>
        <Paper withBorder p="lg" className="metric-card dashboard-card">
          <Title order={3}>PO Chart</Title>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            So sánh tổng PO, PO đã giao hàng và PO đang xử lý trong kỳ 6 tháng.
          </Text>
          <PoBarChart data={poBars} />
        </Paper>

        <MetricListCard
          title="Biểu đồ trạng thái Delivery"
          subtitle="DO Trễ hạn"
          metrics={getDeliveryDelayMetrics(deliveryOrders)}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }}>
        <MetricListCard title="Công việc trễ hạn" metrics={getOverdueTaskMetrics(tasks, deliveryOrders)} />
        <MetricListCard title="Số lượng DO trễ theo thời gian" metrics={getDelayAgeMetrics(deliveryOrders)} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }}>
        <Paper withBorder p="lg" className="metric-card dashboard-card">
          <Title order={3}>{t('dashboard.taskRoleChart')}</Title>
          <Text size="sm" c="dimmed" mb="md">
            {t('dashboard.taskRoleDescription')}
          </Text>
          <Stack gap="sm">
            {stats.taskRoleProgress.map((item) => (
              <Link key={item.role} to={`/tasks?role=${item.role}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                <div style={{ padding: '2px 0' }}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" className="hover-underline">
                      {taskRoleLabel(item.role)}
                    </Text>
                    <Text size="sm" fw={700}>
                      {item.completed}/{item.total}
                    </Text>
                  </Group>
                  <Progress value={Math.round((item.total / maxRoleTasks) * 100)} color="gray" style={{ cursor: 'pointer' }} />
                  <Progress value={item.completionRate} color={item.completionRate >= 80 ? 'teal' : 'orange'} mt={6} style={{ cursor: 'pointer' }} />
                </div>
              </Link>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="lg" className="metric-card dashboard-card">
          <Title order={3}>{t('dashboard.businessFlows')}</Title>
          <Text size="sm" c="dimmed" mb="md">
            {t('dashboard.businessFlowsDescription')}
          </Text>
          <Stack gap="sm">
            {(stats.businessFlowCounts ?? []).map((item) => (
              <Link key={item.tag} to="/delivery-orders" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                <div style={{ padding: '2px 0' }}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" className="hover-underline" style={{ color: 'var(--mantine-color-grape-filled)', fontWeight: 600 }}>
                      {flowTagLabel(item.tag)}
                    </Text>
                    <Text size="sm" fw={700}>
                      {item.count}
                    </Text>
                  </Group>
                  <Progress value={Math.round((item.count / maxBusinessFlow) * 100)} color="grape" style={{ cursor: 'pointer' }} />
                </div>
              </Link>
            ))}
          </Stack>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }}>
        <Paper withBorder p="lg" className="metric-card dashboard-card">
          <Title order={3}>{t('dashboard.monthlyThroughputChart')}</Title>
          <Text size="sm" c="dimmed" mb="md">
            {t('dashboard.monthlyThroughputDescription')}
          </Text>
          <Stack gap="sm">
            {stats.monthlyThroughput.map((item) => (
              <div key={item.month}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" fw={600}>
                    {item.month}
                  </Text>
                  <Text size="sm" fw={700}>
                    {t('dashboard.throughputLegend', { deliveryOrders: item.deliveryOrders, completedTasks: item.completedTasks })}
                  </Text>
                </Group>
                <Stack gap={4}>
                  <Link to="/delivery-orders" style={{ display: 'block' }} title={t('dashboard.viewDeliveryOrders')}>
                    <Progress value={Math.round((item.deliveryOrders / maxMonthly) * 100)} color="blue" style={{ cursor: 'pointer' }} />
                  </Link>
                  <Link to="/tasks" style={{ display: 'block' }} title={t('dashboard.viewTasks')}>
                    <Progress value={Math.round((item.completedTasks / maxMonthly) * 100)} color="teal" style={{ cursor: 'pointer' }} />
                  </Link>
                </Stack>
              </div>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="lg" className="metric-card dashboard-card">
          <Title order={3}>{t('dashboard.modulesTitle')}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {t('dashboard.modulesDescription')}
          </Text>
          <Stack gap="md" mt="lg">
            <ModuleLink to="/purchase-orders" icon={<IconShoppingCart size={20} />} title={t('dashboard.modulePurchaseOrdersTitle')} description={t('dashboard.modulePurchaseOrdersDescription')} />
            <ModuleLink to="/delivery-orders" icon={<IconTruckDelivery size={20} />} title={t('dashboard.moduleDeliveryOrdersTitle')} description={t('dashboard.moduleDeliveryOrdersDescription')} />
            <ModuleLink to="/tasks" icon={<IconChecklist size={20} />} title={t('dashboard.moduleTasksTitle')} description={t('dashboard.moduleTasksDescription')} />
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

function PoBarChart({ data }: { data: Array<{ color: MetricColor; label: string; value: number }> }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Stack gap="md">
      <div className="dashboard-bar-chart" aria-label="PO Chart">
        {data.map((item) => {
          const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 4);
          return (
            <div key={item.label} className="dashboard-bar-column">
              <Text size="sm" fw={800} className="tabular-nums">
                <NumberFormatter value={item.value} thousandSeparator />
              </Text>
              <div
                className={`dashboard-bar dashboard-bar-${item.color}`}
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <Text size="xs" c="dimmed" ta="center" fw={700}>
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
            <Text size="xs" fw={700}>
              {item.label}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

function MetricListCard({
  metrics,
  subtitle,
  title,
}: {
  metrics: ListMetric[];
  subtitle?: string;
  title: string;
}) {
  return (
    <Paper withBorder p="lg" className="metric-card dashboard-card">
      <Title order={3}>{title}</Title>
      {subtitle ? (
        <Text size="sm" c="dimmed" mt={4}>
          {subtitle}
        </Text>
      ) : null}
      <Stack gap="sm" mt="lg">
        {metrics.map((metric) => (
          <Group key={metric.label} justify="space-between" gap="md" wrap="nowrap" className="dashboard-list-row">
            <Group gap="sm" wrap="nowrap" miw={0}>
              <span className={`dashboard-number-badge dashboard-number-badge-${metric.color}`}>
                <NumberFormatter value={metric.value} thousandSeparator />
              </span>
              <Text size="sm" fw={700}>
                {metric.label}:
              </Text>
            </Group>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

function ModuleLink({
  description,
  icon,
  title,
  to,
}: {
  description: string;
  icon: ReactNode;
  title: string;
  to: string;
}) {
  return (
    <Paper component={Link} to={to} withBorder p="md" className="module-link">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <span className="module-link-icon">{icon}</span>
          <div>
            <Text fw={700}>{title}</Text>
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

function getDeliveryDelayMetrics(deliveryOrders: DeliveryOrder[]): ListMetric[] {
  return [
    {
      color: 'orange',
      label: 'DO trễ hạn giao hàng từ nhà CC',
      value: countDelayedOrders(deliveryOrders, supplierPendingStatuses),
    },
    {
      color: 'blue',
      label: 'DO trễ hạn vận chuyển',
      value: countDelayedOrders(deliveryOrders, transportStatuses, 'eta'),
    },
    {
      color: 'yellow',
      label: 'DO trễ hạn thông quan',
      value: countDelayedOrders(deliveryOrders, portStatuses),
    },
    {
      color: 'red',
      label: 'DO Trễ hạn giao hàng',
      value: countDelayedOrders(deliveryOrders, finalDeliveryStatuses),
    },
  ];
}

function getOverdueTaskMetrics(tasks: LogisticsTask[], deliveryOrders: DeliveryOrder[]): ListMetric[] {
  return [
    {
      color: 'orange',
      label: 'Báo giá',
      value: countOverdueTasks(tasks, ['bao gia', 'báo giá', 'quotation']) + countOrdersByStatus(deliveryOrders, ['READY_FOR_QUOTATION']),
    },
    {
      color: 'blue',
      label: 'Booking',
      value: countOverdueTasks(tasks, ['booking']) + countOrdersByStatus(deliveryOrders, ['QUOTATION_CONFIRMED']),
    },
    {
      color: 'yellow',
      label: 'Xử lý chứng từ',
      value: countOverdueTasks(tasks, ['chung tu', 'chứng từ', 'document']) + countMissingDocumentOrders(deliveryOrders),
    },
    {
      color: 'teal',
      label: 'Mở tờ khai',
      value: countOverdueTasks(tasks, ['to khai', 'tờ khai', 'customs']) + countOrdersByStatus(deliveryOrders, ['CUSTOMS_PROCESSING']),
    },
    {
      color: 'red',
      label: 'Giao hàng',
      value: countOverdueTasks(tasks, ['giao hang', 'giao hàng', 'delivery']) + countDelayedOrders(deliveryOrders, finalDeliveryStatuses),
    },
  ];
}

function getDelayAgeMetrics(deliveryOrders: DeliveryOrder[]): ListMetric[] {
  const delayDays = deliveryOrders.map(getDelayDays).filter((days) => days > 0);

  return [
    {
      color: 'yellow',
      label: 'Trễ dưới 3 ngày',
      value: delayDays.filter((days) => days < 3).length,
    },
    {
      color: 'orange',
      label: 'Trễ từ 3-7 ngày',
      value: delayDays.filter((days) => days >= 3 && days <= 7).length,
    },
    {
      color: 'red',
      label: 'Trễ hơn 7 ngày',
      value: delayDays.filter((days) => days > 7).length,
    },
  ];
}

function countDelayedOrders(
  deliveryOrders: DeliveryOrder[],
  statuses: DeliveryOrderStatus[],
  dateKind: 'warehouse' | 'eta' = 'warehouse',
) {
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

  const deadline =
    deliveryOrder.warehouse_tracking.planned_entry_date || deliveryOrder.warehouse_tracking.warehouse_deadline;
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
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
