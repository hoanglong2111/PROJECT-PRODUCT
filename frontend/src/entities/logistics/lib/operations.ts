import type { DeliveryOrder, DocumentReview, Quotation } from '@shared/model/logistics';
import type { DepartmentCode } from '@shared/api/taskTemplates';
import { calcDelay } from './delay';

export type OperationalRiskCode =
  | 'MISSING_DOCUMENTS'
  | 'BLOCKED_TASKS'
  | 'REQUIRED_TASKS'
  | 'WAREHOUSE_DELAY'
  | 'QUOTATION_SLA'
  | 'DRAFT_BL_SLA';

export type OperationalRisk = {
  code: OperationalRiskCode;
  severity: 'high' | 'medium' | 'low';
  ownerDept: DepartmentCode;
  slaCode: 'QUOTATION_SLA' | 'DRAFT_BL_SLA' | 'MISSING_DOCUMENTS' | 'TODAY' | 'BEFORE_CLOSE';
  detail: {
    key: string;
    params?: Record<string, string | number>;
  };
};

export type OperationalGate = {
  id: string;
  passed: boolean;
  owner: DepartmentCode;
  detail: { key: string; params?: Record<string, string | number> };
};

export const REQUIRED_DO_DOCUMENTS = ['Invoice', 'Packing List', 'B/L', 'CO'] as const;

export function getDeliveryOrderDelay(deliveryOrder: DeliveryOrder) {
  return calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });
}

export function getDeliveryOrderRisks(
  deliveryOrder: DeliveryOrder,
  quotations?: Quotation[],
  documentReviews?: DocumentReview[],
): OperationalRisk[] {
  const delay = getDeliveryOrderDelay(deliveryOrder);
  const risks: OperationalRisk[] = [];

  // 1. Quotation SLA Risk
  const orderQuote = quotations?.find((q) => q.requestCode === deliveryOrder.order_info.request_code);
  if (orderQuote && (orderQuote.status === 'PRELIMINARY_SENT' || orderQuote.status === 'OFFICIAL_SENT')) {
    risks.push({
      code: 'QUOTATION_SLA',
      detail: { key: 'opsRisk.detail.quotationPendingResponse', params: { quoteNumber: orderQuote.quoteNumber } },
      ownerDept: 'FDS_SALES',
      severity: 'high',
      slaCode: 'QUOTATION_SLA',
    });
  } else if (!quotations && deliveryOrder.order_info.status === 'CREATED') {
    risks.push({
      code: 'QUOTATION_SLA',
      detail: { key: 'opsRisk.detail.quotationBiddingPending' },
      ownerDept: 'FDS_SALES',
      severity: 'high',
      slaCode: 'QUOTATION_SLA',
    });
  }

  // 2. Draft B/L SLA Risk
  const orderReview = documentReviews?.find((r) => r.deliveryOrderId === deliveryOrder.id);
  if (orderReview && orderReview.status === 'READY_FOR_CHECK') {
    risks.push({
      code: 'DRAFT_BL_SLA',
      detail: { key: 'opsRisk.detail.draftBlPendingKbiReview' },
      ownerDept: 'FDS_OPS_CUSTOMS',
      severity: 'high',
      slaCode: 'DRAFT_BL_SLA',
    });
  } else if (!documentReviews && deliveryOrder.order_info.status === 'IN_TRANSIT') {
    risks.push({
      code: 'DRAFT_BL_SLA',
      detail: { key: 'opsRisk.detail.draftBlUploadedPendingKbiReview' },
      ownerDept: 'FDS_OPS_CUSTOMS',
      severity: 'high',
      slaCode: 'DRAFT_BL_SLA',
    });
  }

  // "Missing" here means required documents NOT yet uploaded (documents_outstanding),
  // not REJECTED ones (missing_documents). Fall back to the legacy field when the
  // backend gate is absent (e.g. non-screen mapper path).
  const outstandingDocuments =
    deliveryOrder.logistics_shipping.documents_outstanding ?? deliveryOrder.logistics_shipping.missing_documents;
  if (outstandingDocuments.length > 0) {
    risks.push({
      code: 'MISSING_DOCUMENTS',
      detail: {
        key: 'opsRisk.detail.missingDocuments',
        params: { documents: outstandingDocuments.join(', ') },
      },
      ownerDept: 'FDS_OPS_CUSTOMS',
      severity: 'high',
      slaCode: 'MISSING_DOCUMENTS',
    });
  }

  if (deliveryOrder.task_summary.blocked_tasks > 0) {
    risks.push({
      code: 'BLOCKED_TASKS',
      detail: {
        key: 'opsRisk.detail.blockedTasks',
        params: { count: deliveryOrder.task_summary.blocked_tasks },
      },
      ownerDept: 'FDS_OPS',
      severity: 'high',
      slaCode: 'TODAY',
    });
  }

  if (deliveryOrder.task_summary.required_tasks_remaining > 0) {
    risks.push({
      code: 'REQUIRED_TASKS',
      detail: {
        key: 'opsRisk.detail.requiredTasks',
        params: { count: deliveryOrder.task_summary.required_tasks_remaining },
      },
      ownerDept: 'FDS_OPS',
      severity: 'medium',
      slaCode: 'BEFORE_CLOSE',
    });
  }

  if (delay.isLate) {
    risks.push({
      code: 'WAREHOUSE_DELAY',
      detail: { key: 'opsRisk.detail.warehouseDelay', params: { days: delay.days } },
      ownerDept: 'KBI_WAREHOUSE',
      severity: 'high',
      slaCode: 'TODAY',
    });
  }

  return risks;
}

export function getPrimaryOperationalRisk(
  deliveryOrder: DeliveryOrder,
  quotations?: Quotation[],
  documentReviews?: DocumentReview[],
) {
  const score = { high: 3, medium: 2, low: 1 };

  return (
    getDeliveryOrderRisks(deliveryOrder, quotations, documentReviews).sort(
      (a, b) => score[b.severity] - score[a.severity],
    )[0] ?? null
  );
}

export function getOperationalGates(deliveryOrder: DeliveryOrder): OperationalGate[] {
  const hasCoreDocuments = REQUIRED_DO_DOCUMENTS.every((documentName) =>
    deliveryOrder.logistics_shipping.documents_list.includes(documentName),
  );
  const delay = getDeliveryOrderDelay(deliveryOrder);
  const tasksReady = deliveryOrder.task_summary.required_tasks_remaining === 0 && deliveryOrder.task_summary.blocked_tasks === 0;
  const warehouseReady = Boolean(deliveryOrder.warehouse_tracking.actual_entry_date) || !delay.isLate;
  // Prefer the backend documents-complete gate; fall back to the legacy heuristic.
  const outstandingDocuments = deliveryOrder.logistics_shipping.documents_outstanding ?? [];
  const documentsReady =
    deliveryOrder.logistics_shipping.documents_complete ??
    (deliveryOrder.logistics_shipping.missing_documents.length === 0 && hasCoreDocuments);
  const documentsMissingList = (outstandingDocuments.length > 0
    ? outstandingDocuments
    : deliveryOrder.logistics_shipping.missing_documents
  ).join(', ');

  return [
    {
      detail: documentsReady ? { key: 'opsGate.documentsReady' } : { key: 'opsGate.documentsMissing', params: { documents: documentsMissingList } },
      id: 'documents',
      owner: 'FDS_OPS',
      passed: documentsReady,
    },
    {
      detail: documentsReady ? { key: 'opsGate.customsReady' } : { key: 'opsGate.customsWaiting' },
      id: 'customs',
      owner: 'FDS_OPS_CUSTOMS',
      passed: documentsReady,
    },
    {
      detail: tasksReady
        ? { key: 'opsGate.tasksReady' }
        : { key: 'opsGate.tasksBlocked', params: { required: deliveryOrder.task_summary.required_tasks_remaining, blocked: deliveryOrder.task_summary.blocked_tasks } },
      id: 'tasks',
      owner: 'FDS_OPS',
      passed: tasksReady,
    },
    {
      detail: delay.isLate ? { key: 'opsGate.warehouseLate', params: { days: delay.days } } : { key: 'opsGate.warehouseReady' },
      id: 'warehouse',
      owner: 'KBI_WAREHOUSE',
      passed: warehouseReady,
    },
    {
      detail: tasksReady && documentsReady ? { key: 'opsGate.financeReady' } : { key: 'opsGate.financeWaiting' },
      id: 'finance',
      owner: 'FDS_ACCOUNTING',
      passed: tasksReady && documentsReady,
    },
  ];
}

export function getRiskColor(severity: OperationalRisk['severity']) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'orange';
  return 'yellow';
}
