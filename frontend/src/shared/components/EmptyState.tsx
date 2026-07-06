import { Button, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: { label: string; onClick: () => void };
  description: string;
  title: string;
}) {
  return (
    <Stack component="section" aria-label={title} align="center" gap="xs" py="xl" className="empty-state">
      <ThemeIcon size={48} radius="md" variant="light" className="kbfe-empty-icon">
        <IconInbox size={28} />
      </ThemeIcon>
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed" ta="center">
        {description}
      </Text>
      {action ? (
        <Button size="xs" variant="light" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </Stack>
  );
}
