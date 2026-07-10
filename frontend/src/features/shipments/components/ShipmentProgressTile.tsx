import { Group, Progress, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type ShipmentProgressTileProps = {
  color: string;
  hideProgress?: boolean;
  icon: ReactNode;
  label: string;
  progress: number;
  value: string;
};

export function ShipmentProgressTile({ color, hideProgress = false, icon, label, progress, value }: ShipmentProgressTileProps) {
  return (
    <div className="shipment-progress-tile">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <div className="shipment-info-icon">{icon}</div>
        <div className="shipment-info-content">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text fw={800} className="tabular-nums" lineClamp={1} title={value}>
            {value}
          </Text>
          {hideProgress ? null : <Progress value={progress} color={color} size="xs" radius="xl" mt={6} />}
        </div>
      </Group>
    </div>
  );
}
