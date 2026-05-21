import type { Row, SlaStatus } from './sopTypes';
import { canDispatch, customsNextAction, getSlaStatus, inferLaneStatus, optionalString, stringValue, toCamelObject } from './sopUtils';

export function decorateQuotation(row: Row): Row & {
  isOverdue: boolean;
  slaDueAt: string | null;
  slaStage: string | null;
  slaStatus: SlaStatus;
} {
  const status = stringValue(row.status);
  const preliminaryDueAt = stringValue(row.preliminary_due_at);
  const officialDueAt = stringValue(row.official_due_at);
  const slaStage =
    ['DRAFT', 'PRELIMINARY_SENT', 'REVISION_REQUESTED'].includes(status)
      ? 'S.03_PRELIMINARY'
      : status === 'OFFICIAL_SENT'
        ? 'S.04_OFFICIAL'
        : null;
  const slaDueAt = slaStage === 'S.03_PRELIMINARY' ? preliminaryDueAt : slaStage === 'S.04_OFFICIAL' ? officialDueAt : null;
  const slaStatus = slaDueAt ? getSlaStatus(slaDueAt, Boolean(row.customer_response_at || status === 'APPROVED')) : 'DONE';
  return {
    ...toCamelObject(row),
    isOverdue: slaStatus === 'OVERDUE',
    slaDueAt,
    slaStage,
    slaStatus,
  };
}

export function decorateDocumentReview(row: Row): Row & {
  isOverdue: boolean;
  slaStatus: SlaStatus;
} {
  const done = Boolean(row.cross_checked_at) || ['DRAFT_BL_CONFIRMED', 'FINAL_BL_CONFIRMED', 'MISMATCH'].includes(stringValue(row.status));
  const slaStatus = done ? 'DONE' : getSlaStatus(stringValue(row.cross_check_due_at), false);
  return {
    ...toCamelObject(row),
    isOverdue: slaStatus === 'OVERDUE',
    slaStatus,
  };
}

export function decorateFinanceNote(row: Row): Row & {
  slaStatus: SlaStatus;
} {
  const done = Boolean(row.issued_at);
  const slaStatus = row.sla_due_at ? getSlaStatus(stringValue(row.sla_due_at), done) : 'DONE';
  return {
    ...toCamelObject(row),
    slaStatus,
  };
}

export function decorateCustoms(row: Row, transport?: Row | null) {
  const laneStatus = optionalString(row.lane_status) ?? inferLaneStatus(optionalString(row.channel), stringValue(row.status));
  const decoratedRow = { ...row, lane_status: laneStatus };
  return {
    ...toCamelObject(decoratedRow),
    canDispatch: canDispatch(row, transport),
    nextAction: customsNextAction(laneStatus, stringValue(row.status)),
  };
}

