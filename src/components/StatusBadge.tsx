import { Badge } from '@mantine/core';

import { useI18n } from '../i18n';

const STATUS_MAP: Record<string, { color: string; variant?: 'filled' | 'light' | 'outline' }> = {
  APPROVED: { color: 'blue' },
  ARRIVED_PORT: { color: 'grape' },
  BLOCKED: { color: 'red', variant: 'outline' },
  CANCELLED: { color: 'gray', variant: 'outline' },
  CLOSED: { color: 'teal' },
  COMPLETED: { color: 'teal' },
  CONFIRMED: { color: 'blue' },
  CONVERTED_TO_PO: { color: 'blue' },
  CREATED: { color: 'gray' },
  CUSTOMS_PROCESSING: { color: 'yellow' },
  DELAYED: { color: 'red', variant: 'filled' },
  DELIVERED: { color: 'teal' },
  IN_PROGRESS: { color: 'blue' },
  IN_PRODUCTION: { color: 'indigo' },
  IN_TRANSIT: { color: 'cyan', variant: 'filled' },
  NEW: { color: 'gray' },
  PARTIALLY_DELIVERED: { color: 'blue' },
  PENDING_APPROVAL: { color: 'yellow' },
  REJECTED: { color: 'red' },
  SAP_PENDING: { color: 'orange' },
  SAP_SYNCED: { color: 'teal' },
  TODO: { color: 'gray' },
  WAITING: { color: 'yellow' },
  WAREHOUSE_PENDING: { color: 'orange' },
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
