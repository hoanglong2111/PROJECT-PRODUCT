import { useI18n } from '@shared/i18n';
import type {
  OperationalGate,
  OperationalRisk,
  OperationalRiskCode,
} from '@entities/logistics';

export function gateLabel(id: string, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<string, string> = {
    customs: t('deliveryOrders.gateCustoms'),
    documents: t('deliveryOrders.gateDocuments'),
    finance: t('deliveryOrders.gateFinance'),
    tasks: t('deliveryOrders.gateTasks'),
    warehouse: t('deliveryOrders.gateWarehouse'),
  };

  return labels[id] ?? id;
}

export function riskLabel(code: OperationalRiskCode, t: ReturnType<typeof useI18n>['t']) {
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

export function gateDetail(gate: OperationalGate, t: ReturnType<typeof useI18n>['t']) {
  return t(gate.detail.key, gate.detail.params);
}

export function riskDetail(risk: OperationalRisk, t: ReturnType<typeof useI18n>['t']) {
  return t(risk.detail.key, risk.detail.params);
}

export function slaLabel(slaCode: OperationalRisk['slaCode'], t: ReturnType<typeof useI18n>['t']) {
  const keys: Record<OperationalRisk['slaCode'], string> = {
    QUOTATION_SLA: 'opsRisk.sla.quotation',
    DRAFT_BL_SLA: 'opsRisk.sla.draftBl',
    MISSING_DOCUMENTS: 'opsRisk.sla.missingDocuments',
    BEFORE_CLOSE: 'opsRisk.sla.beforeClose',
    TODAY: 'opsRisk.sla.today',
  };

  return t(keys[slaCode]);
}

