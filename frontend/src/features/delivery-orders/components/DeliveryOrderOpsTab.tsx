import { Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import type { DeliveryOrder } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';
import { calcDelay, getDeliveryOrderRisks, getOperationalGates, getRiskColor } from '@entities/logistics';

import { gateDetail, gateLabel, riskDetail, riskLabel, slaLabel } from '../model/deliveryOrderLabels';
import { DeliveryOrderFact } from './DeliveryOrderFact';

export function DeliveryOrderOpsTab({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const { departmentLabel, t, taskRoleLabel } = useI18n();
  const gates = getOperationalGates(deliveryOrder);
  const risks = getDeliveryOrderRisks(deliveryOrder);
  const delay = calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });
  const passedGateCount = gates.filter((gate) => gate.passed).length;
  const blockedGateCount = gates.length - passedGateCount;
  const orderedRisks = [...risks].sort((left, right) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    return severityScore[right.severity] - severityScore[left.severity];
  });
  const primaryRisk = orderedRisks[0] ?? null;
  const delayDays = delay.isLate ? delay.days : 0;

  return (
    <Stack gap="md" className="delivery-order-ops-layout">
      <Paper
        withBorder
        p="sm"
        className={`delivery-order-ops-hero ${primaryRisk ? 'delivery-order-ops-hero-risk' : 'delivery-order-ops-hero-clear'}`}
      >
        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm">
          <Stack gap="xs" className="delivery-order-ops-hero-copy">
            <Group gap="xs" wrap="wrap">
              <Badge color={primaryRisk ? getRiskColor(primaryRisk.severity) : 'teal'} variant="light">
                {primaryRisk ? t('common.atRisk') : t('deliveryOrders.readyForClosure')}
              </Badge>
              <Badge variant="outline" color={primaryRisk ? getRiskColor(primaryRisk.severity) : 'gray'}>
                {passedGateCount}/{gates.length} {t('deliveryOrders.opsGateScore')}
              </Badge>
            </Group>
            <Title order={3}>
              {primaryRisk ? riskLabel(primaryRisk.code, t) : t('deliveryOrders.readyForClosure')}
            </Title>
            <Text size="sm" c="dimmed">
              {primaryRisk ? riskDetail(primaryRisk, t) : t('deliveryOrders.noOpsRisk')}
            </Text>
            <Text size="sm" c="dimmed">
              {primaryRisk
                ? `${departmentLabel(primaryRisk.ownerDept)} | ${t('deliveryOrders.sla', { sla: slaLabel(primaryRisk.slaCode, t) })}`
                : t('deliveryOrders.nextActionsDescription')}
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm" className="delivery-order-ops-kpi-grid">
            <div className="delivery-order-ops-kpi do-kpi-row">
              <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                {t('deliveryOrders.opsGateScore')}
              </Text>
              <Text fw={900} size="xl" className="tabular-nums">
                {passedGateCount}/{gates.length}
              </Text>
              <Text size="xs" c="dimmed">
                {t('deliveryOrders.opsGateScoreDescription')}
              </Text>
            </div>
            <div className={`delivery-order-ops-kpi do-kpi-row ${delay.isLate ? 'is-alert' : 'is-good'}`}>
              <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                {t('common.delay')}
              </Text>
              <Text fw={900} size="xl" c={delay.isLate ? 'red' : 'teal'} className="tabular-nums">
                {t('deliveryOrders.delayDays', { days: delayDays })}
              </Text>
              <Text size="xs" c="dimmed">
                {deliveryOrder.warehouse_tracking.warehouse_deadline}
              </Text>
            </div>
            <div className={`delivery-order-ops-kpi do-kpi-row ${blockedGateCount > 0 ? 'is-alert' : 'is-good'}`}>
              <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                {t('deliveryOrders.nextActions')}
              </Text>
              <Text fw={900} size="xl" className="tabular-nums">
                {blockedGateCount}
              </Text>
              <Text size="xs" c="dimmed">
                {blockedGateCount > 0 ? t('deliveryOrders.gateBlocked') : t('deliveryOrders.gatePassed')}
              </Text>
            </div>
          </SimpleGrid>
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm" className="delivery-order-ops-panels">
        <Paper withBorder p="sm" className="delivery-order-ops-gate-panel">
          <Stack gap={0}>
            {gates.map((gate) => (
              <div key={gate.id} className={`do-gate-row ${gate.passed ? 'is-passed' : 'is-blocked'}`}>
                <div className="delivery-order-ops-gate-copy">
                  <Text fw={800}>{gateLabel(gate.id, t)}</Text>
                  <Text size="sm" c="dimmed">
                    {gateDetail(gate, t) || '-'}
                  </Text>
                </div>
                <Text size="sm" c="dimmed">
                  {taskRoleLabel(gate.owner)}
                </Text>
                <Badge color={gate.passed ? 'teal' : 'orange'} variant="light">
                  {gate.passed ? t('deliveryOrders.gatePassed') : t('deliveryOrders.gateBlocked')}
                </Badge>
              </div>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="sm" className="delivery-order-ops-risk-panel">
          <Group justify="space-between" align="flex-start" gap="sm" mb="sm" className="delivery-order-ops-risk-header">
            <div className="delivery-order-ops-risk-copy">
              <Text fw={700}>{t('deliveryOrders.nextActions')}</Text>
              <Text size="sm" c="dimmed">
                {t('deliveryOrders.nextActionsDescription')}
              </Text>
            </div>
            <Badge color={orderedRisks.length > 0 ? 'red' : 'teal'} variant="light">
              {orderedRisks.length > 0 ? t('common.atRisk') : t('deliveryOrders.readyForClosure')}
            </Badge>
          </Group>
          <Stack gap="sm">
            {orderedRisks.length > 0 ? (
              orderedRisks.map((risk) => (
                <Group key={risk.code} justify="space-between" align="flex-start" gap="sm" className={`do-risk-row severity-${risk.severity}`}>
                  <Group gap="xs" className="delivery-order-ops-risk-row-copy">
                    <Badge color={getRiskColor(risk.severity)} variant="light">
                      {riskLabel(risk.code, t)}
                    </Badge>
                    <Text size="sm">{riskDetail(risk, t)}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {departmentLabel(risk.ownerDept)} · {t('deliveryOrders.sla', { sla: slaLabel(risk.slaCode, t) })}
                  </Text>
                </Group>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                {t('deliveryOrders.noOpsRisk')}
              </Text>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, md: 3, xl: 6 }} spacing={0} className="do-fact-strip delivery-order-ops-facts">
        <DeliveryOrderFact
          label={t('deliveryOrders.efmsBooking')}
          value={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number}
          copyValue={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number}
        />
        <DeliveryOrderFact label={t('deliveryOrders.mblVessel')} value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
        <DeliveryOrderFact
          label={t('deliveryOrders.polPod')}
          value={`${deliveryOrder.logistics_shipping.port_of_departure} ${t('deliveryOrders.routeConnector')} ${deliveryOrder.logistics_shipping.port_of_destination}`}
        />
        <DeliveryOrderFact label={t('deliveryOrders.ofAfDebitNote')} value={gates.find((gate) => gate.id === 'documents')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingDocuments')} />
        <DeliveryOrderFact label={t('deliveryOrders.finalDebitNote')} value={gates.find((gate) => gate.id === 'finance')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingOpsGates')} />
        <DeliveryOrderFact label={t('deliveryOrders.podArchive')} value={deliveryOrder.warehouse_tracking.actual_entry_date ? t('deliveryOrders.ready') : t('deliveryOrders.waitingWarehouse')} />
      </SimpleGrid>
    </Stack>
  );
}
