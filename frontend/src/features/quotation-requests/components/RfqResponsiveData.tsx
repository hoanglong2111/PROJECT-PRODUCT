import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function RfqCardFact({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="rfq-data-card-fact" data-wide={wide || undefined}>
      <Text size="xs" c="dimmed" fw={600}>{label}</Text>
      <div className="rfq-data-card-value">{value}</div>
    </div>
  );
}

