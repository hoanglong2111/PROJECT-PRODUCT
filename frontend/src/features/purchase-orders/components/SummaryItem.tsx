import { Paper, Text } from '@mantine/core';

export function SummaryItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Paper withBorder p="sm" className="purchase-order-summary-item">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} size="lg" lineClamp={1} title={value || undefined} c={accent}>
        {value || '-'}
      </Text>
    </Paper>
  );
}
