import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { CopyValue } from '@shared/components/CopyValue';

export function DeliveryOrderFact({ copyValue, label, value }: { copyValue?: string; label: ReactNode; value: ReactNode }) {
  const title = typeof value === 'string' ? value : undefined;

  return (
    <div className="do-fact">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} lineClamp={1} title={title}>
        {copyValue && typeof value === 'string' ? <CopyValue value={copyValue}>{value}</CopyValue> : value}
      </Text>
    </div>
  );
}
