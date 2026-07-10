import { Badge, Group, Paper, Progress, SimpleGrid, Stack, Text } from '@mantine/core';

import type { DeliveryOrder } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

import { DeliveryOrderFact } from './DeliveryOrderFact';

export function DeliveryOrderTasksTab({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const { t } = useI18n();
  const missingDocumentsCount = deliveryOrder.logistics_shipping.missing_documents.length;
  const taskProgress =
    deliveryOrder.task_summary.total_tasks > 0
      ? Math.round((deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100)
      : 0;

  return (
    <Stack gap="md">
      <Paper withBorder p="md" className="delivery-order-task-health">
        <Group justify="space-between" gap="sm" align="flex-start">
          <div>
            <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
              {t('deliveryOrders.overviewOpsHealth')}
            </Text>
            <Text size="sm" c="dimmed" className="tabular-nums">
              {deliveryOrder.task_summary.completed_tasks}/{deliveryOrder.task_summary.total_tasks} {t('shell.tasks')}
            </Text>
          </div>
          <Group gap={6}>
            {missingDocumentsCount > 0 ? (
              <Badge size="xs" color="red" variant="light">
                {t('deliveryOrders.missingDocuments', { count: missingDocumentsCount })}
              </Badge>
            ) : (
              <Badge size="xs" color="teal" variant="light">
                {t('deliveryOrders.complete')}
              </Badge>
            )}
            {deliveryOrder.task_summary.blocked_tasks > 0 ? (
              <Badge size="xs" color="orange" variant="light">
                {t('deliveryOrders.blockedSuffix', { count: deliveryOrder.task_summary.blocked_tasks })}
              </Badge>
            ) : null}
          </Group>
        </Group>
      </Paper>
      <Group justify="space-between">
        <div>
          <Text fw={700}>{t('deliveryOrders.closureGate')}</Text>
          <Text size="sm" c="dimmed">
            {t('deliveryOrders.closureGateDescription')}
          </Text>
        </div>
        <Badge color={taskProgress === 100 ? 'teal' : 'orange'}>{t('deliveryOrders.tasksDone', { percent: taskProgress })}</Badge>
      </Group>
      <Progress value={taskProgress} color={taskProgress === 100 ? 'teal' : 'orange'} />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={0} className="do-fact-strip delivery-order-task-facts">
        <DeliveryOrderFact label={t('tasks.totalTasks')} value={String(deliveryOrder.task_summary.total_tasks)} />
        <DeliveryOrderFact label={t('tasks.blocked')} value={String(deliveryOrder.task_summary.blocked_tasks)} />
        <DeliveryOrderFact label={t('deliveryOrders.requiredRemaining')} value={String(deliveryOrder.task_summary.required_tasks_remaining)} />
      </SimpleGrid>
    </Stack>
  );
}
