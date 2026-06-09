import { Group, NumberFormatter, Paper, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function MetricCard({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div style={{ position: 'relative', zIndex: 3 }}>
          <Text className="metric-label" size="xs" fw={600} lts="0.03em" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} className="tabular-nums" style={{ lineHeight: 1.1 }}>
            <NumberFormatter value={value} thousandSeparator />
          </Title>
        </div>
        <span className={`metric-icon metric-icon-${color}`} style={{ position: 'relative', zIndex: 3 }}>
          {icon}
        </span>
      </Group>
    </Paper>
  );
}
