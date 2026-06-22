import { Group, Loader, Paper, Stack, Tabs, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { useI18n } from '@shared/i18n';

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
        <Group justify="space-between" align="center" gap="sm" wrap="wrap">
          <Tabs
            value={activeTab}
            onChange={(value) => onTabChange((value ?? tabs[0].value) as T)}
            variant="pills"
            style={{ flex: '1 1 28rem', minWidth: 0 }}
          >
            <Tabs.List>
              {tabs.map((tab) => (
                <Tabs.Tab key={tab.value} value={tab.value}>
                  {tab.label}
                  {tab.count === undefined ? '' : ` (${tab.count})`}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
          <Group gap="xs" wrap="nowrap" style={{ flex: '0 0 auto' }}>
            {isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: shown })}
            </Text>
          </Group>
        </Group>
        <Group align="flex-end" gap="sm" wrap="wrap" style={{ width: '100%', minWidth: 0 }}>
          {children}
        </Group>
      </Stack>
    </Paper>
  );
}
