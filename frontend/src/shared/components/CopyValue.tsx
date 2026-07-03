import { Group } from '@mantine/core';
import type { ReactNode } from 'react';

import { CopyIconButton } from './CopyIconButton';

export function CopyValue({
  children,
  hoverReveal = false,
  value,
}: {
  children?: ReactNode;
  hoverReveal?: boolean;
  value: string;
}) {
  const copyableValue = value.trim();

  return (
    <Group gap={4} wrap="nowrap" component="span" align="center">
      {children ?? value}
      {copyableValue && copyableValue !== '-' ? (
        <CopyIconButton
          value={copyableValue}
          className={hoverReveal ? 'copy-on-hover' : undefined}
        />
      ) : null}
    </Group>
  );
}
