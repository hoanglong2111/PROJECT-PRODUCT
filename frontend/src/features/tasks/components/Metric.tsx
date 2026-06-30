import { Group, Paper, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title
            order={1}
            fw={800}
            style={{ lineHeight: 1.1, color: `var(--kbfe-status-${color}, var(--mantine-color-${color}-7))` }}
          >
            {value}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}
