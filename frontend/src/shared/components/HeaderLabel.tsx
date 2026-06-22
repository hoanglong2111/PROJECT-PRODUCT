import { Group } from '@mantine/core';

import { FieldHint } from './FieldHint';

export function HeaderLabel({ label, hint }: { label: string; hint?: string }) {
  return hint ? (
    <Group gap={4} wrap="nowrap" component="span">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  ) : (
    <>{label}</>
  );
}
