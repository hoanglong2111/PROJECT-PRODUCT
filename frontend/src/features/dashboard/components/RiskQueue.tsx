import { Badge, Button, Group, Paper, ScrollArea, Table, Text, Title } from '@mantine/core';
import { IconArrowRight, IconClockHour4 } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { getRiskColor, type OperationalRiskCode } from '@shared/utils/operations';

import type { DashboardRiskRow } from '../model/dashboardSelectors';

export function RiskQueue({ riskRows }: { riskRows: DashboardRiskRow[] }) {
  const { t } = useI18n();

  return (
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
                    {deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number}
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
  );
}

function riskLabel(code: OperationalRiskCode, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<OperationalRiskCode, string> = {
    BLOCKED_TASKS: t('opsRisk.blockedTasks'),
    FINANCE_NOT_READY: t('opsRisk.financeNotReady'),
    MISSING_DOCUMENTS: t('opsRisk.missingDocuments'),
    REQUIRED_TASKS: t('opsRisk.requiredTasks'),
    WAREHOUSE_DELAY: t('opsRisk.warehouseDelay'),
    QUOTATION_SLA: t('opsRisk.quotationSla'),
    DRAFT_BL_SLA: t('opsRisk.draftBlSla'),
  };

  return labels[code];
}
