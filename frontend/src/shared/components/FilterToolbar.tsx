import { Group, Loader, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { FilterSegment } from '@shared/components/FilterSegment';
import { useI18n } from '@shared/i18n';

export function FilterToolbar<T extends string>({
  activeTab,
  children,
  className,
  headerControl,
  headerActions,
  isFetching,
  onTabChange,
  shown,
  tabs,
}: {
  activeTab: T;
  children: ReactNode;
  className?: string;
  headerControl?: ReactNode;
  headerActions?: ReactNode;
  isFetching?: boolean;
  onTabChange: (tab: T) => void;
  shown: number;
  tabs: Array<{ label: string; value: T; count?: number }>;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="md" className={['dl-filter-panel', className].filter(Boolean).join(' ')}>
      <Stack gap="sm">
        <div className="dl-filter-head">
          <div className="dl-filter-head__control">
            {headerControl ?? (
              <FilterSegment
                ariaLabel={t('common.status')}
                fill
                value={activeTab}
                onChange={(value) => onTabChange(value as T)}
                options={tabs.map((tab) => ({ value: tab.value, label: tab.label, count: tab.count }))}
              />
            )}
          </div>
          <div className="dl-filter-result">
            {headerActions}
            {isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: shown })}
            </Text>
          </div>
        </div>
        <Group align="flex-end" gap="sm" wrap="wrap" style={{ width: '100%', minWidth: 0 }}>
          {children}
        </Group>
      </Stack>
    </Paper>
  );
}
