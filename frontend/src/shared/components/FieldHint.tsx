import { Tooltip, type FloatingPosition } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function FieldHint({
  label,
  size = 14,
  position = 'top',
}: {
  label: string;
  size?: number;
  position?: FloatingPosition;
}) {
  return (
    <Tooltip
      label={label}
      position={position}
      multiline
      w={260}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
    >
      <IconInfoCircle
        size={size}
        stroke={1.8}
        tabIndex={0}
        role="img"
        aria-label={label}
        style={{ opacity: 0.55, cursor: 'help', flexShrink: 0, verticalAlign: 'middle' }}
      />
    </Tooltip>
  );
}
