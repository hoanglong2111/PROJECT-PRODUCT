import { Group, Stack, Text } from '@mantine/core';

import { FieldHint } from '@shared/components/FieldHint';

export function DateStack({
  primaryHint,
  primaryLabel,
  primaryValue,
  secondaryHint,
  secondaryLabel,
  secondaryValue,
}: {
  primaryHint?: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryHint?: string;
  secondaryLabel: string;
  secondaryValue: string;
}) {
  return (
    <Stack gap={2}>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed" fw={700} w={28}>
          {primaryLabel}
        </Text>
        {primaryHint ? <FieldHint label={primaryHint} size={12} /> : null}
        <Text size="sm" fw={600} className="tabular-nums">
          {primaryValue || '-'}
        </Text>
      </Group>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed" fw={700} w={28}>
          {secondaryLabel}
        </Text>
        {secondaryHint ? <FieldHint label={secondaryHint} size={12} /> : null}
        <Text size="xs" c="dimmed" className="tabular-nums">
          {secondaryValue || '-'}
        </Text>
      </Group>
    </Stack>
  );
}
