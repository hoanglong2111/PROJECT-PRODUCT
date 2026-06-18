import { Paper, Text } from '@mantine/core';

export function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm" className="purchase-order-summary-item">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} size="sm" lineClamp={1} title={value || undefined}>
        {value || '-'}
      </Text>
    </Paper>
  );
}
