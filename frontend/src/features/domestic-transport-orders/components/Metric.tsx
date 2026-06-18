import { Paper, Text, Title } from '@mantine/core';

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text className="metric-label" size="xs" fw={700} tt="uppercase">
        {label}
      </Text>
      <Title order={1} fw={800} c="teal" style={{ lineHeight: 1.1 }}>
        {value}
      </Title>
    </Paper>
  );
}
