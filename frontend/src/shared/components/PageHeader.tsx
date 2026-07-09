import { Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
  titleClassName?: string;
};

export function PageHeader({
  actions,
  actionsClassName,
  className,
  icon,
  subtitle,
  title,
  titleClassName,
}: PageHeaderProps) {
  const classes = ['dl-page-header', className].filter(Boolean).join(' ');
  const titleClasses = ['dl-page-title-block', titleClassName].filter(Boolean).join(' ');
  const actionClasses = ['dl-page-actions', actionsClassName].filter(Boolean).join(' ');

  return (
    <Group justify="space-between" align="flex-start" gap="md" className={classes}>
      <div className="dl-page-heading">
        {icon ? <div className="dl-page-icon" aria-hidden="true">{icon}</div> : null}
        <div className={titleClasses}>
          <Title order={1}>{title}</Title>
          {subtitle ? (
            <Text c="dimmed" mt={4}>
              {subtitle}
            </Text>
          ) : null}
        </div>
      </div>
      {actions ? (
        <Group gap="xs" className={actionClasses}>
          {actions}
        </Group>
      ) : null}
    </Group>
  );
}
