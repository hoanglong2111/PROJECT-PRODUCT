import { Group, NumberFormatter, Paper, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type MetricProps = {
  className?: string;
  color?: string;
  format?: boolean;
  icon?: ReactNode;
  label: string;
  value: number | string;
  valueClassName?: string;
};

export function Metric({
  className,
  color = 'blue',
  format = true,
  icon,
  label,
  value,
  valueClassName,
}: MetricProps) {
  const classes = ['metric-card', 'kbfe-surface-wash', 'kbfe-surface-wash--emphasis', className]
    .filter(Boolean)
    .join(' ');
  const displayValue = format && typeof value === 'number'
    ? <NumberFormatter value={value} thousandSeparator />
    : value || '-';

  return (
    <Paper withBorder p="sm" className={classes} data-surface-tone={color}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div className="metric-copy">
          <Text className="metric-label" size="xs" fw={600} mb={2}>
            {label}
          </Text>
          <Text
            component="div"
            fw={800}
            className={['metric-value', valueClassName].filter(Boolean).join(' ')}
            style={{ color: `var(--kbfe-status-${color}, var(--mantine-color-${color}-7))` }}
            title={String(value)}
          >
            {displayValue}
          </Text>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}
