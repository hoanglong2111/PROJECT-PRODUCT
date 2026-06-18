import { Paper, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function InfoField({ label, value }: { label: ReactNode; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
