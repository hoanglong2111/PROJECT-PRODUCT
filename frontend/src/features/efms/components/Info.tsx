import type { ReactNode } from 'react';

import { Paper, Text } from '@mantine/core';

export function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600} component="div">
        {value}
      </Text>
    </Paper>
  );
}
