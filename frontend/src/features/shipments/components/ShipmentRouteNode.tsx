import { Text } from '@mantine/core';

type ShipmentRouteNodeProps = {
  actualLabel?: string;
  actualValue?: string;
  align?: 'left' | 'right';
  dateLabel: string;
  dateValue: string;
  label: string;
  port: string;
};

export function ShipmentRouteNode({ actualLabel, actualValue, align = 'left', dateLabel, dateValue, label, port }: ShipmentRouteNodeProps) {
  return (
    <div className={`shipment-route-node ${align === 'right' ? 'is-right' : ''}`}>
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} lineClamp={1} title={port}>
        {port || '-'}
      </Text>
      <Text size="sm" fw={700} c="dimmed" className="tabular-nums">
        {dateLabel}: {dateValue || '-'}
      </Text>
      {actualLabel ? (
        <Text size="xs" fw={600} c={actualValue ? 'teal' : 'dimmed'} className="tabular-nums">
          {actualLabel}: {actualValue || '-'}
        </Text>
      ) : null}
    </div>
  );
}
