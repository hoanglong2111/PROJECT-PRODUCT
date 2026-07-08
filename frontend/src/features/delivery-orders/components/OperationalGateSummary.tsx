import { Paper, SimpleGrid, Text, Title } from '@mantine/core';

import type { DeliveryOrder } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';
import { calcDelay } from '@entities/logistics';
import type { getDeliveryOrderRisks, getOperationalGates } from '@entities/logistics';

import { riskLabel, slaLabel } from '../model/deliveryOrderLabels';

export function OperationalGateSummary({
  deliveryOrder,
  gates,
  risks,
}: {
  deliveryOrder: DeliveryOrder;
  gates: ReturnType<typeof getOperationalGates>;
  risks: ReturnType<typeof getDeliveryOrderRisks>;
}) {
  const { departmentLabel, t } = useI18n();
  const passedCount = gates.filter((gate) => gate.passed).length;
  const delay = calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });

  return (
    <Paper withBorder p="md" className={risks.length > 0 ? 'ops-panel ops-panel-risk' : 'ops-panel'}>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('deliveryOrders.opsGateScore')}
          </Text>
          <Title order={3}>
            {passedCount}/{gates.length}
          </Title>
          <Text size="sm" c="dimmed">
            {t('deliveryOrders.opsGateScoreDescription')}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('common.delay')}
          </Text>
          <Title order={3} c={delay.isLate ? 'red' : 'teal'}>
            {t('deliveryOrders.delayDays', { days: delay.days })}
          </Title>
          <Text size="sm" c="dimmed">
            {deliveryOrder.warehouse_tracking.warehouse_deadline}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t('deliveryOrders.nextAction')}
          </Text>
          <Title order={4}>{risks[0] ? riskLabel(risks[0].code, t) : t('deliveryOrders.readyForClosure')}</Title>
          <Text size="sm" c="dimmed">
            {risks[0]
              ? `${departmentLabel(risks[0].ownerDept)} | ${t('deliveryOrders.sla', { sla: slaLabel(risks[0].slaCode, t) })}`
              : t('deliveryOrders.noOpsRisk')}
          </Text>
        </div>
      </SimpleGrid>
    </Paper>
  );
}
