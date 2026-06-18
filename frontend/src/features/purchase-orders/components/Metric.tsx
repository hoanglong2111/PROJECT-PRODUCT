import { Paper, Text } from '@mantine/core';

export function Metric({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} size="xl" c={color}>
        {value.toLocaleString()}
      </Text>
    </Paper>
  );
}
