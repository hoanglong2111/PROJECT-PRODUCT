import { Group, Paper, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function Metric({
  color = 'teal',
  icon,
  label,
  value,
}: {
  color?: 'blue' | 'cyan' | 'gray' | 'teal';
  icon?: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className={`metric-card dto-metric-card dto-metric-card-${color}`}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div className="dto-metric-content">
          <Text className="metric-label" size="xs" fw={700} tt="uppercase">
            {label}
          </Text>
          <Title order={1} fw={800} className="dto-metric-value" style={{ lineHeight: 1.1 }}>
            {value}
          </Title>
        </div>
        {icon ? <div className="dto-metric-icon">{icon}</div> : null}
      </Group>
    </Paper>
  );
}
