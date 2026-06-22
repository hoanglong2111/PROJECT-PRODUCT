import { Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text size="sm">{value || '-'}</Text>
      ) : (
        value
      )}
    </Stack>
  );
}
