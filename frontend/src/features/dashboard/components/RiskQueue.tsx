import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconClockHour4, IconShieldCheck } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { getRiskColor, type OperationalRiskCode } from '@shared/utils/operations';

import type { DashboardRiskRow } from '../model/dashboardSelectors';

export function RiskQueue({ riskRows }: { riskRows: DashboardRiskRow[] }) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg" className="metric-card dashboard-card dashboard-risk-card">
      <Group justify="space-between" mb="md" align="flex-start">
        <div>
          <Title order={3}>{t('dashboard.riskQueue')}</Title>
          <Text size="sm" c="dimmed">
            {t('dashboard.riskQueueDescription')}
          </Text>
        </div>
        <Badge variant="light">{t('common.records', { count: riskRows.length })}</Badge>
      </Group>

      {riskRows.length > 0 ? (
        <Stack gap="xs">
          {riskRows.map(({ deliveryOrder, primaryRisk, risks }) => (
            <div key={deliveryOrder.id} className="dashboard-risk-row">
              <Group justify="space-between" gap="md" align="flex-start" wrap="nowrap">
                <div className="dashboard-risk-identity">
                  <Text fw={900}>{deliveryOrder.order_info.order_number}</Text>
                  <Text size="xs" c="dimmed">
                    {deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number}
                  </Text>
                  <Button
                    component={Link}
                    to={`/delivery-orders?do=${deliveryOrder.order_info.order_number}`}
                    size="compact-xs"
                    variant="subtle"
                    rightSection={<IconArrowRight size={12} />}
                    mt={4}
                  >
                    {t('dashboard.openDo')}
                  </Button>
                </div>

                <div className="dashboard-risk-action">
                  <Badge color={getRiskColor(primaryRisk.severity)} variant="light">
                    {riskLabel(primaryRisk.code, t)}
                  </Badge>
                  <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                    {primaryRisk.detail}
                  </Text>
                </div>

                <div className="dashboard-risk-owner">
                  <Text size="xs" c="dimmed" fw={800}>
                    {t('common.owner')}
                  </Text>
                  <Text size="sm" fw={800}>
                    {primaryRisk.owner}
                  </Text>
                </div>

                <div className="dashboard-risk-sla">
                  <Badge leftSection={<IconClockHour4 size={12} />} color="blue" variant="light">
                    {primaryRisk.sla}
                  </Badge>
                </div>
              </Group>

              <Group gap={6} mt="sm">
                {risks.map((risk) => (
                  <Badge key={risk.code} color={getRiskColor(risk.severity)} variant="light" size="xs">
                    {riskLabel(risk.code, t)}
                  </Badge>
                ))}
              </Group>
            </div>
          ))}
        </Stack>
      ) : (
        <div className="dashboard-risk-empty">
          <IconShieldCheck size={22} />
          <Text size="sm" fw={800}>
            Không có rủi ro vận hành nổi bật
          </Text>
        </div>
      )}
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
