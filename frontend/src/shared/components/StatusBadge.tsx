import { Badge } from '@mantine/core';

import { useI18n } from '@shared/i18n';

export type StatusBadgeConfig = { color: string; variant?: 'filled' | 'light' | 'outline' };

export const STATUS_MAP: Record<string, StatusBadgeConfig> = {
  APPROVED: { color: 'blue' },
  ARRIVED: { color: 'grape' },
  ARRIVED_PORT: { color: 'grape' },
  ASSIGNED_TO_SHIPMENT: { color: 'cyan', variant: 'filled' },
  ATD: { color: 'indigo' },
  BL_ISSUED: { color: 'indigo' },
  BOOKED: { color: 'teal' },
  BOOKING_CONFIRMED: { color: 'blue' },
  BOOKING_PENDING: { color: 'yellow' },
  BLOCKED: { color: 'red', variant: 'outline' },
  CANCELLED: { color: 'gray', variant: 'outline' },
  CARGO_READY: { color: 'blue' },
  CLEARED: { color: 'teal' },
  CLOSED: { color: 'teal' },
  COMPLETED: { color: 'teal' },
  CONFIRMED: { color: 'blue' },
  CONVERTED_TO_PO: { color: 'blue' },
  CREATED: { color: 'gray' },
  COPY: { color: 'gray' },
  CUSTOMS: { color: 'teal' },
  CUSTOMS_CLEARED: { color: 'teal' },
  CUSTOMS_DRAFT: { color: 'blue' },
  CUSTOMS_PROCESSING: { color: 'yellow' },
  CUSTOM_DRAFT_SUBMITTED: { color: 'blue' },
  DRAFT: { color: 'gray' },
  DRAFT_OPENED: { color: 'blue' },
  DRAFT_BL_CONFIRMED: { color: 'teal' },
  DELAYED: { color: 'red', variant: 'filled' },
  DELIVERED: { color: 'teal' },
  DISPATCHED: { color: 'blue' },
  DONE: { color: 'teal' },
  FINAL_BL_CONFIRMED: { color: 'teal' },
  GATE_IN_POL: { color: 'indigo' },
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
  OFFICIAL_OPENED: { color: 'indigo' },
  ON_TRACK: { color: 'teal' },
  ORIGINAL: { color: 'blue' },
  OVERDUE: { color: 'red', variant: 'filled' },
  PARTIALLY_DELIVERED: { color: 'blue' },
  PICKED_UP: { color: 'blue' },
  POD_RECEIVED: { color: 'teal' },
  PENDING_CONFIG: { color: 'yellow' },
  PENDING_APPROVAL: { color: 'yellow' },
  PRELIMINARY_SENT: { color: 'blue' },
  PROCUREMENT: { color: 'blue' },
  PRODUCTION: { color: 'indigo' },
  QUOTATION_CONFIRMED: { color: 'blue' },
  QUOTE_CONFIRMED: { color: 'blue' },
  QUOTE_PENDING: { color: 'orange' },
  QUOTED: { color: 'yellow' },
  RED_FIELD_INSPECTION: { color: 'red', variant: 'outline' },
  RED_VIOLATION_HANDLING: { color: 'red' },
  READY: { color: 'blue' },
  READY_FOR_CHECK: { color: 'blue' },
  READY_FOR_QUOTATION: { color: 'orange' },
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

export function getStatusBadgeConfig(status: string): StatusBadgeConfig {
  return STATUS_MAP[status] ?? { color: 'gray' };
}

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useI18n();
  const config = getStatusBadgeConfig(status);

  return (
    <Badge color={config.color} variant={config.variant ?? 'light'}>
      {statusLabel(status)}
    </Badge>
  );
}
