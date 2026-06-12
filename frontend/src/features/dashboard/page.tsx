import {
  Alert,
  Group,
  NumberFormatter,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import type { DeliveryOrderStatus, LogisticsTask, PurchaseOrderStatus } from '@shared/api/logistics';

import { DashboardCharts } from './components/DashboardCharts';
import { RiskQueue } from './components/RiskQueue';
import { useDashboardData } from './hooks/useDashboardData';
import {
  getDashboardRiskRows,
  getMissingDocumentOrders,
} from './model/dashboardSelectors';

export function Dashboard() {
  const { t } = useI18n();
  const {
    dashboardStats,
    deliveryOrders,
    errorQuery,
    loading,
    purchaseOrders,
    queries,
    tasks,
  } = useDashboardData();

  if (errorQuery) {
    return (
      <PageError
        title={t('dashboard.errorTitle')}
        description={t('dashboard.errorDescription')}
        error={errorQuery.error}
        onRetry={() => {
          void Promise.all(queries.map((query) => query.refetch()));
        }}
      />
    );
  }

  if (loading) {
    return (
      <PageLoading
        title={t('dashboard.loadingTitle')}
        description={t('dashboard.loadingDescription')}
        metricCount={4}
        tableColumns={['DO', 'ETA', t('common.deadline'), t('common.delay'), t('common.blockers')]}
      />
    );
  }

  const poDelivered = purchaseOrders.filter((purchaseOrder) =>
    deliveredPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const poProcessing = purchaseOrders.filter((purchaseOrder) =>
    processingPurchaseOrderStatuses.includes(purchaseOrder.status),
  ).length;
  const shipmentMetrics = getShipmentMetrics(deliveryOrders);
  const urgentTasks = getUrgentTasks(tasks);
  const missingDocumentOrders = getMissingDocumentOrders(deliveryOrders);
  const riskRows = getDashboardRiskRows(deliveryOrders);

  return (
    <Stack gap="lg" className="dashboard-page">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>Tháp điều phối logistics Dashboard</Title>
          <Text c="dimmed" mt={6} maw={900}>
            Theo dõi Yêu cầu mua hàng, Lô hàng, chứng từ logistics, dòng Công việc và rủi ro trễ nhập kho.
          </Text>
        </div>
        <SegmentedControl
          defaultValue="6m"
          data={[
            { label: '7 ngày', value: '7d' },
            { label: '30 ngày', value: '30d' },
            { label: '6 tháng', value: '6m' },
          ]}
          radius="md"
          size="sm"
        />
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 3 }}>
        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-kpi-card">
          <SimpleGrid cols={3} spacing={0}>
            <KpiStat label="Tổng PO" value={purchaseOrders.length} color="orange" />
            <KpiStat label="PO Đã giao hàng" value={poDelivered} color="teal" />
            <KpiStat label="PO đang xử lý" value={poProcessing} color="orange" />
          </SimpleGrid>
        </Paper>

        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-kpi-card">
          <Group justify="space-between" align="center" wrap="nowrap" h="100%">
            <div>
              <Text size="sm" c="dimmed" fw={700}>
                Lô hàng
              </Text>
              <Title order={1} fw={800} c="blue" className="tabular-nums">
                <NumberFormatter value={deliveryOrders.length} thousandSeparator />
              </Title>
            </div>
            <Stack gap={8} miw={190}>
              <BadgeMetric color="blue" label="Đang vận chuyển" value={shipmentMetrics.inTransit} />
              <BadgeMetric color="orange" label="Chờ NCC giao hàng" value={shipmentMetrics.awaitingSupplier} />
              <BadgeMetric color="yellow" label="Đã về cảng" value={shipmentMetrics.arrivedPort} />
              <BadgeMetric color="teal" label="Đã giao hàng" value={shipmentMetrics.delivered} />
            </Stack>
          </Group>
        </Paper>

        <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-kpi-card dashboard-urgent-card">
          <Group justify="space-between" align="center" wrap="nowrap" h="100%">
            <div>
              <Text size="sm" c="dimmed" fw={700}>
                Công việc cần xử lý gấp
              </Text>
              <Text fw={800} size="lg" mt={8}>
                {urgentTasks.length > 0
                  ? `${urgentTasks.length} công việc cần xử lý ngay`
                  : 'Không có công việc khẩn cấp mới'}
              </Text>
            </div>
            <span className="dashboard-warning-icon">
              <IconAlertTriangle size={30} stroke={1.8} />
            </span>
          </Group>
        </Paper>
      </SimpleGrid>

      {missingDocumentOrders.length > 0 ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {t('dashboard.riskAlert', { missingDocumentCount: missingDocumentOrders.length })}
        </Alert>
      ) : null}

      {dashboardStats ? (
        <DashboardCharts
          stats={dashboardStats}
          purchaseOrders={purchaseOrders}
          deliveryOrders={deliveryOrders}
          tasks={tasks}
        />
      ) : null}

      <RiskQueue riskRows={riskRows} />
    </Stack>
  );
}

function KpiStat({ color, label, value }: { color: 'orange' | 'teal'; label: string; value: number }) {
  return (
    <Stack gap={4} className="dashboard-kpi-stat">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Title order={2} fw={800} c={color} className="tabular-nums">
        <NumberFormatter value={value} thousandSeparator />
      </Title>
    </Stack>
  );
}

function BadgeMetric({
  color,
  label,
  value,
}: {
  color: 'blue' | 'orange' | 'teal' | 'yellow';
  label: string;
  value: number;
}) {
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}:
      </Text>
      <span className={`dashboard-number-badge dashboard-number-badge-${color}`}>
        <NumberFormatter value={value} thousandSeparator />
      </span>
    </Group>
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

const shipmentStatusGroups: Record<'inTransit' | 'awaitingSupplier' | 'arrivedPort' | 'delivered', DeliveryOrderStatus[]> = {
  inTransit: ['ASSIGNED_TO_SHIPMENT', 'IN_TRANSIT'],
  awaitingSupplier: ['DRAFT', 'CREATED', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'READY_FOR_QUOTATION', 'QUOTATION_CONFIRMED'],
  arrivedPort: ['ARRIVED_PORT', 'CUSTOMS_PROCESSING', 'WAREHOUSE_PENDING'],
  delivered: ['DELIVERED', 'CLOSED'],
};

function getShipmentMetrics(deliveryOrders: Array<{ order_info: { status: DeliveryOrderStatus } }>) {
  return {
    inTransit: countByStatus(deliveryOrders, shipmentStatusGroups.inTransit),
    awaitingSupplier: countByStatus(deliveryOrders, shipmentStatusGroups.awaitingSupplier),
    arrivedPort: countByStatus(deliveryOrders, shipmentStatusGroups.arrivedPort),
    delivered: countByStatus(deliveryOrders, shipmentStatusGroups.delivered),
  };
}

function countByStatus(
  deliveryOrders: Array<{ order_info: { status: DeliveryOrderStatus } }>,
  statuses: DeliveryOrderStatus[],
) {
  return deliveryOrders.filter((deliveryOrder) => statuses.includes(deliveryOrder.order_info.status)).length;
}

function getUrgentTasks(tasks: LogisticsTask[]) {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter((task) => {
    const unresolved = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
    return unresolved && (task.priority === 'URGENT' || task.status === 'BLOCKED' || task.due_date < today);
  });
}
