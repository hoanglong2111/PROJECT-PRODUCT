import { Badge } from '@mantine/core';

import { useI18n } from '@shared/i18n';

const STATUS_MAP: Record<string, { color: string; variant?: 'filled' | 'light' | 'outline' }> = {
  APPROVED: { color: 'blue' },
  ARRIVED_PORT: { color: 'grape' },
  ATD: { color: 'indigo' },
  BOOKED: { color: 'teal' },
  BLOCKED: { color: 'red', variant: 'outline' },
  CANCELLED: { color: 'gray', variant: 'outline' },
  CLEARED: { color: 'teal' },
  CLOSED: { color: 'teal' },
  COMPLETED: { color: 'teal' },
  CONFIRMED: { color: 'blue' },
  CONVERTED_TO_PO: { color: 'blue' },
  CREATED: { color: 'gray' },
  COPY: { color: 'gray' },
  CUSTOMS_PROCESSING: { color: 'yellow' },
  CUSTOM_DRAFT_SUBMITTED: { color: 'blue' },
  DRAFT: { color: 'gray' },
  DRAFT_BL_CONFIRMED: { color: 'teal' },
  DELAYED: { color: 'red', variant: 'filled' },
  DELIVERED: { color: 'teal' },
  DONE: { color: 'teal' },
  FINAL_BL_CONFIRMED: { color: 'teal' },
  GREEN_CLEARANCE: { color: 'teal' },
  IN_PROGRESS: { color: 'blue' },
  IN_PRODUCTION: { color: 'indigo' },
  IN_TRANSIT: { color: 'cyan', variant: 'filled' },
  INSPECTION: { color: 'yellow' },
  ISSUED: { color: 'blue' },
  MISMATCH: { color: 'red' },
  NEW: { color: 'gray' },
  NEEDS_DOCUMENTS: { color: 'orange' },
  OFFICIAL_SENT: { color: 'indigo' },
  ON_TRACK: { color: 'teal' },
  ORIGINAL: { color: 'blue' },
  OVERDUE: { color: 'red', variant: 'filled' },
  PARTIALLY_DELIVERED: { color: 'blue' },
  PENDING_CONFIG: { color: 'yellow' },
  PENDING_APPROVAL: { color: 'yellow' },
  PRELIMINARY_SENT: { color: 'blue' },
  RED_FIELD_INSPECTION: { color: 'red', variant: 'outline' },
  RED_VIOLATION_HANDLING: { color: 'red' },
  READY: { color: 'blue' },
  READY_FOR_CHECK: { color: 'blue' },
  RELEASE_READY: { color: 'teal' },
  REJECTED: { color: 'red' },
  REQUESTED: { color: 'yellow' },
  REVISION_REQUESTED: { color: 'orange' },
  SEAWAY_BILL: { color: 'teal' },
  SENT_TO_ACC: { color: 'teal' },
  SETTLED: { color: 'teal' },
  SUBMITTED: { color: 'blue' },
  SURRENDERED: { color: 'teal' },
  TODO: { color: 'gray' },
  VIOLATION_HANDLING: { color: 'red' },
  WAITING_DOCUMENTS: { color: 'gray' },
  WAITING: { color: 'yellow' },
  WAREHOUSE_PENDING: { color: 'orange' },
  YELLOW_NEED_SUPPLEMENT: { color: 'yellow' },
};

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useI18n();
  const config = STATUS_MAP[status] ?? { color: 'gray' };

  return (
    <Badge color={config.color} variant={config.variant ?? 'light'}>
      {statusLabel(status)}
    </Badge>
  );
}
