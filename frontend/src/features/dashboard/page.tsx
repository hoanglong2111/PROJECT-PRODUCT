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
  IconClockHour4,
  IconFileInvoice,
  IconGitBranch,
  IconShoppingCart,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import {
  fetchDashboardStats,
  fetchDeliveryOrders,
  fetchLogisticsTasks,
  fetchPurchaseOrders,
  fetchPurchaseRequests,
  type DashboardStats,
  type PurchaseRequest,
  type PurchaseOrder,
} from '@shared/api/logistics';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import {
  getDeliveryOrderRisks,
  getPrimaryOperationalRisk,
  getRiskColor,
  type OperationalRisk,
  type OperationalRiskCode,
} from '@shared/utils/operations';

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
    .map((deliveryOrder) => ({
      deliveryOrder,
      primaryRisk: getPrimaryOperationalRisk(deliveryOrder),
      risks: getDeliveryOrderRisks(deliveryOrder),
    }))
    .filter((row): row is { deliveryOrder: typeof row.deliveryOrder; primaryRisk: OperationalRisk; risks: OperationalRisk[] } =>
      Boolean(row.primaryRisk),
    )
    .sort((a, b) => b.risks.length - a.risks.length)
    .slice(0, 6);

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

      {dashboardStats ? (
        <DashboardCharts
          stats={dashboardStats}
          purchaseRequests={purchaseRequests}
          purchaseOrders={purchaseOrders}
        />
      ) : null}

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
                <Table.Th>{t('dashboard.nextAction')}</Table.Th>
                <Table.Th>{t('common.owner')}</Table.Th>
                <Table.Th>SLA</Table.Th>
                <Table.Th>{t('common.blockers')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {riskRows.map(({ deliveryOrder, primaryRisk, risks }) => (
                <Table.Tr key={deliveryOrder.id}>
                  <Table.Td>
                    <Text fw={700}>{deliveryOrder.order_info.order_number}</Text>
                    <Text size="xs" c="dimmed">
                      {deliveryOrder.sap_integration.po_number}
                    </Text>
                    <Button
                      component={Link}
                      to={`/delivery-orders?do=${deliveryOrder.order_info.order_number}`}
                      size="compact-xs"
                      variant="subtle"
                      rightSection={<IconArrowRight size={12} />}
                    >
                      {t('dashboard.openDo')}
                    </Button>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getRiskColor(primaryRisk.severity)} variant="light">
                      {riskLabel(primaryRisk.code, t)}
                    </Badge>
                    <Text size="xs" c="dimmed" mt={4}>
                      {primaryRisk.detail}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {primaryRisk.owner}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge leftSection={<IconClockHour4 size={12} />} color="blue" variant="light">
                      {primaryRisk.sla}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      {risks.map((risk) => (
                        <Badge key={risk.code} color={getRiskColor(risk.severity)} variant="light" size="xs">
                          {riskLabel(risk.code, t)}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}

function riskLabel(code: OperationalRiskCode, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<OperationalRiskCode, string> = {
    BLOCKED_TASKS: t('opsRisk.blockedTasks'),
    FINANCE_NOT_READY: t('opsRisk.financeNotReady'),
    MISSING_DOCUMENTS: t('opsRisk.missingDocuments'),
    REQUIRED_TASKS: t('opsRisk.requiredTasks'),
    SAP_SYNC: t('opsRisk.sapSync'),
    WAREHOUSE_DELAY: t('opsRisk.warehouseDelay'),
  };

  return labels[code];
}

function DashboardCharts({
  stats,
  purchaseRequests,
  purchaseOrders,
}: {
  stats: DashboardStats;
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
}) {
  const navigate = useNavigate();
  const { flowTagLabel, statusLabel, t, taskRoleLabel } = useI18n();

  const maxDeliveryStatus = Math.max(...stats.deliveryOrderStatus.map((item) => item.count), 1);
  const maxBusinessFlow = Math.max(...(stats.businessFlowCounts ?? []).map((item) => item.count), 1);
  const maxRoleTasks = Math.max(...stats.taskRoleProgress.map((item) => item.total), 1);
  const maxMonthly = Math.max(
    ...stats.monthlyThroughput.flatMap((item) => [item.deliveryOrders, item.completedTasks]),
    1,
  );

  // Group PR and PO counts by the last 6 months dynamically for the Line Chart
  const monthlyPrPoData = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(dayjs().subtract(i, 'month').format('YYYY-MM'));
    }

    return months.map((m) => {
      const prCount = purchaseRequests.filter((pr) => {
        const dateStr = pr.requested_order_date || pr.expected_arrival_date;
        return dateStr && dateStr.startsWith(m);
      }).length;

      const poCount = purchaseOrders.filter((po) => {
        const dateStr = po.order_date;
        return dateStr && dateStr.startsWith(m);
      }).length;

      const label = dayjs(m, 'YYYY-MM').format('MM/YY');

      return {
        month: m,
        label,
        pr: prCount,
        po: poCount,
      };
    });
  }, [purchaseRequests, purchaseOrders]);

  // SVG Line Chart Dimensions and Math
  const maxVal = Math.max(...monthlyPrPoData.flatMap((d) => [d.pr, d.po]), 4);
  const width = 500;
  const height = 240;
  const paddingX = 45;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const prPoints = monthlyPrPoData.map((d, index) => {
    const x = paddingX + (index / (monthlyPrPoData.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.pr / maxVal) * chartHeight;
    return { x, y };
  });

  const poPoints = monthlyPrPoData.map((d, index) => {
    const x = paddingX + (index / (monthlyPrPoData.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.po / maxVal) * chartHeight;
    return { x, y };
  });

  const prPath = prPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const poPath = poPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const prAreaPath = prPoints.length > 0
    ? `${prPath} L ${prPoints[prPoints.length - 1].x} ${height - paddingY} L ${prPoints[0].x} ${height - paddingY} Z`
    : '';
  const poAreaPath = poPoints.length > 0
    ? `${poPath} L ${poPoints[poPoints.length - 1].x} ${height - paddingY} L ${poPoints[0].x} ${height - paddingY} Z`
    : '';

  return (
    <SimpleGrid cols={{ base: 1, xl: 2 }}>
      {/* 1. Line Chart: PR & PO Relation */}
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.prPoRelationTitle')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.prPoRelationDescription')}
        </Text>
        <div style={{ position: 'relative', width: '100%', height: height }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mantine-color-blue-filled)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--mantine-color-blue-filled)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mantine-color-orange-filled)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--mantine-color-orange-filled)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + chartHeight * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={ratio} opacity={0.15}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeDasharray="3,3" />
                  <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X axis labels */}
            {monthlyPrPoData.map((d, index) => {
              const x = paddingX + (index / (monthlyPrPoData.length - 1)) * chartWidth;
              return (
                <text key={index} x={x} y={height - paddingY + 20} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                  {d.label}
                </text>
              );
            })}

            {/* PR Line & Area */}
            <g style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-requests')}>
              <path d={prAreaPath} fill="url(#prGrad)" />
              <path d={prPath} fill="none" stroke="var(--mantine-color-blue-filled)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* PO Line & Area */}
            <g style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
              <path d={poAreaPath} fill="url(#poGrad)" />
              <path d={poPath} fill="none" stroke="var(--mantine-color-orange-filled)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Interactive Dots */}
            {monthlyPrPoData.map((d, index) => {
              const prP = prPoints[index];
              const poP = poPoints[index];
              return (
                <g key={index}>
                  {/* PR dot */}
                  <circle
                    cx={prP.x}
                    cy={prP.y}
                    r={5}
                    fill="var(--mantine-color-blue-filled)"
                    stroke="var(--mantine-color-body)"
                    strokeWidth={2}
                    style={{ cursor: 'pointer', transition: 'r 100ms ease' }}
                    onClick={() => navigate(`/purchase-requests?month=${d.month}`)}
                  >
                    <title>{t('dashboard.chartPrTooltip', { month: d.label, count: d.pr })}</title>
                  </circle>
                  {/* PO dot */}
                  <circle
                    cx={poP.x}
                    cy={poP.y}
                    r={5}
                    fill="var(--mantine-color-orange-filled)"
                    stroke="var(--mantine-color-body)"
                    strokeWidth={2}
                    style={{ cursor: 'pointer', transition: 'r 100ms ease' }}
                    onClick={() => navigate(`/purchase-orders?month=${d.month}`)}
                  >
                    <title>{t('dashboard.chartPoTooltip', { month: d.label, count: d.po })}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <Group justify="center" mt="md" gap="lg">
          <Group gap={6} style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-requests')}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--mantine-color-blue-filled)' }} />
            <Text size="xs" fw={700}>{t('dashboard.modulePurchaseRequestsTitle')}</Text>
          </Group>
          <Group gap={6} style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--mantine-color-orange-filled)' }} />
            <Text size="xs" fw={700}>{t('dashboard.modulePurchaseOrdersTitle')}</Text>
          </Group>
        </Group>
      </Paper>

      {/* 2. Delivery Status Chart */}
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.deliveryStatusChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.deliveryStatusDescription')}
        </Text>
        <Stack gap="sm">
          {stats.deliveryOrderStatus.map((item) => (
            <Link
              key={item.status}
              to={`/delivery-orders?status=${item.status}`}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ padding: '2px 0' }}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" className="hover-underline">{statusLabel(item.status)}</Text>
                  <Text size="sm" fw={700}>
                    {item.count}
                  </Text>
                </Group>
                <Progress value={Math.round((item.count / maxDeliveryStatus) * 100)} color="blue" style={{ cursor: 'pointer' }} />
              </div>
            </Link>
          ))}
        </Stack>
      </Paper>

      {/* 3. Task Role Chart */}
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.taskRoleChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.taskRoleDescription')}
        </Text>
        <Stack gap="sm">
          {stats.taskRoleProgress.map((item) => (
            <Link
              key={item.role}
              to={`/tasks?role=${item.role}`}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ padding: '2px 0' }}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" className="hover-underline">{taskRoleLabel(item.role)}</Text>
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

      {/* 4. Business Flows Chart */}
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.businessFlows')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.businessFlowsDescription')}
        </Text>
        <Stack gap="sm">
          {(stats.businessFlowCounts ?? []).map((item) => (
            <Link
              key={item.tag}
              to={`/workflow?tag=${item.tag}`}
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
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

      {/* 5. Monthly Throughput Chart */}
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.monthlyThroughputChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.monthlyThroughputDescription')}
        </Text>
        <Stack gap="sm">
          {stats.monthlyThroughput.map((item) => (
            <div key={item.month}>
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={600}>{item.month}</Text>
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

      {/* 6. Operational Modules (Moved here for perfect layout alignment!) */}
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
        <div style={{ position: 'relative', zIndex: 3 }}>
          <Text className="metric-label" size="xs" fw={600} lts="0.03em" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} className="tabular-nums" style={{ lineHeight: 1.1 }}>
            <NumberFormatter value={value} thousandSeparator />
          </Title>
        </div>
        <span className={`metric-icon metric-icon-${color}`} style={{ position: 'relative', zIndex: 3 }}>{icon}</span>
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
