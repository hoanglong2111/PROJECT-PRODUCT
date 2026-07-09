import { Button, Group, Paper, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

/** Back-link banner shown when a list/detail screen is deep-linked from another entity (e.g. `?po=...`). */
export function FlowContextBanner({
  linkLabel,
  linkTo,
  message,
}: {
  /** Rendered as a light "open" button when both `linkTo` and `linkLabel` are set. */
  linkLabel?: string;
  linkTo?: string;
  message: string;
}) {
  return (
    <Paper withBorder p="md" className="flow-context">
      <Group justify="space-between">
        <Text size="sm">{message}</Text>
        {linkTo && linkLabel ? (
          <Button component={Link} to={linkTo} size="xs" variant="light">
            {linkLabel}
          </Button>
        ) : null}
      </Group>
    </Paper>
  );
}
