import { Group, Loader, Paper, Stack, Tabs, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { useI18n } from '../i18n';

export function FilterToolbar<T extends string>({
  activeTab,
  children,
  isFetching,
  onTabChange,
  shown,
  tabs,
}: {
  activeTab: T;
  children: ReactNode;
  isFetching?: boolean;
  onTabChange: (tab: T) => void;
  shown: number;
  tabs: Array<{ label: string; value: T; count?: number }>;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Tabs value={activeTab} onChange={(value) => onTabChange((value ?? tabs[0].value) as T)} variant="pills">
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
                {tab.count === undefined ? '' : ` (${tab.count})`}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        <Group justify="space-between" align="end">
          {children}
          <Group gap="xs">
            {isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: shown })}
            </Text>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
