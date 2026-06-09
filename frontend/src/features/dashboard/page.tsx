import { Alert, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconShip, IconShoppingCart } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import { DashboardCharts } from './components/DashboardCharts';
import { MetricCard } from './components/MetricCard';
import { RiskQueue } from './components/RiskQueue';
import { useDashboardData } from './hooks/useDashboardData';
import {
  getActiveDeliveryOrders,
  getBlockedTasks,
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

  const activeDeliveryOrders = getActiveDeliveryOrders(deliveryOrders);
  const blockedTasks = getBlockedTasks(tasks);
  const missingDocumentOrders = getMissingDocumentOrders(deliveryOrders);
  const riskRows = getDashboardRiskRows(deliveryOrders);

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

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <MetricCard label={t('dashboard.purchaseOrders')} value={purchaseOrders.length} color="yellow" icon={<IconShoppingCart size={22} />} />
        <MetricCard label={t('shell.shipments')} value={activeDeliveryOrders.length} color="teal" icon={<IconShip size={22} />} />
        <MetricCard label={t('dashboard.blockedTasks')} value={blockedTasks.length} color="red" icon={<IconAlertTriangle size={22} />} />
      </SimpleGrid>

      {missingDocumentOrders.length > 0 ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {t('dashboard.riskAlert', { missingDocumentCount: missingDocumentOrders.length })}
        </Alert>
      ) : null}

      {dashboardStats ? <DashboardCharts stats={dashboardStats} purchaseOrders={purchaseOrders} /> : null}

      <RiskQueue riskRows={riskRows} />
    </Stack>
  );
}
