import {
  Alert,
  Badge,
  Button,
  Group,
  NumberFormatter,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChecklist,
  IconFileInvoice,
  IconGitBranch,
  IconShoppingCart,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import {
  fetchDashboardStats,
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  type DashboardStats,
} from '../api/logistics';
import { PageError, PageLoading } from '../components/PageFeedback';
import { useI18n } from '../i18n';

export function Dashboard() {
  const { t } = useI18n();
  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase-requests'],
    queryFn: fetchPurchaseRequests,
  });
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });
  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchLogisticsTasks,
  });
  const dashboardStatsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const queries = [purchaseRequestsQuery, purchaseOrdersQuery, deliveryOrdersQuery, tasksQuery, dashboardStatsQuery] as const;
  const errorQuery = queries.find((query) => query.isError);
  const loading = queries.some((query) => query.isLoading);

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

  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const dashboardStats = dashboardStatsQuery.data;
  const prRiskCount = purchaseRequests.filter((request) => request.delay_days > 0).length;
  const activeDeliveryOrders = deliveryOrders.filter((deliveryOrder) => deliveryOrder.order_info.status !== 'DELIVERED');
  const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED');
  const missingDocumentOrders = deliveryOrders.filter(
    (deliveryOrder) => deliveryOrder.logistics_shipping.missing_documents.length > 0,
  );

  const riskRows = deliveryOrders
    .filter(
      (deliveryOrder) =>
        deliveryOrder.warehouse_tracking.delay_days > 0 ||
        deliveryOrder.task_summary.blocked_tasks > 0 ||
        deliveryOrder.logistics_shipping.missing_documents.length > 0,
    )
    .slice(0, 5);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('dashboard.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('dashboard.subtitle')}
          </Text>
        </div>
        <Button component={Link} to="/workflow" rightSection={<IconArrowRight size={16} />}>
          {t('dashboard.openWorkflow')}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard label={t('dashboard.purchaseRequests')} value={purchaseRequests.length} color="blue" icon={<IconFileInvoice size={22} />} />
        <MetricCard label={t('dashboard.purchaseOrders')} value={purchaseOrders.length} color="yellow" icon={<IconShoppingCart size={22} />} />
        <MetricCard label={t('dashboard.activeDo')} value={activeDeliveryOrders.length} color="teal" icon={<IconTruckDelivery size={22} />} />
        <MetricCard label={t('dashboard.blockedTasks')} value={blockedTasks.length} color="red" icon={<IconAlertTriangle size={22} />} />
      </SimpleGrid>

      {prRiskCount > 0 || missingDocumentOrders.length > 0 ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {t('dashboard.riskAlert', { prRiskCount, missingDocumentCount: missingDocumentOrders.length })}
        </Alert>
      ) : null}

      {dashboardStats ? <DashboardCharts stats={dashboardStats} /> : null}

      <SimpleGrid cols={{ base: 1, xl: 2 }}>
        <Paper withBorder p="lg">
          <Group justify="space-between" mb="md">
            <div>
              <Title order={3}>{t('dashboard.riskQueue')}</Title>
              <Text size="sm" c="dimmed">
                {t('dashboard.riskQueueDescription')}
              </Text>
            </div>
            <Badge variant="light">{t('common.records', { count: riskRows.length })}</Badge>
          </Group>

          <ScrollArea>
            <Table miw={720} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>DO</Table.Th>
                  <Table.Th>ETA</Table.Th>
                  <Table.Th>{t('common.deadline')}</Table.Th>
                  <Table.Th>{t('common.delay')}</Table.Th>
                  <Table.Th>{t('common.blockers')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {riskRows.map((deliveryOrder) => (
                  <Table.Tr key={deliveryOrder.id}>
                    <Table.Td>
                      <Text fw={700}>{deliveryOrder.order_info.order_number}</Text>
                      <Text size="xs" c="dimmed">
                        {deliveryOrder.sap_integration.po_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>{deliveryOrder.logistics_shipping.eta_planned ?? '-'}</Table.Td>
                    <Table.Td>{deliveryOrder.warehouse_tracking.warehouse_deadline}</Table.Td>
                    <Table.Td>
                      <Badge color={deliveryOrder.warehouse_tracking.delay_days > 0 ? 'red' : 'teal'} variant="light">
                        {deliveryOrder.warehouse_tracking.delay_days}d
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        {deliveryOrder.task_summary.blocked_tasks > 0 ? (
                          <Badge color="red">{t('dashboard.blockedTaskBadge', { count: deliveryOrder.task_summary.blocked_tasks })}</Badge>
                        ) : null}
                        {deliveryOrder.logistics_shipping.missing_documents.length > 0 ? (
                          <Badge color="orange">{t('dashboard.docBadge', { count: deliveryOrder.logistics_shipping.missing_documents.length })}</Badge>
                        ) : null}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        <Paper withBorder p="lg">
          <Title order={3}>{t('dashboard.modulesTitle')}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {t('dashboard.modulesDescription')}
          </Text>
          <Stack gap="md" mt="lg">
            <ModuleLink
              to="/workflow"
              icon={<IconGitBranch size={20} />}
              title={t('dashboard.moduleWorkflowTitle')}
              description={t('dashboard.moduleWorkflowDescription')}
            />
            <ModuleLink
              to="/purchase-requests"
              icon={<IconFileInvoice size={20} />}
              title={t('dashboard.modulePurchaseRequestsTitle')}
              description={t('dashboard.modulePurchaseRequestsDescription')}
            />
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

function DashboardCharts({ stats }: { stats: DashboardStats }) {
  const { flowTagLabel, statusLabel, t, taskRoleLabel } = useI18n();
  const maxDeliveryStatus = Math.max(...stats.deliveryOrderStatus.map((item) => item.count), 1);
  const maxBusinessFlow = Math.max(...(stats.businessFlowCounts ?? []).map((item) => item.count), 1);
  const maxRoleTasks = Math.max(...stats.taskRoleProgress.map((item) => item.total), 1);
  const maxMonthly = Math.max(
    ...stats.monthlyThroughput.flatMap((item) => [item.deliveryOrders, item.completedTasks]),
    1,
  );

  return (
    <SimpleGrid cols={{ base: 1, xl: 2 }}>
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.deliveryStatusChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.deliveryStatusDescription')}
        </Text>
        <Stack gap="sm">
          {stats.deliveryOrderStatus.map((item) => (
            <div key={item.status}>
              <Group justify="space-between" mb={6}>
                <Text size="sm">{statusLabel(item.status)}</Text>
                <Text size="sm" fw={700}>
                  {item.count}
                </Text>
              </Group>
              <Progress value={Math.round((item.count / maxDeliveryStatus) * 100)} color="blue" />
            </div>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.taskRoleChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.taskRoleDescription')}
        </Text>
        <Stack gap="sm">
          {stats.taskRoleProgress.map((item) => (
            <div key={item.role}>
              <Group justify="space-between" mb={6}>
                <Text size="sm">{taskRoleLabel(item.role)}</Text>
                <Text size="sm" fw={700}>
                  {item.completed}/{item.total}
                </Text>
              </Group>
              <Progress value={Math.round((item.total / maxRoleTasks) * 100)} color="gray" />
              <Progress value={item.completionRate} color={item.completionRate >= 80 ? 'teal' : 'orange'} mt={6} />
            </div>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.businessFlows')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.businessFlowsDescription')}
        </Text>
        <Stack gap="sm">
          {(stats.businessFlowCounts ?? []).map((item) => (
            <div key={item.tag}>
              <Group justify="space-between" mb={6}>
                <Button component={Link} to="/workflow" size="compact-sm" variant="subtle">
                  {flowTagLabel(item.tag)}
                </Button>
                <Text size="sm" fw={700}>
                  {item.count}
                </Text>
              </Group>
              <Progress value={Math.round((item.count / maxBusinessFlow) * 100)} color="grape" />
            </div>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.monthlyThroughputChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.monthlyThroughputDescription')}
        </Text>
        <Stack gap="sm">
          {stats.monthlyThroughput.map((item) => (
            <div key={item.month}>
              <Group justify="space-between" mb={6}>
                <Text size="sm">{item.month}</Text>
                <Text size="sm" fw={700}>
                  {t('dashboard.throughputLegend', { deliveryOrders: item.deliveryOrders, completedTasks: item.completedTasks })}
                </Text>
              </Group>
              <Stack gap={4}>
                <Progress value={Math.round((item.deliveryOrders / maxMonthly) * 100)} color="blue" />
                <Progress value={Math.round((item.completedTasks / maxMonthly) * 100)} color="teal" />
              </Stack>
            </div>
          ))}
        </Stack>
      </Paper>
    </SimpleGrid>
  );
}

function MetricCard({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Title order={2}>
            <NumberFormatter value={value} thousandSeparator />
          </Title>
        </div>
        <span className={`metric-icon metric-icon-${color}`}>{icon}</span>
      </Group>
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
  icon: React.ReactNode;
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
