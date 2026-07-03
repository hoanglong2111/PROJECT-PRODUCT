import { ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { MouseEvent } from 'react';

import { useI18n } from '@shared/i18n';

type CopyIconButtonVariant = 'action' | 'inline';

export function CopyIconButton({
  className,
  size = 14,
  value,
  variant = 'inline',
}: {
  className?: string;
  size?: number;
  value: string;
  variant?: CopyIconButtonVariant;
}) {
  const { t } = useI18n();
  const copyLabel = t('common.copy');
  const copiedLabel = t('common.copied');

  const handleClick = (event: MouseEvent<HTMLElement>, copy: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    copy();
  };

  return (
    <CopyButton timeout={1500} value={value}>
      {({ copied, copy }) => {
        const label = copied ? copiedLabel : copyLabel;
        const icon = copied ? (
          <IconCheck size={size} stroke={1.8} />
        ) : (
          <IconCopy size={size} stroke={1.8} />
        );

        return (
          <Tooltip
            label={label}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            {variant === 'action' ? (
              <ActionIcon
                aria-label={label}
                className={className}
                color={copied ? 'teal' : 'gray'}
                size={size + 12}
                variant="subtle"
                onClick={(event) => handleClick(event, copy)}
              >
                {icon}
              </ActionIcon>
            ) : (
              <button
                aria-label={label}
                className={['copy-icon-inline', className].filter(Boolean).join(' ')}
                type="button"
                onClick={(event) => handleClick(event, copy)}
              >
                {icon}
              </button>
            )}
          </Tooltip>
        );
      }}
    </CopyButton>
  );
}
