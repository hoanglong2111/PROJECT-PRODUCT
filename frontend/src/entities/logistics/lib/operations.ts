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

export type OperationalOwner =
  | 'PIC Manager'
  | 'Sale Staff'
  | 'Port Officer'
  | 'Customs Officer'
  | 'Finance Officer'
  | 'Warehouse Staff';

export type OperationalRisk = {
  code: OperationalRiskCode;
  severity: 'high' | 'medium' | 'low';
  ownerDept: DepartmentCode;
  slaCode: '1H' | '2H' | '8H' | 'TODAY' | 'BEFORE_CLOSE';
  detail: {
    key: string;
    params?: Record<string, string | number>;
  };
};

export type OperationalGate = {
  id: string;
  passed: boolean;
  owner: OperationalOwner;
  detail: string;
};

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
      slaCode: '1H',
    });
  } else if (!quotations && deliveryOrder.order_info.status === 'CREATED') {
    risks.push({
      code: 'QUOTATION_SLA',
      detail: { key: 'opsRisk.detail.quotationBiddingPending' },
      ownerDept: 'FDS_SALES',
      severity: 'high',
      slaCode: '1H',
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
      slaCode: '2H',
    });
  } else if (!documentReviews && deliveryOrder.order_info.status === 'IN_TRANSIT') {
    risks.push({
      code: 'DRAFT_BL_SLA',
      detail: { key: 'opsRisk.detail.draftBlUploadedPendingKbiReview' },
      ownerDept: 'FDS_OPS_CUSTOMS',
      severity: 'high',
      slaCode: '2H',
    });
  }

  if (deliveryOrder.logistics_shipping.missing_documents.length > 0) {
    risks.push({
      code: 'MISSING_DOCUMENTS',
      detail: {
        key: 'opsRisk.detail.missingDocuments',
        params: { documents: deliveryOrder.logistics_shipping.missing_documents.join(', ') },
      },
      ownerDept: 'FDS_OPS_CUSTOMS',
      severity: 'high',
      slaCode: '1H',
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
  const hasCoreDocuments = ['Invoice', 'Packing List', 'B/L'].every((documentName) =>
    deliveryOrder.logistics_shipping.documents_list.includes(documentName),
  );
  const delay = getDeliveryOrderDelay(deliveryOrder);
  const tasksReady = deliveryOrder.task_summary.required_tasks_remaining === 0 && deliveryOrder.task_summary.blocked_tasks === 0;
  const warehouseReady = Boolean(deliveryOrder.warehouse_tracking.actual_entry_date) || !delay.isLate;
  const documentsReady = deliveryOrder.logistics_shipping.missing_documents.length === 0 && hasCoreDocuments;

  return [
    {
      detail: documentsReady ? 'Draft B/L, CI, Packing List ready' : deliveryOrder.logistics_shipping.missing_documents.join(', '),
      id: 'documents',
      owner: 'Port Officer',
      passed: documentsReady,
    },
    {
      detail: documentsReady ? 'Customs declaration ready' : 'Waiting for document cross-check',
      id: 'customs',
      owner: 'Customs Officer',
      passed: documentsReady,
    },
    {
      detail: tasksReady
        ? 'Required tasks clear'
        : `${deliveryOrder.task_summary.required_tasks_remaining} required, ${deliveryOrder.task_summary.blocked_tasks} blocked`,
      id: 'tasks',
      owner: 'PIC Manager',
      passed: tasksReady,
    },
    {
      detail: delay.isLate ? `${delay.days}d late/forecast` : 'Within warehouse deadline',
      id: 'warehouse',
      owner: 'Warehouse Staff',
      passed: warehouseReady,
    },
    {
      detail: tasksReady && documentsReady ? 'OF/AF then Final Debit Note can proceed' : 'Finance note waits for ops gates',
      id: 'finance',
      owner: 'Finance Officer',
      passed: tasksReady && documentsReady,
    },
  ];
}

export function getRiskColor(severity: OperationalRisk['severity']) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'orange';
  return 'yellow';
}
