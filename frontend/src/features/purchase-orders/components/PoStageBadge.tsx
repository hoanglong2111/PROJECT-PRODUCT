import type { CSSProperties } from 'react';
import { Badge, Stack, Text } from '@mantine/core';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { getStatusBadgeConfig } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { PO_STAGES, type PoStageKey } from '../model/poStageConfig';
import { resolvePoStage } from '../model/purchaseOrderModel';

// Linear happy-path pipeline. CANCELLED is a terminal off-ramp, not a step, so it
// is excluded from the progress bar and rendered as a muted/cancelled state.
const PIPELINE_STAGES: PoStageKey[] = PO_STAGES.map((stage) => stage.key).filter(
  (key) => key !== 'CANCELLED',
);

const statusColorTokens: Record<string, string> = {
  blue: 'var(--kbfe-status-blue)',
  cyan: 'var(--kbfe-status-cyan)',
  gray: 'var(--kbfe-status-gray)',
  green: 'var(--kbfe-status-teal)',
  orange: 'var(--kbfe-status-orange)',
  red: 'var(--kbfe-status-red)',
  teal: 'var(--kbfe-status-teal)',
  yellow: 'var(--kbfe-status-yellow)',
};

export function PoStageBadge({ order }: { order: PurchaseOrderV1 }) {
  const { statusLabel } = useI18n();
  const { stageKey, statusCode } = resolvePoStage(order);
  const config = getStatusBadgeConfig(stageKey);
  const stageLabel = statusLabel(stageKey);
  const childLabel = statusLabel(statusCode);
  const showChild = statusCode !== stageKey;

  const isCancelled = stageKey === 'CANCELLED';
  const currentIndex = PIPELINE_STAGES.indexOf(stageKey);
  // Drives the done/current segment fill via CSS. Delay is shown in its own
  // dedicated column, so the stepper stays purely about pipeline position.
  const stageColorVar = { '--stage-color': statusColorTokens[config.color] ?? 'var(--kbfe-primary-color)' } as CSSProperties;

  // TODO(real-data): when a PO carries multiple shipments, wrap this in a
  // HoverCard listing each shipment's milestone; the bar keeps showing the
  // laggard stage as the single representative.
  return (
    <Stack gap={6} align="flex-start" className="po-stage-progress" style={stageColorVar}>
      <div className="po-stage-steps">
        {PIPELINE_STAGES.map((key, index) => {
          const state = isCancelled
            ? 'cancelled'
            : index < currentIndex
              ? 'done'
              : index === currentIndex
                ? 'current'
                : 'future';
          return <span key={key} aria-hidden="true" className={`po-stage-step is-${state}`} />;
        })}
        {!isCancelled ? (
          <Text component="span" c="dimmed" className="po-stage-position">
            {currentIndex + 1}/{PIPELINE_STAGES.length}
          </Text>
        ) : null}
      </div>

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
