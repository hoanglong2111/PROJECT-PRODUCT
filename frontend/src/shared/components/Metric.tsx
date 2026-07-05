import { Group, NumberFormatter, Paper, Text, Title } from '@mantine/core';
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
  const classes = ['metric-card', className].filter(Boolean).join(' ');
  const displayValue = format && typeof value === 'number'
    ? <NumberFormatter value={value} thousandSeparator />
    : value || '-';

  return (
    <Paper withBorder p="md" className={classes}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title
            order={1}
            fw={800}
            className={valueClassName}
            style={{ lineHeight: 1.1, color: `var(--kbfe-status-${color}, var(--mantine-color-${color}-7))` }}
            title={String(value)}
          >
            {displayValue}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}
