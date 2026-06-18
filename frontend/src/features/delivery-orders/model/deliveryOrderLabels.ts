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
    FINANCE_NOT_READY: t('opsRisk.financeNotReady'),
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
  if (risk.code === 'BLOCKED_TASKS') {
    const count = Number.parseInt(risk.detail, 10);
    return t('deliveryOrders.riskBlockedTasksDetail', { count: Number.isFinite(count) ? count : 0 });
  }
  if (risk.code === 'REQUIRED_TASKS') {
    const count = Number.parseInt(risk.detail, 10);
    return t('deliveryOrders.riskRequiredTasksDetail', { count: Number.isFinite(count) ? count : 0 });
  }
  if (risk.code === 'FINANCE_NOT_READY') {
    return t('deliveryOrders.financeBlockedDetail');
  }
  return risk.detail;
}

export function slaLabel(sla: OperationalRisk['sla'], t: ReturnType<typeof useI18n>['t']) {
  if (sla === 'Today') return t('deliveryOrders.slaToday');
  if (sla === 'Before close') return t('deliveryOrders.slaBeforeClose');
  return sla;
}

export function extractTaskGateCounts(detail: string) {
  const matches = detail.match(/\d+/g) ?? [];
  return {
    blocked: Number(matches[1] ?? 0),
    required: Number(matches[0] ?? 0),
  };
}
