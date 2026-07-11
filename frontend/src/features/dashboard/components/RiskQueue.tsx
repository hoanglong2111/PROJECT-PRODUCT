import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconClockHour4, IconShieldCheck } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { getRiskColor, type OperationalRiskCode, type OperationalRisk } from '@entities/logistics';

import type { DashboardRiskRow } from '../model/dashboardSelectors';

export function RiskQueue({ riskRows }: { riskRows: DashboardRiskRow[] }) {
  const { departmentLabel, t } = useI18n();

  return (
    <Paper withBorder p="md" className="metric-card dashboard-card dashboard-risk-card dl-data-panel">
      <Group justify="space-between" mb="sm" align="flex-start" className="dl-data-panel-header dashboard-risk-header">
        <div>
          <Title order={3}>{t('dashboard.riskQueue')}</Title>
          <Text size="sm" c="dimmed">
            {t('dashboard.riskQueueDescription')}
          </Text>
        </div>
        <Badge variant="light">{t('common.records', { count: riskRows.length })}</Badge>
      </Group>

      {riskRows.length > 0 ? (
        <Stack gap={6}>
          {riskRows.map(({ deliveryOrder, primaryRisk, risks }) => (
            <div key={deliveryOrder.id} className="dashboard-risk-row">
              <div className="dashboard-risk-grid">
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
                  <Text size="xs" c="dimmed" mt={4} lineClamp={2} className="dashboard-risk-subtitle">
                    {riskDetail(primaryRisk, t)}
                  </Text>
                </div>

                <div className="dashboard-risk-owner">
                  <Text size="xs" c="dimmed" fw={800}>
                    {t('common.owner')}
                  </Text>
                  <Text size="sm" fw={800}>
                    {departmentLabel(primaryRisk.ownerDept)}
                  </Text>
                </div>

                <div className="dashboard-risk-sla">
                  <Badge leftSection={<IconClockHour4 size={12} />} color="blue" variant="light">
                    {slaLabel(primaryRisk.slaCode, t)}
                  </Badge>
                </div>
              </div>

              <Group gap={6} mt={6}>
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
            {t('dashboard.riskQueueEmpty')}
          </Text>
        </div>
      )}
    </Paper>
  );
}

function riskLabel(code: OperationalRiskCode, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<OperationalRiskCode, string> = {
    BLOCKED_TASKS: t('opsRisk.blockedTasks'),
    MISSING_DOCUMENTS: t('opsRisk.missingDocuments'),
    REQUIRED_TASKS: t('opsRisk.requiredTasks'),
    WAREHOUSE_DELAY: t('opsRisk.warehouseDelay'),
    QUOTATION_SLA: t('opsRisk.quotationSla'),
    DRAFT_BL_SLA: t('opsRisk.draftBlSla'),
  };

  return labels[code];
}

function riskDetail(risk: OperationalRisk, t: ReturnType<typeof useI18n>['t']) {
  return t(risk.detail.key, risk.detail.params);
}

function slaLabel(slaCode: OperationalRisk['slaCode'], t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<OperationalRisk['slaCode'], string> = {
    QUOTATION_SLA: t('opsRisk.sla.quotation'),
    DRAFT_BL_SLA: t('opsRisk.sla.draftBl'),
    MISSING_DOCUMENTS: t('opsRisk.sla.missingDocuments'),
    BEFORE_CLOSE: t('opsRisk.sla.beforeClose'),
    TODAY: t('opsRisk.sla.today'),
  };

  return labels[slaCode];
}
