import { Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  title: string;
}) {
  return (
    <Paper withBorder p="sm" className="purchase-order-form-section">
      <Stack gap="sm">
        <Stack gap={1} className="purchase-order-form-section-title">
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
