import { Group, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

// Shared card shell for a single document (Shipment & Delivery Order tabs).
// Standardises the header (title + status/badge slot) and padding so both tabs
// render documents with the same look.
export function DocumentCard({
  badge,
  children,
  className,
  title,
}: {
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
  title: ReactNode;
}) {
  return (
    <Paper withBorder p="md" className={className}>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
          <Text fw={700} size="sm">
            {title}
          </Text>
          {badge}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}
