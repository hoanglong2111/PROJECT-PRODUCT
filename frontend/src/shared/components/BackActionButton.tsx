import { Button, type ButtonProps } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useI18n } from '@shared/i18n';

type BackActionButtonProps = Omit<ButtonProps, 'children' | 'leftSection'> & {
  iconSize?: number;
  label?: ReactNode;
  onClick?: () => void;
};

export function BackActionButton({ className, iconSize = 16, label, size = 'sm', variant = 'subtle', ...props }: BackActionButtonProps) {
  const { t } = useI18n();
  const classes = ['kbfe-back-action', className].filter(Boolean).join(' ');

  return (
    <Button className={classes} leftSection={<IconArrowLeft size={iconSize} />} size={size} variant={variant} {...props}>
      <span className="kbfe-back-action-label">{label ?? t('common.backToList')}</span>
    </Button>
  );
}
