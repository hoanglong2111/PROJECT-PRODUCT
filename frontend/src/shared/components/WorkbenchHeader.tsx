import { Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { BackActionButton } from './BackActionButton';

type WorkbenchHeaderProps = {
  backLabel?: ReactNode;
  className?: string;
  onBack: () => void;
};

export function WorkbenchHeader({
  backLabel,
  className,
  onBack,
}: WorkbenchHeaderProps) {
  const classes = ['dl-page-header', className].filter(Boolean).join(' ');

  return (
    <Group justify="space-between" align="center" gap="md" className={classes}>
      <Group gap="xs" align="center" wrap="wrap">
        <BackActionButton onClick={onBack} label={backLabel} />
      </Group>
    </Group>
  );
}
