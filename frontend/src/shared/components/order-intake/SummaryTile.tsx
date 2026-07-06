import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function SummaryTile({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: 'default' | 'accent';
  value: ReactNode;
}) {
  return (
    <div className={`purchase-order-form-summary-tile ${tone === 'accent' ? 'is-accent' : ''}`}>
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text component="div" fw={800} size="sm" lineClamp={1} className="tabular-nums">
        {value}
      </Text>
    </div>
  );
}
