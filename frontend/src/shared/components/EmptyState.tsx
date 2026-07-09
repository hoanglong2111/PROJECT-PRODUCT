import { Button, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

export function EmptyState({
  action,
  description,
  standalone = false,
  title,
}: {
  action?: { label: string; onClick: () => void };
  description: string;
  /** Render as a self-contained soft surface. Leave false when nested inside a
   *  card/panel to avoid a card-in-card (no border/background applied). */
  standalone?: boolean;
  title: string;
}) {
  const classes = [
    'empty-state',
    standalone ? 'empty-state--standalone kbfe-surface-wash kbfe-surface-wash--soft' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Stack
      component="section"
      aria-label={title}
      align="center"
      gap="xs"
      py="lg"
      className={classes}
      data-surface-tone="neutral"
    >
      <ThemeIcon size={40} radius="md" variant="light" className="kbfe-empty-icon">
        <IconInbox size={22} />
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
