import { Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type DashboardCardTone = 'blue' | 'orange' | 'red' | 'teal' | 'yellow';

export function DashboardCardHeader({
  aside,
  description,
  icon,
  title,
  tone = 'blue',
}: {
  aside?: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
  tone?: DashboardCardTone;
}) {
  return (
    <header className={`dashboard-section-header dashboard-section-header-${tone}`}>
      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
        <Group align="flex-start" gap="sm" wrap="nowrap" className="dashboard-section-heading">
          <span className="dashboard-section-header-icon" aria-hidden="true">
            {icon}
          </span>
          <div className="dashboard-section-header-copy">
            <Title order={3} className="dashboard-section-title">
              {title}
            </Title>
            {description ? (
              <Text size="sm" c="dimmed" className="dashboard-section-description">
                {description}
              </Text>
            ) : null}
          </div>
        </Group>
        {aside ? <div className="dashboard-section-header-aside">{aside}</div> : null}
      </Group>
    </header>
  );
}
