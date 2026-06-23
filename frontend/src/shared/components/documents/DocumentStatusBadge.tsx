import { Badge, type BadgeProps } from '@mantine/core';

// Shared status → colour map for document workflow states, used by both the
// Shipment documents tab and the Delivery Order documents tab so the two stay
// visually consistent.
const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'green',
  VERIFIED: 'green',
  RECEIVED: 'orange',
  WAITING_REVIEW: 'orange',
  REJECTED: 'red',
  DRAFT: 'gray',
  PENDING_UPLOAD: 'gray',
  CANCELLED: 'gray',
};

export function documentStatusColor(status: string) {
  return STATUS_COLORS[status] ?? 'gray';
}

export function DocumentStatusBadge({
  status,
  label,
  size,
  variant,
}: {
  status: string;
  label?: string;
  size?: BadgeProps['size'];
  variant?: BadgeProps['variant'];
}) {
  return (
    <Badge color={documentStatusColor(status)} size={size} variant={variant}>
      {label ?? status}
    </Badge>
  );
}
