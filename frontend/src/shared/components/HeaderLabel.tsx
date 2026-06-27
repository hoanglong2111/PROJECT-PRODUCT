import { Group, type GroupProps } from '@mantine/core';

import { FieldHint } from './FieldHint';

export function HeaderLabel({
  label,
  hint,
  justify,
}: {
  label: string;
  hint?: string;
  justify?: GroupProps['justify'];
}) {
  return hint ? (
    <Group gap={4} wrap="nowrap" component="span" justify={justify}>
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  ) : (
    <>{label}</>
  );
}
