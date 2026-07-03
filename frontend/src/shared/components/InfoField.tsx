import { Paper, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { CopyValue } from './CopyValue';

export function InfoField({ copyable = false, label, value }: { copyable?: boolean; label: ReactNode; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>
        {copyable ? <CopyValue value={value}>{value}</CopyValue> : value}
      </Text>
    </Paper>
  );
}
