import { Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { FieldHint } from '../FieldHint';

export function SummaryTile({
  hint,
  label,
  tone = 'default',
  value,
}: {
  hint?: string;
  label: string;
  tone?: 'default' | 'accent';
  value: ReactNode;
}) {
  return (
    <div className={`purchase-order-form-summary-tile ${tone === 'accent' ? 'is-accent' : ''}`}>
      <Text size="xs" c="dimmed" fw={700} className="purchase-order-form-summary-label">
        {hint ? (
          <Group gap={4} wrap="nowrap" component="span" className="purchase-order-form-summary-label-inner">
            <span>{label}</span>
            <FieldHint label={hint} size={12} />
          </Group>
        ) : (
          label
        )}
      </Text>
      <Text component="div" fw={800} size="sm" lineClamp={1} className="purchase-order-form-summary-value tabular-nums">
        {value}
      </Text>
    </div>
  );
}
