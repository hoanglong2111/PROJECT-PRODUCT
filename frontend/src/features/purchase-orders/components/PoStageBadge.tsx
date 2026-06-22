import { Badge, Stack, Text } from '@mantine/core';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { getStatusBadgeConfig } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { resolvePoStage } from '../model/purchaseOrderModel';

export function PoStageBadge({ order }: { order: PurchaseOrderV1 }) {
  const { statusLabel } = useI18n();
  const { stageKey, statusCode } = resolvePoStage(order);
  const config = getStatusBadgeConfig(stageKey);
  const stageLabel = statusLabel(stageKey);
  const childLabel = statusLabel(statusCode);
  const showChild = statusCode !== stageKey;

  // TODO(real-data): when a PO carries multiple shipments, wrap this in a
  // HoverCard listing each shipment's milestone; the badge keeps showing the
  // laggard stage as the single representative.
  return (
    <Stack gap={2} align="flex-start">
      <Badge color={config.color} variant={config.variant ?? 'light'}>
        {stageLabel}
      </Badge>
      {showChild ? (
        <Text size="xs" c="dimmed" lineClamp={1} title={childLabel}>
          {childLabel}
        </Text>
      ) : null}
    </Stack>
  );
}
