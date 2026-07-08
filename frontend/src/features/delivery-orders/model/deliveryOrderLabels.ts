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
  if (gate.id === 'documents') {
    return gate.passed ? t('deliveryOrders.gateDocumentsReadyDetail') : gate.detail;
  }
  if (gate.id === 'customs') {
    return gate.passed
      ? t('deliveryOrders.gateCustomsReadyDetail')
      : t('deliveryOrders.gateWaitingDocumentCrossCheckDetail');
  }
  if (gate.id === 'tasks') {
    return gate.passed
      ? t('deliveryOrders.gateRequiredTasksClearDetail')
      : t('deliveryOrders.gateTasksBlockedDetail', extractTaskGateCounts(gate.detail));
  }
  if (gate.id === 'warehouse') {
    const days = Number.parseInt(gate.detail, 10);
    return gate.passed
      ? t('deliveryOrders.gateWithinWarehouseDeadlineDetail')
      : t('deliveryOrders.gateWarehouseLateDetail', { days: Number.isFinite(days) ? days : 0 });
  }
  if (gate.id === 'finance') {
    return gate.passed ? t('deliveryOrders.gateFinanceProceedDetail') : t('deliveryOrders.gateFinanceWaitsDetail');
  }
  return gate.detail;
}

export function riskDetail(risk: OperationalRisk, t: ReturnType<typeof useI18n>['t']) {
  return t(risk.detail.key, risk.detail.params);
}

export function slaLabel(slaCode: OperationalRisk['slaCode'], t: ReturnType<typeof useI18n>['t']) {
  const keys: Record<OperationalRisk['slaCode'], string> = {
    '1H': 'opsRisk.sla.1H',
    '2H': 'opsRisk.sla.2H',
    '8H': 'opsRisk.sla.8H',
    BEFORE_CLOSE: 'opsRisk.sla.beforeClose',
    TODAY: 'opsRisk.sla.today',
  };

  return t(keys[slaCode]);
}

export function extractTaskGateCounts(detail: string) {
  const matches = detail.match(/\d+/g) ?? [];
  return {
    blocked: Number(matches[1] ?? 0),
    required: Number(matches[0] ?? 0),
  };
}
