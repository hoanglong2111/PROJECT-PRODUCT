import { Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { CopyValue } from '@shared/components/CopyValue';

type ShipmentCommandItemProps = {
  copyable?: boolean;
  icon: ReactNode;
  label: string;
  meta: string;
  metaCopyable?: boolean;
  value?: string;
  valueNode?: ReactNode;
};

export function ShipmentCommandItem({ copyable = false, icon, label, meta, metaCopyable = false, value, valueNode }: ShipmentCommandItemProps) {
  return (
    <div className="shipment-command-item">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <div className="shipment-info-icon">{icon}</div>
        <div className="shipment-info-content">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {label}
          </Text>
          {valueNode ?? (
            <Text fw={800} lineClamp={1} title={value}>
              {copyable && value ? <CopyValue value={value}>{value}</CopyValue> : value || '-'}
            </Text>
          )}
          <Text size="xs" c="dimmed" lineClamp={1} title={meta}>
            {metaCopyable && meta ? <CopyValue value={meta}>{meta}</CopyValue> : meta || '-'}
          </Text>
        </div>
      </Group>
    </div>
  );
}
