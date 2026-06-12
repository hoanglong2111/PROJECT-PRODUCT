import { Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowRight,
  IconChecklist,
  IconShoppingCart,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { type ReactNode, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { DashboardStats, PurchaseOrder } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

import { getMonthlyPurchaseOrderData } from '../model/dashboardSelectors';

export function DashboardCharts({
  stats,
  purchaseOrders,
}: {
  stats: DashboardStats;
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

  const monthlyPoData = useMemo(() => getMonthlyPurchaseOrderData(purchaseOrders), [purchaseOrders]);

  const maxVal = Math.max(...monthlyPoData.map((d) => d.po), 4);
  const width = 500;
  const height = 240;
  const paddingX = 45;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const poPoints = monthlyPoData.map((d, index) => {
    const x = paddingX + (index / (monthlyPoData.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.po / maxVal) * chartHeight;
    return { x, y };
  });

  const poPath = poPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const poAreaPath =
    poPoints.length > 0
      ? `${poPath} L ${poPoints[poPoints.length - 1].x} ${height - paddingY} L ${poPoints[0].x} ${height - paddingY} Z`
      : '';

  return (
    <SimpleGrid cols={{ base: 1, xl: 2 }}>
      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.prPoRelationTitle')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.prPoRelationDescription')}
        </Text>
        <div style={{ position: 'relative', width: '100%', height: height }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--mantine-color-orange-filled)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--mantine-color-orange-filled)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

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

            {monthlyPoData.map((d, index) => {
              const x = paddingX + (index / (monthlyPoData.length - 1)) * chartWidth;
              return (
                <text key={index} x={x} y={height - paddingY + 20} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                  {d.label}
                </text>
              );
            })}

            <g style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
              <path d={poAreaPath} fill="url(#poGrad)" />
              <path d={poPath} fill="none" stroke="var(--mantine-color-orange-filled)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {monthlyPoData.map((d, index) => {
              const poP = poPoints[index];
              return (
                <g key={index}>
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

        <Group justify="center" mt="md" gap="lg">
          <Group gap={6} style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'var(--mantine-color-orange-filled)' }} />
            <Text size="xs" fw={700}>
              {t('dashboard.modulePurchaseOrdersTitle')}
            </Text>
          </Group>
        </Group>
      </Paper>

      <Paper withBorder p="lg">
        <Title order={3}>{t('dashboard.deliveryStatusChart')}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t('dashboard.deliveryStatusDescription')}
        </Text>
        <Stack gap="sm">
          {stats.deliveryOrderStatus.map((item) => (
            <Link key={item.status} to={`/delivery-orders?status=${item.status}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
              <div style={{ padding: '2px 0' }}>
                <Group justify="space-between" mb={6}>
                  <Text size="sm" className="hover-underline">
                    {statusLabel(item.status)}
                  </Text>
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

      <Paper withBorder p="lg">
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

      <Paper withBorder p="lg">
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

      <Paper withBorder p="lg">
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

      <Paper withBorder p="lg">
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
