import { Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { CopyValue } from './CopyValue';

type FieldPairProps = {
  className?: string;
  copyable?: boolean;
  label: ReactNode;
  value: ReactNode;
};

export function FieldPair({ className, copyable = false, label, value }: FieldPairProps) {
  const classes = ['kbfe-field-pair', className].filter(Boolean).join(' ');
  const title = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  const content = copyable && title ? <CopyValue value={title}>{value}</CopyValue> : value;

  return (
    <div className={classes}>
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={700} lineClamp={1} title={title} component="div">
        {content}
      </Text>
    </div>
  );
}
