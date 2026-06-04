import { Group, Progress, Text } from '@mantine/core';

export function FulfillmentProgress({ delivered, ordered, unit }: { delivered: number; ordered: number; unit: string }) {
  const percent = ordered > 0 ? Math.min(100, Math.round((delivered / ordered) * 100)) : 0;

  return (
    <>
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          {delivered.toLocaleString()} / {ordered.toLocaleString()} {unit}
        </Text>
        <Text size="xs" fw={700}>
          {percent}%
        </Text>
      </Group>
      <Progress value={percent} size="sm" color={percent === 100 ? 'teal' : percent > 0 ? 'orange' : 'gray'} />
    </>
  );
}
